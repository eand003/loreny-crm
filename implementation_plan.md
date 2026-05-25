# Plano de Implementação — Otimização Visual & Limpeza dos Filtros (Leads)

Este plano descreve as modificações necessárias para redesenhar a seção de filtros na tela de **Gestão de Leads & Negócios (`Leads.jsx`)**. O objetivo é eliminar o excesso de poluição visual gerado por mais de 20 crachás (badges) de botões de filtro e compactar o layout, preservando todas as funcionalidades de filtro, contagem de leads em tempo real e retrocompatibilidade de dados.

---

## 🧐 1. Diagnóstico do Problema & Proposta Visual

### O Problema Atual:
- O painel avançado possui 5 linhas horizontais que contêm botões para cada valor possível de filtro (Estágio, Tipo de Imóvel, Temperatura, Origem e Empreendimento).
- Em telas padrão, os botões quebram linha ou se amontoam, ocupando até 40% do espaço útil da tela e gerando um alto ruído visual.
- A navegação em dispositivos menores fica prejudicada pela repetição contínua de crachás repetitivos e contadores flutuantes.

### A Proposta Visual (SaaS Premium):
1. **Grade Inteligente de Seletores (CSS Grid):** Transicionar a exibição dos filtros avançados para uma grade responsiva com seletor `<select>` individual de alto padrão para cada categoria de filtro.
2. **Compactação de Espaço:** Reduzir a altura total do painel aberto em mais de 70%, deixando a tela limpa, focada e elegante.
3. **Estatísticas Preservadas (Contador Dinâmico):** Injetar as contagens dinâmicas de leads em tempo real diretamente dentro de cada `<option>` do dropdown (exemplo: `Novo Lead (342)` ou `Apartamento (384)`).
4. **Badges de Ação Ativos:** O seletor ativo mudará de cor dinamicamente (fundo em `var(--primary-light)` com borda dourada `var(--primary)`), permitindo identificar facilmente quais filtros estão ativos.
5. **Botão de Limpeza Individual:** Exibição de um pequeno botão discreto "Limpar" ao lado do rótulo do seletor que só aparece quando um filtro específico está selecionado.

---

## 📐 2. Detalhamento Técnico das Alterações

### A. Otimização do Componente de Leads
#### [MODIFY] [Leads.jsx](file:///c:/Users/Eduardo/Documents/GitHub/loreny-crm/src/components/Leads.jsx)
- Localizar o bloco `{showFilters && ( ... )}` dentro de `Leads.jsx` (linhas 821 a 1012).
- Substituir a estrutura interna de 5 divs de `.filter-row` por uma grade CSS Grid (`display: grid`, `gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr))`) contendo os seletores estilizados para:
  1. **Estágio Funil** (`statusFilter`)
  2. **Tipo de Imóvel** (`propertyTypeFilter`)
  3. **Temperatura** (`temperatureFilter`)
  4. **Origem** (`leadSourceFilter`)
  5. **Empreendimento** (`selectedPropertyFilter` - carregado dinamicamente do estado `properties`)
  6. **Corretor** (`brokerFilter` - exibido apenas se `isManager` for verdadeiro e houver perfis)
- Estilizar os elementos `<select>` de forma consistente com a identidade visual premium do CRM (Outfit/Inter, cantos arredondados, fundo de alto contraste e foco suave).

---

## 📊 3. Plano de Verificação (UAT)

### Testes de Compilação
1. Executar `npm run build` para garantir que o Vite compile a aplicação perfeitamente em menos de 2 segundos sem nenhum aviso (warning) ou erro de compilação.

### Verificação Manual
1. **Abertura/Fechamento:** Clicar no botão "Filtros" e certificar-se de que o novo painel em grade abre com suavidade e sem quebrar o layout.
2. **Exibição dos Contadores:** Abrir as opções de cada seletor e validar se a contagem exibida ao lado do rótulo da opção (ex: `Novo Lead (342)`) está calculando corretamente a quantidade de leads cadastrados para aquele status.
3. **Ativação Visual:** Escolher uma opção de filtro (ex: Temperatura -> `Quente`). Verificar se o dropdown muda para um tom dourado elegante e se o botão "Limpar" correspondente torna-se visível acima dele.
4. **Filtragem Real-Time:** Selecionar filtros cruzados (ex: `Apartamento` e `Quente`) e checar se os cards na tela atualizam instantaneamente respeitando os critérios definidos.
5. **Limpeza Rápida:** Clicar em "Limpar" em um dropdown específico e confirmar que a filtragem correspondente foi desfeita mantendo os demais filtros ativos intactos.

---

## 💡 Feedback Requerido do Usuário

> [!IMPORTANT]
> 1. Você concorda com esta abordagem de organizar os filtros em uma grade compacta de seletores suspensos (dropdowns) com contadores integrados de um clique?
> 2. Podemos proceder com as alterações no código de `Leads.jsx` imediatamente?
