-- ============================================================
-- CRM LORENY IMÓVEIS — CONFIGURAÇÃO MULTI-TENANT SAAS
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Criar tabela de LEADS (caso não exista)
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    whatsapp TEXT,
    origem TEXT,
    tipo TEXT,
    regiao TEXT,
    valor TEXT,
    status TEXT,
    proxima_acao TEXT,
    data_retorno TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    historico JSONB DEFAULT '[]'::jsonb
);

-- 2. Criar tabela de WA_TEMPLATES (Modelos de WhatsApp, caso não exista)
CREATE TABLE IF NOT EXISTS public.wa_templates (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    text_content TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar o Row Level Security (RLS) nas duas tabelas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas para evitar erros de duplicidade caso já existam
DROP POLICY IF EXISTS "Corretores podem ver apenas seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Corretores podem criar seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Corretores podem atualizar seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Corretores podem excluir seus próprios leads" ON public.leads;

DROP POLICY IF EXISTS "Corretores podem ver apenas seus próprios templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Corretores podem criar seus próprios templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Corretores podem atualizar seus próprios templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Corretores podem excluir seus próprios templates" ON public.wa_templates;

-- 5. Criar políticas RLS para LEADS (garante isolamento total por Corretor)
CREATE POLICY "Corretores podem ver apenas seus próprios leads" 
ON public.leads 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Corretores podem criar seus próprios leads" 
ON public.leads 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Corretores podem atualizar seus próprios leads" 
ON public.leads 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Corretores podem excluir seus próprios leads" 
ON public.leads 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Criar políticas RLS para WA_TEMPLATES (garante isolamento total por Corretor)
CREATE POLICY "Corretores podem ver apenas seus próprios templates" 
ON public.wa_templates 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Corretores podem criar seus próprios templates" 
ON public.wa_templates 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Corretores podem atualizar seus próprios templates" 
ON public.wa_templates 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Corretores podem excluir seus próprios templates" 
ON public.wa_templates 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
