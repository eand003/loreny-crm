# Checklist de Implementação — CRM Loreny Imóveis v3

Acompanhamento detalhado do desenvolvimento do novo CRM de alto padrão para Corretores de Imóveis.

## 📁 Etapa 1: Limpeza e Organização Física
- `[x]` Criar diretório `legacy_v1_html` e mover arquivos legados da v1 (evita conflitos de arquivos estáticos index.html, etc.).
- `[x]` Copiar e configurar `package.json` com suporte a React 19, Vite 8, Lucide React e Supabase Client.
- `[x]` Criar arquivo de configuração do Vite (`vite.config.js`).

## 🎨 Etapa 2: Base Estrutural e Design System
- `[x]` Criar o novo `index.html` estático com fontes premium (Outfit e Inter) e links de favicon.
- `[x]` Criar `src/index.css` importando o design system refinado do Spray-saas (glassmorphism, cores tailores em verde-esmeralda/indigo, utilitários de layout e responsividade).

## 🔌 Etapa 3: Configurações, Utilidades e Mock DB
- `[x]` Criar `src/config/supabase.js` contendo o conector oficial + o banco de dados LocalStorage Mock DB 100% fiel com hydration inicial de dados imobiliários (leads, visitas agendadas, e templates de mensagens).
- `[x]` Criar `src/utils/helpers.js` com formatadores monetários BRL (VGV e comissão), datas, e o compilador de templates de WhatsApp.

## 🧩 Etapa 4: Componentes Compartilhados e Estrutura Principal
- `[x]` Criar componente de modal genérico `src/components/UI/Modal.jsx`.
- `[x]` Desenvolver o `src/components/AuthGuard.jsx` personalizado com tema de corretagem imobiliária.
- `[x]` Desenvolver o `src/components/Layout.jsx` com barra lateral sofisticada e bottom-bar inteligente para celular.
- `[x]` Criar o ponto de entrada `src/main.jsx` e o roteador de tabs principal `src/App.jsx`.

## 💼 Etapa 5: Desenvolvimento das Telas de Negócios (Tabs)
- `[x]` Desenvolver o **Dashboard** (`src/components/Dashboard.jsx`) com VGV, comissões acumuladas, próximas visitas do dia e linha do tempo de interações.
- `[x]` Desenvolver a tela de **Leads & Pipeline** (`src/components/Leads.jsx`) com listagem responsiva em cards, campos imobiliários (tipo de imóvel, valor, região) e pop-up inteligente para envio de templates de WhatsApp.
- `[x]` Desenvolver a tela de **Visitas** (`src/components/Visits.jsx`) para agendar e acompanhar visitas a imóveis.
- `[x]` Desenvolver a tela de **Modelos WhatsApp** (`src/components/WhatsAppTemplates.jsx`) para criar e editar mensagens rápidas com tags.

## 💾 Etapa 6: Scripts de Banco e Metas do Banco de Dados
- `[x]` Criar o script final `supabase_schema.sql` na raiz do repositório para deploy no editor SQL do Supabase.
- `[x]` Executar `npm install` e testar a build em ambiente de desenvolvimento local.

## 🎨 Etapa 7: Revitalização Visual e Legibilidade Premium
- `[x]` Corrigir herança de cor de botões (`color: inherit`) no `index.css` e adicionar `!important` na sidebar de `Layout.jsx` (elimina as letras pretas no menu).
- `[x]` Transicionar para o Tema Light de Luxo (fundo `#f1f5f9`, texto e cabeçalhos em `#0b1a30`, cards in `#ffffff`).
- `[x]` Suavizar o peso das fontes de cabeçalho para `500` (Outfit/Inter).
- `[x]` Ajustar contraste e legibilidade das telas de Login e carregamento em `AuthGuard.jsx`.
- `[x]` Redesenhar o manual independente `manual_crm.html` para seguir o novo design system claro e contrastante.
- `[x]` Rodar build de validação com sucesso absoluto de compilação em `993ms`.

