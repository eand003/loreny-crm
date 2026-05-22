# CRM Simples para Corretora de Imóveis Autônoma — Loreny

## Objetivo do projeto

Criar um CRM simples, funcional e responsivo para a Loreny, corretora de imóveis autônoma, com foco em organizar contatos, acompanhar clientes, registrar interesses, controlar retornos e aumentar a produtividade comercial.

O sistema deve ser fácil de usar, com aparência limpa, pensado para uso diário no computador e no celular.

---

## Nome sugerido do sistema

**CRM Loreny Imóveis**

---

## Perfil da usuária

A usuária principal é uma corretora de imóveis autônoma que atende clientes via WhatsApp, Instagram, indicações e outros canais. Ela precisa controlar melhor seus leads para não esquecer retornos, acompanhar negociações e saber em que etapa cada cliente está.

---

## Funcionalidades principais do MVP

### 1. Cadastro de clientes/leads

Criar uma tela para adicionar e editar clientes com os seguintes campos:

- Nome do cliente
- WhatsApp
- Origem do lead
- Tipo de imóvel desejado
- Região/bairro de interesse
- Faixa de valor
- Status do atendimento
- Próxima ação
- Data de retorno
- Observações

---

## Campos detalhados

### Nome
Campo de texto obrigatório.

### WhatsApp
Campo de telefone. Deve permitir clicar para abrir conversa no WhatsApp.

Formato de link:
`https://wa.me/55NUMERO`

### Origem do lead
Campo de seleção com opções:

- Instagram
- WhatsApp
- Indicação
- OLX
- Placa
- Site
- Facebook
- Outro

### Tipo de imóvel
Campo de seleção com opções:

- Casa
- Apartamento
- Lote
- Chácara
- Comercial
- Aluguel
- Outro

### Região/bairro
Campo de texto livre.

### Faixa de valor
Campo de texto ou número. Exemplos:

- Até 250 mil
- 250 a 400 mil
- 400 a 700 mil
- Acima de 700 mil

### Status do atendimento
Campo de seleção com opções:

- Novo lead
- Contato feito
- Entendeu necessidade
- Enviou opções
- Agendou visita
- Visitou imóvel
- Proposta feita
- Fechado
- Perdido
- Nutrição futura

### Próxima ação
Campo de texto. Exemplos:

- Chamar no WhatsApp
- Enviar opções
- Confirmar visita
- Cobrar resposta
- Mandar novo imóvel
- Fazer follow-up

### Data de retorno
Campo de data. Deve ser usado para mostrar quais clientes precisam de contato hoje.

### Observações
Campo de texto longo para anotações livres.

---

## Tela principal: Dashboard

A tela inicial deve mostrar:

1. Total de leads cadastrados
2. Leads novos
3. Clientes com retorno para hoje
4. Visitas agendadas
5. Propostas feitas
6. Negócios fechados

Também deve ter uma lista/tabela com os clientes cadastrados.

---

## Tabela de clientes

A tabela deve mostrar:

- Nome
- WhatsApp
- Origem
- Tipo de imóvel
- Região
- Valor
- Status
- Data de retorno
- Botão de WhatsApp
- Botão de editar
- Botão de excluir

---

## Filtros importantes

Adicionar filtros simples:

- Buscar por nome
- Filtrar por status
- Filtrar por origem
- Filtrar por tipo de imóvel
- Filtrar retornos de hoje
- Filtrar clientes sem próxima ação

---

## Regras de produtividade

O sistema deve ajudar a corretora a responder diariamente:

- Quem eu preciso chamar hoje?
- Quem está parado sem resposta?
- Quem está pronto para visita?
- Quem recebeu opção e precisa de follow-up?
- Quem pode receber novas oportunidades?

---

## Destaques visuais

Usar cores para status:

- Novo lead: azul
- Contato feito: cinza
- Enviou opções: amarelo
- Agendou visita: roxo
- Proposta feita: laranja
- Fechado: verde
- Perdido: vermelho
- Nutrição futura: marrom ou neutro

---

## Prioridades do MVP

### Essencial

- Cadastro de cliente
- Edição de cliente
- Exclusão de cliente
- Listagem em tabela
- Filtro por status
- Filtro por retorno de hoje
- Botão para abrir WhatsApp
- Dados salvos localmente no navegador ou em banco simples

### Desejável

- Exportar para CSV
- Importar CSV
- Histórico de interações
- Lembretes de retorno
- Pipeline visual tipo Kanban

---

## Sugestão de tecnologia

Criar como aplicação web simples.

Sugestão:

