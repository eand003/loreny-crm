# Plano de Implementação — Estágio do Lead Clicável para Alteração Rápida

Este plano descreve as modificações necessárias para tornar o selo de estágio do lead (localizado no canto superior direito de cada card de lead na aba **Gestão de Leads & Negócios (`Leads.jsx`)**) clicável. Isso permitirá a troca instantânea do estágio do lead diretamente a partir do card, sem a necessidade de abrir o modal pesado de edição completa.

---

## 🧐 1. Diagnóstico e Proposta de UX/UI

### O Comportamento Atual:
- No canto superior direito do card de cada lead, exibe-se um selo estático (`<span>`) contendo o estágio atual do lead (ex: `Novo Lead`, `Contato Feito`, `Visita Agendada`).
- Para alterar o estágio, o corretor é obrigado a clicar no botão de "Editar Lead" (ícone de lápis) na barra inferior de ações, o que abre o modal de formulário completo, selecionar o novo estágio no dropdown do formulário e salvar o lead.

### A Nova Solução Proposta (Fast Stage Selector):
1. **Seletor Disfarçado (Badge Select Overlay):** Em vez de usar um elemento de texto estático `<span>`, renderizaremos um elemento `<select>` nativo estilizado para parecer *exatamente* idêntico ao selo atual (`badge badge-${ld.status}`).
2. **Estética Preservada:** Utilizaremos `appearance: none`, `WebkitAppearance: none`, `cursor: pointer` e fontes e bordas idênticas para remover as setas padrão do navegador. O selo manterá as cores premium exclusivas para cada estágio.
3. **Atualização Otimista da UI:** Ao selecionar um novo estágio no dropdown, o estado do React será atualizado imediatamente (Optimistic UI Update), movendo ou reordenando visualmente o lead na listagem e atualizando os contadores de filtro do topo instantaneamente.
4. **Persistência Assíncrona no Supabase:** Paralelamente, enviaremos uma chamada assíncrona ao banco de dados (`supabase.from('leads').update()`) para consolidar a alteração. Caso a chamada falhe, o estágio anterior será restaurado automaticamente com um alerta discreto.

---

## 📐 2. Detalhes Técnicos das Alterações

### A. Novo Manipulador de Estado
#### [MODIFY] [Leads.jsx](file:///c:/Users/Eduardo/Documents/GitHub/loreny-crm/src/components/Leads.jsx)
- Adicionar o método `handleUpdateLeadStatus(lead, newStatus)` logo após o método existente `handleToggleTemperature` (linha 470).
- Essa função:
  - Salvará o status atual como backup.
  - Aplicará a mudança otimista usando `setLeads` mapeando o `ld.id === lead.id ? { ...ld, status: newStatus } : ld`.
  - Executará `supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)`.
  - Se ocorrer um erro, reverterá o estado para o status de backup e emitirá um `alert`.

```javascript
  const handleUpdateLeadStatus = async (lead, newStatus) => {
    const oldStatus = lead.status;
    if (oldStatus === newStatus) return;

    try {
      // Atualização otimista e instantânea de estado local
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));

      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) throw error;
    } catch (e) {
      // Reverte se houver erro
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: oldStatus } : l));
      alert('Erro ao atualizar o estágio do lead: ' + e.message);
    }
  };
```

### B. Substituição do Elemento HTML do Badge
- Localizar o seguinte bloco em `Leads.jsx` (linhas 1406-1408):
```jsx
                <span className={`badge badge-${ld.status}`}>
                  {getLeadStatusLabel(ld.status)}
                </span>
```
- Substituir por um seletor `<select>` responsivo com as opções de `OPTIONS.STAGES` importadas de `helpers.js`:
```jsx
                <select
                  value={ld.status}
                  onChange={(e) => handleUpdateLeadStatus(ld, e.target.value)}
                  className={`badge badge-${ld.status}`}
                  style={{
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    padding: '4px 10px',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'auto',
                    height: 'auto',
                    margin: 0,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2'
                  }}
                  title="Clique para mudar o estágio do lead rapidamente"
                >
                  {OPTIONS.STAGES.map(stage => (
                    <option key={stage.value} value={stage.value} style={{ backgroundColor: '#ffffff', color: '#1e293b', textTransform: 'none' }}>
                      {stage.label}
                    </option>
                  ))}
                </select>
```

---

## 📊 3. Plano de Verificação (UAT)

### Testes de Compilação
- Executar `npm run build` na pasta raiz para validar que o compilador do Vite conclua com sucesso absoluto em menos de 2 segundos.

### Verificação Manual
1. **Aparência Estética:** Confirmar que o selo de estágio no canto superior direito do lead mantém exatamente o visual de pílula arredondada com a cor correspondente a seu estágio, sem setas indesejadas do navegador.
2. **Interação ao Clicar:** Clicar ou tocar no selo. Certificar-se de que a listagem suspensa nativa do sistema operacional (ou navegador) abre com os 7 estágios listados de forma limpa.
3. **Mudança de Estágio:** Selecionar um novo estágio.
   - O card deve alterar instantaneamente de cor/status e o cabeçalho do card deve atualizar o rótulo do selo.
   - Os contadores de filtros no topo da página devem ser atualizados instantaneamente em tempo real.
   - O banco de dados Supabase (ou Mock DB) deve ser atualizado silenciosamente em segundo plano.
4. **Tratamento de Erros:** Simular uma perda de rede ou rejeição na rota do banco e confirmar que o selo reverte com segurança para o estágio anterior.

---

## 💡 Feedback Requerido do Usuário

> [!IMPORTANT]
> 1. Você está de acordo com a proposta de tornar o selo de estágio do lead um seletor `<select>` suspenso responsivo estilizado nativamente como o próprio selo?
> 2. Podemos iniciar a implementação desta funcionalidade agora mesmo?