## 📊 Etapa 8: Transparência Financeira & Filtros Inteligentes
- `[x]` Criar o novo componente `Commissions.jsx` com explicação detalhada e separação de VGV e comissão ativa vs. confirmada.
- `[x]` Integrar a nova aba "Vendas & Comissões" no conector principal `App.jsx` e menu lateral `Layout.jsx`.
- `[x]` Adicionar o contador dinâmico de clientes em cada filtro de estágio de funil na listagem de `Leads.jsx`.
- `[x]` Validar a compilação final de produção em `767ms` livre de erros.
- `[x]` Implementar o backfill automático de templates de WhatsApp para qualquer usuário (corretor ou gestor) que inicie com 0 templates.
- `[x]` Corrigir mapeamento do cargo (role) no cadastro do banco simulado (`supabase.js`) e banco real (`supabase_schema.sql`).
- `[x]` Implementar seletor de ordenação interativo (por padrão, ordem decrescente de orçamento) para rastreamento imediato de maior receita por cliente e negócio na aba "Vendas & Comissões".

## 🎯 Etapa 9: Simplificação e Inteligência dos Filtros de Tipos de Imóveis
- `[x]` Atualizar `src/utils/helpers.js` com os novos tipos de imóvel simplificados e a função `matchPropertyType`.
- `[x]` Atualizar `src/components/Leads.jsx` com a importação de `matchPropertyType` e a lógica de correspondência inteligente para filtros e contadores.
- `[x]` Ajustar o importador de CSV em `Leads.jsx` para mapear de forma limpa os tipos de imóveis às novas categorias estruturadas.
- `[x]` Validar a build de produção do Vite executando `npm run build` e confirmar que não há erros de compilação.
- `[x]` Testar localmente a contagem dinâmica e o funcionamento dos novos filtros simplificados.
- `[x]` Desenvolver popup/modal interativo com preview de templates de WhatsApp para confirmação de visitas diretamente no Dashboard.
- `[x]` Criar gerador de links de templates do Google Calendar e integrar botões de sincronização rápida de um clique nas abas Dashboard e Visitas.
- `[x]` Desenvolver seletor de texto autocompletável (Searchable Autocomplete Dropdown) para busca e escolha rápida de clientes no modal de agendamento de visitas.
- `[x]` Desenvolver seção altamente visual "Tarefas de Follow-up (Retorno de Clientes)" no Dashboard inicial, listando prazos cronológicos e destacando retornos urgentes ou atrasados em amarelo com atalho de contato por WhatsApp integrado.
- `[x]` Implementar botões de controle de tarefas de follow-up ("Concluir" e "Remarcar") na Dashboard inicial, permitindo atualizar prazos ou remover retornos resolvidos de forma instantânea.
- `[x]` Desenvolver a "Linha do Tempo & Histórico do Cliente" dentro do modal de leads, realizando a fusão cronológica de visitas (passadas e futuras) e anotações históricas com ícones interativos e campo de registro imediato.
- `[x]` Integrar campo de Renda Familiar Bruta Mensal do Lead no Simulador de Financiamento bancário, calculando a taxa real de comprometimento (%) e exibindo badge e status de crédito dinâmicos (Regra de 30% da Caixa e bancos privados).

## 🚀 Etapa 10: Três Recursos Premium (Perfil, Performance e Proposta PDF)
- `[x]` Desenvolver o novo componente `src/components/Settings.jsx` com suporte a edição de perfil
- `[x]` Integrar a nova aba "Meu Perfil" no sidebar e menu mobile em `Layout.jsx` e `App.jsx`
- `[x]` Implementar o painel "Performance da Equipe" no `Dashboard.jsx` para gestores
- `[x]` Desenvolver o gerador de propostas PDF em `src/utils/helpers.js`
- `[x]` Adicionar o botão "Proposta PDF" nos cards e modal de histórico de leads em `Leads.jsx`
- `[x]` Desenvolver o modal de visualização e revisão de Proposta Comercial (`Visualizar & Ajustar Proposta Comercial 📄`) permitindo personalizar dados temporariamente antes de gerar o documento final.
- `[x]` Desenvolver o recurso de compartilhamento rápido de parcerias ("Copiar Ficha") copiando os requisitos do cliente com formatação premium e emojis para envio instantâneo no WhatsApp.
- `[x]` Implementar adaptação mobile avançada com suporte a Safe Areas (Notch de iPhones/Androids) na bottom-bar, rolagem momentum horizontal sem scrollbars nas réguas de filtros e empilhamento inteligente de inputs.
- `[x]` Implementar adaptação mobile avançada com suporte a Safe Areas (Notch de iPhones/Androids) na bottom-bar, rolagem momentum horizontal sem scrollbars nas réguas de filtros e empilhamento inteligente de inputs.
- `[x]` Testar e validar a compilação final com `npm run build`