- Front-end: React
- Estilo: Tailwind CSS
- Armazenamento inicial: localStorage
- Futuro banco de dados: Supabase ou Firebase

O MVP pode começar usando localStorage para ser rápido, barato e funcional.

---

## Layout sugerido

### Cabeçalho

Título: **CRM Loreny Imóveis**

Botões:

- Novo cliente
- Exportar CSV
- Limpar filtros

---

### Cards do dashboard

Cards no topo:

- Total de leads
- Retorno hoje
- Visitas agendadas
- Propostas
- Fechados

---

### Área de filtros

Filtros logo abaixo dos cards:

- Campo de busca
- Select de status
- Select de origem
- Select de tipo de imóvel
- Botão "Retornos de hoje"

---

### Tabela

Tabela responsiva com os dados dos clientes.

No celular, cada cliente pode aparecer como card.

---

## Formulário de novo cliente

Abrir em modal ou página separada com os campos:

- Nome
- WhatsApp
- Origem
- Tipo de imóvel
- Região
- Faixa de valor
- Status
- Próxima ação
- Data de retorno
- Observações

Botões:

- Salvar
- Cancelar

---

## Histórico de interações — versão futura

Criar uma área dentro do cliente para registrar:

- Data da interação
- Tipo: ligação, WhatsApp, visita, proposta
- Observação

Exemplo:

`21/05/2026 — WhatsApp — Cliente pediu opções de casas até 450 mil na região central.`

---

## Kanban — versão futura

Criar uma visualização por colunas:

- Novo lead
- Contato feito
- Enviou opções
- Agendou visita
- Visitou imóvel
- Proposta feita
- Fechado
- Perdido

Permitir arrastar clientes entre as colunas.

---

## Requisitos de experiência do usuário

- Interface simples
- Botões grandes
- Fácil de usar no celular
- Sem excesso de campos obrigatórios
- Visual profissional
- Carregamento rápido
- Não depender de login no MVP inicial

---

## Texto de ajuda dentro do sistema

Adicionar uma mensagem no dashboard:

> Nunca deixe um cliente sem próxima ação e data de retorno. O segredo do CRM é saber quem chamar e quando chamar.

---

## Dados de exemplo para teste

Criar alguns clientes fictícios:

### Cliente 1
Nome: João Silva  
WhatsApp: 65999990000  
Origem: Instagram  
Tipo de imóvel: Casa  
Região: Centro  
Faixa de valor: Até 450 mil  
Status: Enviou opções  
Próxima ação: Fazer follow-up  
Data de retorno: data atual  
Observações: Quer casa com 3 quartos e garagem.

### Cliente 2
Nome: Maria Oliveira  
WhatsApp: 65988880000  
Origem: Indicação  
Tipo de imóvel: Apartamento  
Região: Próximo ao shopping  
Faixa de valor: 300 a 500 mil  
Status: Agendou visita  
Próxima ação: Confirmar horário da visita  
Data de retorno: data atual  
Observações: Prefere imóvel novo.

### Cliente 3
Nome: Carlos Pereira  
WhatsApp: 65977770000  
Origem: WhatsApp  
Tipo de imóvel: Lote  
Região: Bairro em expansão  
Faixa de valor: Até 180 mil  
Status: Novo lead  
Próxima ação: Fazer primeiro contato  
Data de retorno: data atual  
Observações: Cliente ainda não respondeu.

---

## Prompt para desenvolvimento

Desenvolva uma aplicação web chamada **CRM Loreny Imóveis**, voltada para uma corretora de imóveis autônoma.

A aplicação deve permitir cadastrar, editar, excluir, listar e filtrar clientes/leads. O foco é produtividade comercial, acompanhamento de retornos e organização de contatos.

Use uma interface moderna, limpa, responsiva e fácil de usar no celular.

No MVP, os dados podem ser salvos em localStorage. Crie a estrutura pensando em futura integração com Supabase.

Inclua:

- Dashboard com cards de resumo
- Cadastro completo de leads
- Tabela responsiva
- Filtros por nome, status, origem, tipo de imóvel e retorno de hoje
- Botão para abrir WhatsApp do cliente
- Exportação CSV
- Cores por status
- Dados de exemplo
- Código organizado e fácil de evoluir

Priorize simplicidade, clareza e uso real no dia a dia da corretora.

---

## Critério de sucesso

O CRM será considerado pronto se a Loreny conseguir:

1. Cadastrar um novo cliente em menos de 1 minuto
2. Saber quem precisa de retorno hoje
3. Abrir o WhatsApp do cliente com um clique
4. Filtrar clientes por etapa de atendimento
5. Não perder oportunidades por falta de organização
