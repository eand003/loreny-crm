-- ============================================================
-- CORREÇÃO DE PAPEL DE CADASTRO (ROLE) — CRM Loreny Imóveis v3
-- Execute este script no Painel Supabase:
--   Dashboard > SQL Editor > New Query > Cole e rode
--
-- O QUE FAZ:
--   1. Altera o valor padrão da coluna "role" na tabela re_profiles para 'broker' (Corretor).
--   2. Atualiza a função do gatilho (trigger) de novos usuários para garantir
--      que o papel seja gravado como 'broker' por padrão na tabela de perfis.
-- ============================================================

-- ─────────────────────────────────────────────────
-- 1. ALTERAR PADRÃO DA TABELA RE_PROFILES
-- Garante que se nenhuma role for enviada, o banco atribua 'broker'
-- ─────────────────────────────────────────────────
alter table public.re_profiles alter column role set default 'broker';


-- ─────────────────────────────────────────────────
-- 2. ATUALIZAR FUNÇÃO DO TRIGGER DE NOVOS USUÁRIOS
-- ─────────────────────────────────────────────────
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
        coalesce(new.raw_user_meta_data->>'role', 'broker'), -- Garante broker como fallback imediato
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


-- ─────────────────────────────────────────────────
-- COMO CORRIGIR AS CONTAS JÁ CRIADAS ANTERIORMENTE:
-- Se você criou uma conta nova que acabou ficando com a role 'admin'
-- por padrão, rode o comando abaixo substituindo pelo e-mail da conta:
--
-- UPDATE public.re_profiles 
-- SET role = 'broker' 
-- WHERE email = 'email_da_conta_nova@exemplo.com';
-- ─────────────────────────────────────────────────
