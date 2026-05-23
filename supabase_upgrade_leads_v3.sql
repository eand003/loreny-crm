-- Script de Migração Corretivo — CRM Loreny Imóveis v3
-- Atualiza a tabela re_leads para suportar Origem, Tipo e Temperatura com total segurança

alter table public.re_leads 
    add column if not exists lead_source text default 'Manual',
    add column if not exists lead_type text default 'Compra',
    add column if not exists temperature text default 'warm';

-- Garantir que todos os leads existentes nulos recebam os fallbacks de compatibilidade
update public.re_leads set lead_source = 'Manual' where lead_source is null;
update public.re_leads set lead_type = 'Compra' where lead_type is null;
update public.re_leads set temperature = 'warm' where temperature is null;
