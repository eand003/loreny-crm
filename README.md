# CRM Loreny Imóveis — Novo do Zero

CRM moderno, mobile-first e prático para corretora de imóveis autônoma.

## Funcionalidades

- Login com Supabase Auth
- Leads online com Supabase/PostgreSQL
- Segurança por usuário com RLS
- Cadastro, edição e exclusão de leads
- Filtros por status, origem, tipo, retorno hoje e sem ação
- Dashboard de produtividade
- Kanban com arrastar e soltar
- Histórico de interações
- WhatsApp direto
- Modelos de mensagens com variáveis: `{nome}`, `{tipo}`, `{regiao}`, `{valor}`
- Exportar CSV
- Importar CSV
- PWA básico
- Layout mobile-first

## Como usar

1. Rode o SQL em `supabase_schema.sql` no Supabase.
2. Suba os arquivos no GitHub.
3. Aguarde a Vercel publicar.
4. No CRM, configure Supabase URL e Anon Key.
5. Crie login e comece a cadastrar leads.
