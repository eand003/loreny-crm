-- ============================================================
-- CRM Loreny Imóveis v2 — Migração Supabase com Auth + RLS
-- ============================================================
-- COMO USAR:
-- 1) Antes de rodar, faça backup/export CSV dos leads.
-- 2) Crie/entre com o usuário da Loreny no CRM ou em Authentication > Users.
-- 3) Copie o UID do usuário no Supabase Auth.
-- 4) Substitua abaixo: COLE_AQUI_O_UID_DO_USUARIO_LORENY
-- 5) Rode no SQL Editor do Supabase.

-- 1. Garantir extensão para UUID quando necessário
create extension if not exists pgcrypto;

-- 2. Garantir colunas user_id nas tabelas existentes
alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.wa_templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 3. Migrar dados antigos que estavam sem dono para o usuário da Loreny
-- TROQUE o UID abaixo pelo ID real do usuário criado/logado no Supabase Auth.
update public.leads
set user_id = 'COLE_AQUI_O_UID_DO_USUARIO_LORENY'
where user_id is null;

update public.wa_templates
set user_id = 'COLE_AQUI_O_UID_DO_USUARIO_LORENY'
where user_id is null;

-- 4. Depois da migração, tornar user_id obrigatório
alter table public.leads
  alter column user_id set not null;

alter table public.wa_templates
  alter column user_id set not null;

-- 5. Remover políticas antigas inseguras, se existirem
DROP POLICY IF EXISTS "Acesso público com chave anon" ON public.leads;
DROP POLICY IF EXISTS "Acesso público com chave anon" ON public.wa_templates;
DROP POLICY IF EXISTS "leads_select_own" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
DROP POLICY IF EXISTS "leads_update_own" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
DROP POLICY IF EXISTS "wa_templates_select_own" ON public.wa_templates;
DROP POLICY IF EXISTS "wa_templates_insert_own" ON public.wa_templates;
DROP POLICY IF EXISTS "wa_templates_update_own" ON public.wa_templates;
DROP POLICY IF EXISTS "wa_templates_delete_own" ON public.wa_templates;

-- 6. Ativar RLS
alter table public.leads enable row level security;
alter table public.wa_templates enable row level security;

-- 7. Políticas seguras por usuário logado
create policy "leads_select_own"
on public.leads for select
to authenticated
using (auth.uid() = user_id);

create policy "leads_insert_own"
on public.leads for insert
to authenticated
with check (auth.uid() = user_id);

create policy "leads_update_own"
on public.leads for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "leads_delete_own"
on public.leads for delete
to authenticated
using (auth.uid() = user_id);

create policy "wa_templates_select_own"
on public.wa_templates for select
to authenticated
using (auth.uid() = user_id);

create policy "wa_templates_insert_own"
on public.wa_templates for insert
to authenticated
with check (auth.uid() = user_id);

create policy "wa_templates_update_own"
on public.wa_templates for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "wa_templates_delete_own"
on public.wa_templates for delete
to authenticated
using (auth.uid() = user_id);

-- 8. Índices para performance
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_user_status_idx on public.leads(user_id, status);
create index if not exists leads_user_data_retorno_idx on public.leads(user_id, data_retorno);
create index if not exists wa_templates_user_id_idx on public.wa_templates(user_id);

-- 9. Habilitar Realtime para a tabela leads, sem erro se já estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;
