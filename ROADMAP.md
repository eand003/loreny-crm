# 🚀 Roadmap — CRM Loreny Imóveis: De Uso Interno para SaaS Comercial

> Documento de referência técnica e estratégica para quando for evoluir o produto.
> Criado em: Maio/2026 — Atualizar conforme decisões forem tomadas.

---

## 📍 Situação Atual (v3 — Maio 2026)

O CRM está funcionando como produto **single-tenant** — um único banco de dados Supabase com isolamento de dados por `owner_id` e Row Level Security (RLS). Suporta 3 papéis de usuário: `broker`, `manager` e `admin`.

**Stack atual:**
- Frontend: React 19 + Vite + Lucide React
- Backend/DB: Supabase (PostgreSQL + Auth + RLS)
- Deploy: Vercel (automático via GitHub)
- Modo offline: Mock DB via LocalStorage

---

## 🎯 Fases de Evolução

### ✅ Fase 1 — Validação Comercial Manual *(zero mudança técnica)*

> **Quando usar:** Primeiros 1–15 clientes pagantes.

Não exige alteração no código. Você opera manualmente:

- [ ] Criar um **projeto Supabase separado por cliente** (gratuito até certo uso)
- [ ] Configurar as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) por cliente
- [ ] Executar o `supabase_schema.sql` no banco de cada cliente
- [ ] Cobrar via **PIX ou boleto manual** (Asaas, Pagar.me, ou à mão)
- [ ] Criar uma conta de `admin` para o cliente via painel Supabase → Authentication → Users
- [ ] Entregar o link do deploy na Vercel (ou subdomínio customizado)

**Vantagem:** Valida precificação e demanda sem investimento técnico.  
**Limite:** Não escala acima de ~15 clientes sem automação.

---

### 🔶 Fase 2 — Multi-Tenant com `tenant_id` *(mudança técnica moderada)*

> **Quando usar:** A partir de ~10 clientes pagantes, quando o processo manual virar gargalo.

#### 2.1 — Banco de Dados: nova tabela `tenants`

```sql
create table public.tenants (
    id          uuid default gen_random_uuid() primary key,
    name        text not null,                    -- "Corretor João" ou "Imobiliária ABC"
    plan        text default 'trial',             -- 'trial' | 'individual' | 'team' | 'enterprise'
    status      text default 'active',            -- 'active' | 'trial' | 'suspended' | 'cancelled'
    max_users   int  default 1,                   -- 1 para autônomo, N para equipe
    trial_ends_at timestamptz,
    created_at  timestamptz default now()
);
```

#### 2.2 — Adicionar `tenant_id` em todas as tabelas existentes

```sql
alter table public.re_profiles  add column tenant_id uuid references public.tenants(id);
alter table public.re_leads     add column tenant_id uuid references public.tenants(id);
alter table public.re_visits    add column tenant_id uuid references public.tenants(id);
alter table public.re_whatsapp_templates add column tenant_id uuid references public.tenants(id);
```

#### 2.3 — Reescrever as políticas RLS para isolar por `tenant_id`

```sql
-- Exemplo para re_leads:
drop policy "Acesso a leads por papel do usuário" on public.re_leads;

create policy "Isolamento por tenant"
    on public.re_leads for all
    using (
        tenant_id = (select tenant_id from re_profiles where id = auth.uid())
        AND (
            auth.uid() = owner_id
            OR (select role from re_profiles where id = auth.uid()) in ('manager', 'admin')
        )
    )
    with check (
        tenant_id = (select tenant_id from re_profiles where id = auth.uid())
    );
-- Repetir para re_visits e re_whatsapp_templates
```

#### 2.4 — Atualizar o Trigger de criação de usuário

O trigger `handle_new_user()` precisa:
- Verificar se o usuário foi convidado para um tenant existente (pelo `invite_token`)
- Ou criar um **novo tenant** automaticamente se for o primeiro cadastro

```sql
-- Lógica no trigger:
-- SE invite_token presente → associar ao tenant do convite
-- SE não → criar novo tenant e associar
```

#### 2.5 — Sistema de Convites (para imobiliárias com equipe)

Nova tabela:
```sql
create table public.invites (
    id          uuid default gen_random_uuid() primary key,
    tenant_id   uuid references public.tenants(id),
    email       text not null,
    role        text default 'broker',
    token       text unique not null,           -- UUID enviado por e-mail
    accepted_at timestamptz,
    expires_at  timestamptz default now() + interval '7 days',
    created_at  timestamptz default now()
);
```

**Fluxo:**
1. Admin da imobiliária digita o e-mail do corretor
2. Sistema cria um registro em `invites` e envia e-mail com link
3. Corretor clica no link → é redirecionado para o cadastro já vinculado ao `tenant_id`

---

### 🔷 Fase 3 — Billing e Planos Automáticos *(mudança técnica alta)*

> **Quando usar:** A partir de ~30 clientes, ou quando o controle manual de pagamentos consumir muito tempo.

#### 3.1 — Gateway de Pagamento

