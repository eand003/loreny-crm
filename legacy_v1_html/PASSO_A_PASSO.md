# Passo a passo — Vincular o CRM ao Supabase

## 1. Subir arquivos no GitHub

Extraia o ZIP e copie todos os arquivos para a pasta do seu projeto:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `icon.svg`
- `supabase_schema.sql`

Depois abra o GitHub Desktop, faça commit e push.

A Vercel deve atualizar automaticamente.

---

## 2. Rodar o SQL no Supabase

No Supabase:

1. Abra o projeto.
2. Vá em **SQL Editor**.
3. Clique em **New query**.
4. Cole todo o conteúdo do arquivo `supabase_schema.sql`.
5. Clique em **Run**.

Esse SQL cria:

- tabela `leads`
- tabela `wa_templates`
- RLS seguro por usuário
- índices
- realtime
- triggers de atualização

Se as linhas de realtime derem erro dizendo que a tabela já está na publicação, pode ignorar.

---

## 3. Ativar login por e-mail

No Supabase:

1. Vá em **Authentication**.
2. Vá em **Providers**.
3. Ative **Email**.

Para teste rápido, você pode desativar temporariamente a confirmação obrigatória de e-mail.

---

## 4. Pegar URL e Anon Key

No Supabase:

1. Vá em **Settings**.
2. Clique em **API**.
3. Copie:
   - Project URL
   - Anon public key

---

## 5. Conectar no CRM

No CRM publicado pela Vercel:

1. Clique em **☁️ Nuvem**.
2. Cole a Project URL.
3. Cole a Anon Key.
4. Clique em **Conectar**.
5. Clique em **Login**.
6. Crie o acesso da Loreny ou faça login.

---

## 6. Testar

Teste nesta ordem:

1. Criar lead.
2. Editar lead.
3. Excluir lead.
4. Abrir WhatsApp direto.
5. Abrir mensagem pré-definida.
6. Criar modelo de mensagem.
7. Mover lead no Kanban.
8. Ver histórico.
9. Abrir em outro celular/computador.

---

## 7. Cache no celular

Se no celular continuar aparecendo versão antiga:

No iPhone:

`Ajustes > Safari > Avançado > Dados dos Sites`

Procure o domínio da Vercel e apague os dados.