## 🏢 Etapa 11: Carteira Digital de Imóveis (Meus Imóveis Beta)
- `[x]` Atualizar conector `src/config/supabase.js` para mapear `properties` para `re_properties` e configurar a chave localStorage correspondente com seed data inicial de teste.
- `[x]` Registrar a nova aba "Meus Imóveis (Beta)" no menu sidebar e mobile de `Layout.jsx`.
- `[x]` Registrar o roteamento e importação do novo componente no switch principal de `App.jsx`.
- `[x]` Criar o novo componente premium `src/components/Properties.jsx` com suporte a busca, filtros, toggle de empreendimentos, gerenciamento dinâmico de tipologias/plantas, dados de proprietários e compartilhamento no WhatsApp.
- `[x]` Adicionar botão "🔍 Importar da Carteira" no modal de cadastro e edição de leads em `Leads.jsx` para auto-preenchimento rápido.
- `[x]` Adicionar botão "🔍 Selecionar da Carteira" no modal de agendamento de visitas em `Visits.jsx` para auto-preenchimento rápido.
- `[x]` Criar script SQL `supabase_properties_schema.sql` na raiz do projeto para eventual deploy na nuvem.
- `[x]` Executar `npm run build` para garantir sucesso absoluto na compilação.
- `[x]` Implementar Filtro de Empreendimentos e Imóveis da carteira na listagem de leads com correspondência inteligente de texto (case-insensitive) e vinculação por tags automáticas.
- `[x]` Implementar classe responsiva .filter-row para as réguas de filtros horizontais (wrap no desktop e scroll com momentum no mobile) nas abas de Leads, Visitas e Carteira de Imóveis.
- `[x]` Implementar recarga ativa (fresh load) ao abrir os modais de Leads e Visitas e regex de alta tolerância (/\[im[óo]vel:\s*([^\]]+)\]/i) para exibição segura dos badges de imóveis vinculados.
- `[x]` Corrigir sincronização de edição de código de imóvel: propagar automaticamente a alteração do código (ex: de AP202 para AP303) para as tags `[Imóvel: CODIGO]` nas anotações (`notes`) de todos os leads vinculados, impedindo a perda de filtros e visualizações.
- `[x]` Atualizar a página de divulgação `divulgacao_crm.html` adicionando a 4ª métrica responsiva, redefinindo o layout grid em repeat auto-fit e criando a 5ª aba interativa do showroom com o mockup de carteira digital e cópia rápida de ficha técnica.

## 📋 Etapa 12: Leads Premium (Origem, Tipo e Temperatura)
- `[x]` Criar script SQL corretivo `supabase_upgrade_leads_v3.sql` na raiz do projeto.
- `[x]` Atualizar mock seeds de leads em `src/config/supabase.js` com novos campos.
- `[x]` Expandir opções de `OPTIONS` em `src/utils/helpers.js` para origens, tipos e temperaturas.
- `[x]` Integrar novos campos de input e seleção no formulário de Cadastro/Edição de leads in `src/components/Leads.jsx`.
- `[x]` Adicionar badges visuais premium nos cards dos leads para Temperatura, Origem e Tipo.
- `[x]` Adicionar novas réguas de filtros deslizantes no topo da listagem de leads para Temperatura e Origem.
- `[x]` Validar empacotamento completo de produção executando `npm run build`.
- `[x]` Otimizar a régua de filtros de leads, convertendo o layout poluído de 5 linhas em um Painel de Filtros Avançados retrátil (Collapsible) com resumo dinâmico de filtros ativos (chips) e botão de limpeza rápida.
- `[x]` Desenvolver alternância tátil rápida (Toggle) de temperatura no card de lead via clique direto no badge, dotado de atualização otimista (Optimistic UI Update) e sincronização assíncrona com banco de dados.
- `[x]` Exibir a data de entrada (created_at) do lead no card principal com badge minimalista e ícone de calendário.
- `[x]` Desenvolver exportador de banco de dados para CSV estruturado em português, suportando filtragem dinâmica local e injeção de BOM UTF-8 para exibição correta de acentos no Excel.







