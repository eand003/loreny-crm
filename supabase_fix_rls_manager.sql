-- ============================================================
-- CORREÇÃO DE RLS — CRM Loreny Imóveis v3
-- EVITA RECURSÃO INFINITA (INFINITE RECURSION) EM RE_PROFILES
-- Execute este script no Painel Supabase:
--   Dashboard > SQL Editor > New Query > Cole e rode
-- ============================================================

-- ─────────────────────────────────────────────────
-- 0. FUNÇÃO AUXILIAR COM SECURITY DEFINER
-- Esta função contorna a recursão do RLS ao consultar a role.
-- ─────────────────────────────────────────────────
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.re_profiles where id = auth.uid();
$$;


-- ─────────────────────────────────────────────────
-- TABELA: re_profiles
-- ─────────────────────────────────────────────────

-- Remover políticas antigas de perfis
drop policy if exists "Corretores podem ver seu próprio perfil" on public.re_profiles;
drop policy if exists "Corretores podem atualizar seu próprio perfil" on public.re_profiles;
drop policy if exists "Gestores podem ver todos os perfis" on public.re_profiles;

-- Criar política de select: corretor vê o seu; manager/admin veem todos
create policy "Acesso de leitura para perfis por papel"
    on public.re_profiles for select
    using (
        auth.uid() = id
        OR
        public.get_user_role() in ('manager', 'admin')
    );

-- Criar política de update: corretor atualiza o seu próprio perfil
create policy "Corretores podem atualizar seu próprio perfil"
    on public.re_profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);


-- ─────────────────────────────────────────────────
-- TABELA: re_leads
-- ─────────────────────────────────────────────────

-- Remover política antiga se existir
drop policy if exists "Corretores podem gerenciar seus próprios leads" on public.re_leads;
drop policy if exists "Acesso a leads por papel do usuário" on public.re_leads;

-- Nova política: corretor vê e edita só os seus; manager/admin gerenciam todos
create policy "Acesso a leads por papel do usuário"
    on public.re_leads for all
    using (
        auth.uid() = owner_id
        OR
        public.get_user_role() in ('manager', 'admin')
    )
    with check (
        auth.uid() = owner_id
        OR
        public.get_user_role() in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- TABELA: re_visits
-- ─────────────────────────────────────────────────

-- Remover política antiga se existir
drop policy if exists "Corretores podem gerenciar suas próximas visitas" on public.re_visits;
drop policy if exists "Corretores podem gerenciar suas próprias visitas" on public.re_visits;
drop policy if exists "Acesso a visitas por papel do usuário" on public.re_visits;

-- Nova política: corretor vê e edita só as suas; manager/admin gerenciam todas
create policy "Acesso a visitas por papel do usuário"
    on public.re_visits for all
    using (
        auth.uid() = owner_id
        OR
        public.get_user_role() in ('manager', 'admin')
    )
    with check (
        auth.uid() = owner_id
        OR
        public.get_user_role() in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- TABELA: re_whatsapp_templates
-- ─────────────────────────────────────────────────

-- Remover política antiga se existir
drop policy if exists "Corretores podem gerenciar seus próprios templates" on public.re_whatsapp_templates;
drop policy if exists "Gestores podem ler todos os templates" on public.re_whatsapp_templates;

-- Corretores gerenciam seus próprios templates
create policy "Corretores podem gerenciar seus próprios templates"
    on public.re_whatsapp_templates for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- Gestores (manager e admin) podem ver/ler todos os templates de WhatsApp
create policy "Gestores podem ler todos os templates"
    on public.re_whatsapp_templates for select
    using (
        public.get_user_role() in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- VERIFICAÇÃO: listar políticas ativas
-- ─────────────────────────────────────────────────
select
    tablename,
    policyname,
    cmd,
    qual
from pg_policies
where tablename in ('re_leads', 're_visits', 're_whatsapp_templates', 're_profiles')
order by tablename, policyname;
