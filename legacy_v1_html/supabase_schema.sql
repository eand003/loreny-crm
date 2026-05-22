-- ============================================================
-- CRM Loreny Imóveis — Schema Supabase Seguro
-- Cole no Supabase > SQL Editor > Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  whatsapp text,
  origem text,
  tipo text,
  regiao text,
  valor text,
  status text default 'Novo lead',
  proxima_acao text,
  data_retorno date,
  observacoes text,
  historico jsonb default '[]'::jsonb,
  criado_em timestamptz not null default timezone('utc'::text, now()),
  atualizado_em timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.wa_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  text_content text not null,
  criado_em timestamptz not null default timezone('utc'::text, now()),
  atualizado_em timestamptz not null default timezone('utc'::text, now())
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_data_retorno_idx on public.leads(data_retorno);
create index if not exists leads_criado_em_idx on public.leads(criado_em desc);
create index if not exists wa_templates_user_id_idx on public.wa_templates(user_id);
create index if not exists wa_templates_criado_em_idx on public.wa_templates(criado_em asc);

alter table public.leads enable row level security;
alter table public.wa_templates enable row level security;

drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
drop policy if exists "leads_update_own" on public.leads;
drop policy if exists "leads_delete_own" on public.leads;
drop policy if exists "wa_templates_select_own" on public.wa_templates;
drop policy if exists "wa_templates_insert_own" on public.wa_templates;
drop policy if exists "wa_templates_update_own" on public.wa_templates;
drop policy if exists "wa_templates_delete_own" on public.wa_templates;

create policy "leads_select_own" on public.leads for select to authenticated using (auth.uid() = user_id);
create policy "leads_insert_own" on public.leads for insert to authenticated with check (auth.uid() = user_id);
create policy "leads_update_own" on public.leads for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leads_delete_own" on public.leads for delete to authenticated using (auth.uid() = user_id);

create policy "wa_templates_select_own" on public.wa_templates for select to authenticated using (auth.uid() = user_id);
create policy "wa_templates_insert_own" on public.wa_templates for insert to authenticated with check (auth.uid() = user_id);
create policy "wa_templates_update_own" on public.wa_templates for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wa_templates_delete_own" on public.wa_templates for delete to authenticated using (auth.uid() = user_id);

-- Realtime. Se der erro dizendo que a tabela já faz parte da publicação, ignore essa linha.
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.wa_templates;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.atualizado_em = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();

drop trigger if exists wa_templates_set_updated_at on public.wa_templates;
create trigger wa_templates_set_updated_at before update on public.wa_templates for each row execute function public.set_updated_at();
