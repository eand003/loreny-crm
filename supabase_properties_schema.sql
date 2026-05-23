-- ========================================================
-- SCHEMA SQL PARA MÓDULO "MEUS IMÓVEIS" (CARTEIRA DIGITAL)
-- Banco de Dados: Supabase PostgreSQL
-- ========================================================

-- 1. TABELA: re_properties
-- Tabela para guardar os imóveis avulsos e empreendimentos/lançamentos cadastrados pelos corretores
create table if not exists public.re_properties (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.re_profiles(id) on delete cascade not null,
    code text not null,
    title text not null,
    property_type text default 'Apartamento',
    region text not null,
    price numeric(15,2), -- Nulo se for Empreendimento (is_project = true) com várias tipologias
    commission_rate numeric(5,2) default 5.00,
    owner_name text, -- Nome do proprietário ou construtora (privado do corretor)
    owner_phone text, -- Telefone do proprietário ou construtora (privado do corretor)
    photos_url text, -- Link do Google Drive / Dropbox com material
    is_project boolean default false not null, -- Define se é Empreendimento/Lançamento vertical com múltiplas plantas
    typologies jsonb default '[]'::jsonb not null, -- Array de metragens e plantas para lançamentos [{name, size, price, status}]
    notes text, -- Observações gerais adicionais
    is_deleted boolean default false not null, -- Soft-delete para compatibilidade e histórico
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS) em re_properties
alter table public.re_properties enable row level security;

-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- Corretores podem ver e gerenciar apenas suas próprias captações.
-- Gestores e administradores podem ler e gerenciar todos os imóveis cadastrados para supervisão ou parcerias.
create policy "Corretores podem gerenciar seus próprios imóveis"
    on public.re_properties for all
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

-- 3. PROCEDIMENTOS AUTOMÁTICOS (TRIGGERS)
-- Trigger para atualizar o campo updated_at automaticamente ao editar qualquer imóvel
create or replace trigger update_re_properties_modtime 
    before update on public.re_properties 
    for each row 
    execute procedure public.update_modified_column();

-- ========================================================
-- INSTRUÇÕES DE IMPLANTAÇÃO:
-- 1. Copie todo o conteúdo deste arquivo.
-- 2. Acesse o Painel do Supabase -> SQL Editor -> Nova Consulta (New Query).
-- 3. Cole o script e clique em "Run" (Executar).
-- 4. O módulo "Meus Imóveis (Beta)" estará ativado em nuvem com segurança RLS.
-- ========================================================
