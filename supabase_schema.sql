-- ==========================================
-- SCHEMA SQL PARA CRM LORENY IMÓVEIS V3
-- Banco de Dados: Supabase PostgreSQL
-- ==========================================

-- Habilitar a extensão uuid-ossp se ainda não habilitada
create extension if not exists "uuid-ossp";

-- 1. TABELA: re_profiles
-- Cadastro estendido dos corretores conectado com auth.users
create table if not exists public.re_profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text not null,
    email text not null,
    phone text,
    company text,
    commission_rate numeric(5,2) default 5.00,
    role text default 'broker',
    status text default 'active',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS) em re_profiles
alter table public.re_profiles enable row level security;

-- Funções Auxiliares
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.re_profiles where id = auth.uid();
$$;

-- Políticas de Segurança (RLS) para re_profiles
create policy "Acesso de leitura para perfis por papel"
    on public.re_profiles for select
    using (
        auth.uid() = id
        OR
        public.get_user_role() in ('manager', 'admin')
    );

create policy "Corretores podem atualizar seu próprio perfil"
    on public.re_profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);


-- 2. TABELA: re_leads
-- Carteira de clientes e negócios imobiliários por corretor
create table if not exists public.re_leads (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.re_profiles(id) on delete cascade not null,
    name text not null,
    phone text not null,
    email text,
    property_type text default 'Apartamento',
    region text not null,
    budget numeric(15,2),
    status text default 'new',
    notes text,
    next_action text,
    next_action_date date,
    is_deleted boolean default false not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Habilitar RLS em re_leads
alter table public.re_leads enable row level security;

-- Políticas de RLS para re_leads
-- Corretores: veem e gerenciam apenas seus próprios leads
create policy "Corretores podem gerenciar seus próprios leads"
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


-- 3. TABELA: re_visits
-- Agenda de visitas aos imóveis
create table if not exists public.re_visits (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.re_profiles(id) on delete cascade not null,
    lead_id uuid references public.re_leads(id) on delete cascade not null,
    property_details text not null,
    visit_datetime timestamptz not null,
    notes text,
    status text default 'Agendada' not null,
    is_deleted boolean default false not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Habilitar RLS em re_visits
alter table public.re_visits enable row level security;

-- Políticas de RLS para re_visits
-- Corretores: veem e gerenciam apenas suas próprias visitas
create policy "Corretores podem gerenciar suas próprias visitas"
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


-- 4. TABELA: re_whatsapp_templates
-- Modelos de mensagens rápidas do WhatsApp por corretor
create table if not exists public.re_whatsapp_templates (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.re_profiles(id) on delete cascade not null,
    title text not null,
    description text,
    text_content text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Habilitar RLS em re_whatsapp_templates
alter table public.re_whatsapp_templates enable row level security;

-- Políticas de RLS para re_whatsapp_templates
-- Corretores: gerenciam apenas seus templates; managers e admins podem ler todos
create policy "Corretores podem gerenciar seus próprios templates"
    on public.re_whatsapp_templates for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

create policy "Gestores podem ler todos os templates"
    on public.re_whatsapp_templates for select
    using (
        public.get_user_role() in ('manager', 'admin')
    );


-- ==========================================
-- PROCEDIMENTOS AUTOMÁTICOS (TRIGGERS)
-- ==========================================

-- Trigger Function para criar o Perfil do Corretor e auto-inserir os Templates Padrão do WhatsApp
create or replace function public.handle_new_user()
returns trigger as $$
begin
    -- 1. Inserir perfil na tabela re_profiles
    insert into public.re_profiles (id, full_name, email, phone, company, commission_rate, role, status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'company',
        coalesce((new.raw_user_meta_data->>'commission_rate')::numeric, 5.00),
        coalesce(new.raw_user_meta_data->>'role', 'broker'),
        'active'
    );

    -- 2. Inserir Templates Padrão do WhatsApp para o corretor recém-criado
    insert into public.re_whatsapp_templates (owner_id, title, description, text_content)
    values
    (
        new.id,
        'Apresentação e Primeiro Contato 🏠',
        'Mensagem de boas-vindas logo após o lead demonstrar interesse.',
        'Olá, {nome}! Tudo bem? Sou o/a {corretor}, especialista de imóveis da Loreny Imóveis. 🙋‍♀️' || chr(10) || chr(10) || 'Vi que você está buscando um(a) {imovel} na região de {regiao} na faixa de orçamento de {valor}. Tenho algumas opções excelentes selecionadas para o seu perfil. Podermos conversar por ligação rápida de 3 minutos hoje às 17h?'
    ),
    (
        new.id,
        'Confirmação de Visitação 🗓️',
        'Para enviar um dia antes ou horas antes da visita agendada.',
        'Olá, {nome}! Tudo certo para nossa visita de amanhã? 🚀' || chr(10) || chr(10) || 'Ficou agendado para o dia {data_visita} às {hora_visita} no imóvel {imovel}.' || chr(10) || chr(10) || 'Endereço ou Ponto de encontro: {regiao}.' || chr(10) || chr(10) || 'Caso tenha algum imprevisto, me avise por aqui! Abraços!'
    ),
    (
        new.id,
        'Acompanhamento de Proposta 📝',
        'Follow-up de negociação para destravar propostas pendentes.',
        'Olá, {nome}! Tudo bem?' || chr(10) || chr(10) || 'Passando para saber se teve a oportunidade de avaliar a proposta de {valor} enviada para o imóvel em {regiao}. O proprietário demonstrou abertura, mas precisamos formalizar os termos. Ficamos no aguardo de sua resposta para fecharmos esse excelente negócio! ✨'
    );

    return new;
end;
$$ language plpgsql security definer;

-- Associar a trigger ao registro de novos usuários no Auth do Supabase
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Trigger Function para atualizar o campo updated_at automaticamente
create or replace function public.update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Habilitar trigger de update para todas as tabelas
create or replace trigger update_re_profiles_modtime before update on public.re_profiles for each row execute procedure public.update_modified_column();
create or replace trigger update_re_leads_modtime before update on public.re_leads for each row execute procedure public.update_modified_column();
create or replace trigger update_re_visits_modtime before update on public.re_visits for each row execute procedure public.update_modified_column();
create or replace trigger update_re_whatsapp_templates_modtime before update on public.re_whatsapp_templates for each row execute procedure public.update_modified_column();