**Opção recomendada para Brasil:** [Asaas](https://asaas.com) ou [Pagar.me](https://pagar.me)
- Suporte a PIX, boleto e cartão
- API REST simples
- Webhook para notificar pagamento confirmado/cancelado

**Alternativa internacional:** [Stripe](https://stripe.com) (mais robusto, mas sem PIX nativo)

#### 3.2 — Webhook de Status

Quando o cliente paga ou cancela, o gateway dispara um webhook para uma **Edge Function do Supabase** que atualiza o `status` do tenant:

```
Pagamento confirmado → tenants.status = 'active'
Pagamento atrasado   → tenants.status = 'suspended' (bloqueia acesso)
Cancelamento         → tenants.status = 'cancelled'
```

#### 3.3 — Bloqueio de acesso por status do tenant

Adicionar verificação no front-end e nas políticas RLS:

```sql
-- RLS verifica status do tenant antes de permitir acesso
AND (select status from tenants where id = tenant_id) = 'active'
```

No `AuthGuard.jsx`, após o login verificar o status do tenant e exibir tela de "Conta suspensa" se necessário.

#### 3.4 — Limites por Plano

```sql
-- Verificar no insert de re_profiles se max_users foi atingido
create or replace function check_tenant_user_limit()
returns trigger as $$
declare
    current_users int;
    max_users     int;
begin
    select count(*) into current_users from re_profiles where tenant_id = new.tenant_id;
    select t.max_users into max_users from tenants t where t.id = new.tenant_id;
    if current_users >= max_users then
        raise exception 'Limite de usuários do plano atingido.';
    end if;
    return new;
end;
$$ language plpgsql;
```

---

### 🔴 Fase 4 — Painel Super Admin *(produto separado)*

> **Quando usar:** Quando você tiver clientes suficientes para precisar de visibilidade centralizada.

Criar um painel administrativo **separado** (novo projeto Vite ou Next.js) conectado ao mesmo banco com credenciais de `service_role` (acesso total, ignora RLS).

**Funcionalidades:**
- [ ] Lista de todos os tenants com status, plano e data de criação
- [ ] Número de usuários e leads por tenant
- [ ] Botão para suspender / reativar / deletar uma conta
- [ ] Gráfico de MRR (receita recorrente mensal)
- [ ] Log de eventos críticos (login, erros, etc.)

> ⚠️ **Nunca expor a `service_role` key no front-end público.** O painel admin deve rodar em backend (Supabase Edge Functions ou servidor Node.js próprio).

---

## 💰 Modelos de Precificação Sugeridos

| Plano | Público | Preço/mês | Limites |
|---|---|---|---|
| **Individual** | Corretor autônomo | R$ 49 – R$ 79 | 1 usuário, ilimitado leads |
| **Equipe** | Imobiliária pequena | R$ 149 – R$ 199 | até 5 usuários |
| **Profissional** | Imobiliária média | R$ 349 – R$ 499 | até 15 usuários + relatórios |
| **Enterprise** | Rede de imobiliárias | Sob consulta | Ilimitado + suporte dedicado |

> 💡 Oferecer **trial de 14 dias** sem cartão reduz a barreira de entrada para autônomos.

---

## 📧 E-mails Transacionais Necessários (Fase 2+)

Usar **Resend** (gratuito até 3.000 e-mails/mês) integrado ao Supabase:

| Trigger | E-mail enviado |
|---|---|
| Novo cadastro | Boas-vindas + link para acessar |
| Convite de equipe | Link de convite com prazo de 7 dias |
| Trial expirando | Aviso 3 dias antes + link para assinar |
| Pagamento confirmado | Recibo + confirmação de ativação |
| Pagamento falhou | Aviso + link para atualizar cartão |
| Conta suspensa | Notificação + instrução de pagamento |

---

## 🛠️ Decisões Técnicas Pendentes

> Responder estas perguntas antes de iniciar cada fase:

- [ ] **Fase 2:** Usar um único Supabase para todos os clientes (com `tenant_id`) ou um Supabase por cliente?
- [ ] **Fase 2:** Qual será o subdomínio por cliente? Ex: `joao.lorenycrm.com.br` ou `lorenycrm.com.br/joao`?
- [ ] **Fase 3:** Asaas, Pagar.me ou Stripe para pagamentos?
- [ ] **Fase 3:** Cobrar mensalmente ou anualmente (com desconto)?
- [ ] **Fase 4:** Painel admin separado ou uma rota protegida no mesmo app?

---

## 🔧 Correções Técnicas Pendentes (curto prazo)

Estas correções são independentes da comercialização e devem ser feitas em breve:

- [ ] **RLS para Gerentes/Admins:** Executar `supabase_fix_rls_manager.sql` no painel Supabase para que gerentes vejam os leads dos corretores da mesma conta.
- [ ] **Tela de Perfil do Usuário:** Permitir que o corretor edite seu nome e telefone dentro do app.
- [ ] **Recuperação de Senha:** Configurar o template de e-mail de reset no Supabase Auth → Email Templates.
- [ ] **Variáveis de ambiente na Vercel:** Garantir que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam configuradas em Production no painel da Vercel.

---

## 📁 Arquivos-chave do projeto

| Arquivo | Função |
|---|---|
| `supabase_schema.sql` | Schema completo do banco (usar para novos deploys) |
| `supabase_fix_rls_manager.sql` | Correção pontual das políticas RLS para gerentes |
| `src/config/supabase.js` | Conector Supabase + Mock DB offline |
| `src/components/AuthGuard.jsx` | Tela de login e cadastro com seleção de cargo |
| `public/divulgacao_crm.html` | Landing page de divulgação do CRM |
| `public/usabilidade_crm.html` | Guia de uso prático (sem marketing) |
| `public/manual_crm.html` | Manual técnico do usuário |

---

*Documento gerado em Maio/2026. Atualizar conforme o produto evolui.*
