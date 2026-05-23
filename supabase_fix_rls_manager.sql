-- ============================================================
-- CORREÇÃO DE RLS — CRM Loreny Imóveis v3
-- Execute este script no Painel Supabase:
--   Dashboard > SQL Editor > New Query > Cole e rode
--
-- O QUE FAZ:
--   Remove as políticas restritivas antigas e recria políticas
--   que permitem que manager e admin vejam todos os dados,
--   enquanto broker continua vendo apenas os seus próprios.
-- ============================================================


-- ─────────────────────────────────────────────────
-- TABELA: re_leads
-- ─────────────────────────────────────────────────

-- Remover política antiga (só permitia owner)
drop policy if exists "Corretores podem gerenciar seus próprios leads" on public.re_leads;

-- Nova política: corretor vê só os seus; manager/admin veem todos
create policy "Acesso a leads por papel do usuário"
    on public.re_leads for all
    using (
        auth.uid() = owner_id
        OR
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
    )
    with check (
        auth.uid() = owner_id
        OR
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- TABELA: re_visits
-- ─────────────────────────────────────────────────

-- Remover política antiga
drop policy if exists "Corretores podem gerenciar suas próprias visitas" on public.re_visits;

-- Nova política: corretor vê só as suas; manager/admin veem todas
create policy "Acesso a visitas por papel do usuário"
    on public.re_visits for all
    using (
        auth.uid() = owner_id
        OR
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
    )
    with check (
        auth.uid() = owner_id
        OR
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- TABELA: re_profiles
-- ─────────────────────────────────────────────────

-- Gerentes e admins precisam ler os perfis de todos os corretores
-- para exibir o nome do corretor responsável em cada lead.
drop policy if exists "Gestores podem ver todos os perfis" on public.re_profiles;

create policy "Gestores podem ver todos os perfis"
    on public.re_profiles for select
    using (
        auth.uid() = id
        OR
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
    );


-- ─────────────────────────────────────────────────
-- TABELA: re_whatsapp_templates
-- ─────────────────────────────────────────────────

-- (mantém a política existente de escrita por owner)
-- Adiciona uma política de leitura para managers/admin verem todos os templates
drop policy if exists "Gestores podem ler todos os templates" on public.re_whatsapp_templates;

create policy "Gestores podem ler todos os templates"
    on public.re_whatsapp_templates for select
    using (
        (select role from public.re_profiles where id = auth.uid()) in ('manager', 'admin')
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
