// Helper Utilities for Real Estate CRM

/**
 * Formata um valor numérico para Moeda Brasileira (BRL) R$
 */
export const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formata datas ISO ou strings YYYY-MM-DD para o formato pt-BR DD/MM/AAAA
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Adjust timezone offsets for standard YYYY-MM-DD strings
    if (dateStr.length === 10) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

/**
 * Formata data e hora para exibição completa
 */
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'N/A';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date) + 'h';
  } catch (e) {
    return dateTimeStr;
  }
};

/**
 * Retorna o rótulo amigável em português para os estágios do funil imobiliário
 */
export const getLeadStatusLabel = (status) => {
  const statusMap = {
    'new': 'Novo Lead',
    'contacted': 'Contato Feito',
    'visit_scheduled': 'Visita Agendada',
    'visited': 'Visita Realizada',
    'proposal': 'Proposta',
    'won': 'Contrato Fechado',
    'lost': 'Perdido'
  };
  return statusMap[status] || status;
};

/**
 * Compila um template de mensagem do WhatsApp substituindo as chaves pelos valores reais do lead
 */
export const compileWhatsAppTemplate = (templateText, lead, realtorName = '', visitData = null) => {
  if (!templateText) return '';
  
  let compiled = templateText;
  
  // Basic lead fields
  compiled = compiled.replace(/{nome}/gi, lead.name || 'Cliente');
  compiled = compiled.replace(/{imovel}/gi, lead.property_type || 'Imóvel');
  compiled = compiled.replace(/{regiao}/gi, lead.region || 'sua região de preferência');
  compiled = compiled.replace(/{valor}/gi, lead.budget ? formatCurrency(lead.budget) : 'valor sob consulta');
  compiled = compiled.replace(/{corretor}/gi, realtorName || 'Loreny');
  
  // Visit fields (in case we have active visit details)
  if (visitData) {
    compiled = compiled.replace(/{data_visita}/gi, formatDate(visitData.visit_datetime?.substring(0, 10)) || 'a combinar');
    compiled = compiled.replace(/{hora_visita}/gi, visitData.visit_datetime?.substring(11, 16) || 'a combinar');
  } else if (lead.next_action_date) {
    compiled = compiled.replace(/{data_visita}/gi, formatDate(lead.next_action_date) || 'a combinar');
    compiled = compiled.replace(/{hora_visita}/gi, 'a combinar');
  } else {
    compiled = compiled.replace(/{data_visita}/gi, 'a combinar');
    compiled = compiled.replace(/{hora_visita}/gi, 'a combinar');
  }

  return compiled;
};

/**
 * Verifica se o tipo de imóvel do lead corresponde ao filtro selecionado,
 * com agrupamento inteligente de categorias legadas ou específicas.
 */
export const matchPropertyType = (leadType, filterType) => {
  if (!leadType) return false;
  if (!filterType) return true; // Se filtro for vazio, corresponde a tudo
  
  const lead = leadType.toLowerCase().trim();
  const filter = filterType.toLowerCase().trim();
  
  if (filter === 'casa') {
    return lead.includes('casa') || lead.includes('sobrado');
  }
  if (filter === 'terreno / lote' || filter === 'lote' || filter === 'terreno') {
    return lead.includes('terreno') || lead.includes('lote');
  }
  if (filter === 'apartamento' || filter === 'apto' || filter === 'apt') {
    return lead.includes('apartamento') || lead.includes('apto') || lead.includes('apt') || lead.includes('cobertura');
  }
  if (filter === 'comercial') {
    return lead.includes('comercial') || lead.includes('sala') || lead.includes('galpão') || lead.includes('galpao');
  }
  if (filter === 'chácara / sítio' || filter === 'chacara' || filter === 'sitio') {
    return lead.includes('chácara') || lead.includes('sítio') || lead.includes('chacara') || lead.includes('sitio') || lead.includes('fazenda');
  }
  
  return lead === filter || lead.includes(filter) || filter.includes(lead);
};

/**
 * Gera um link template do Google Calendar para o agendamento
 */
export const getGoogleCalendarUrl = (visit, leadName) => {
  if (!visit) return '';
  
  const title = encodeURIComponent(`Visita: ${leadName} 🔑`);
  
  // Formatar datas para o padrão compact do Google Calendar (YYYYMMDDTHHMMSSZ)
  const startDt = new Date(visit.visit_datetime);
  const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // Duração padrão de 1 hora
  
  const formatCalDate = (date) => {
    try {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (e) {
      return '';
    }
  };
  
  const dates = `${formatCalDate(startDt)}/${formatCalDate(endDt)}`;
  
  const details = encodeURIComponent(`Cliente: ${leadName}\nImóvel: ${visit.property_details}\nObservações: ${visit.notes || 'Sem observações adicionais.'}\n\nAgendado via CRM Loreny Imóveis v3.`);
  const location = encodeURIComponent(visit.property_details || 'Região de Interesse');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};

/**
 * Decompõe o texto de anotações (notes) em um array de interações cronológicas
 */
export const parseNotesToHistory = (notesText) => {
  if (!notesText) return [];
  const lines = notesText.split('\n');
  const history = [];
  let currentUnstructured = '';
  
  lines.forEach(line => {
    // Casamento de padrão: [DD/MM/AAAA hh:mm] - Mensagem
    const dateMatch = line.match(/^\[(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})\]\s*-\s*(.*)$/);
    if (dateMatch) {
      if (currentUnstructured.trim()) {
        history.push({ date: 'Anotações', time: '', content: currentUnstructured.trim() });
        currentUnstructured = '';
      }
      history.push({
        date: dateMatch[1],
        time: dateMatch[2],
        content: dateMatch[3],
        isInteraction: true
      });
    } else {
      if (line.trim() !== '') {
        currentUnstructured += (currentUnstructured ? '\n' : '') + line;
      }
    }
  });
  
  if (currentUnstructured.trim()) {
    history.push({ date: 'Anotações', time: '', content: currentUnstructured.trim() });
  }
  
  return history;
};

// CRM Global Select Options
export const OPTIONS = {
  PROPERTY_TYPES: [
    'Apartamento',
    'Casa',
    'Terreno / Lote',
    'Comercial',
    'Chácara / Sítio'
  ],
  
  STAGES: [
    { value: 'new', label: 'Novo Lead' },
    { value: 'contacted', label: 'Contato Feito' },
    { value: 'visit_scheduled', label: 'Visita Agendada' },
    { value: 'visited', label: 'Visita Realizada' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'won', label: 'Contrato Fechado (Won)' },
    { value: 'lost', label: 'Negócio Perdido (Lost)' }
  ],
  
  STATES: [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'PR', label: 'Paraná' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'GO', label: 'Goiás' },
    { value: 'DF', label: 'Distrito Federal' }
  ]
};

/**
 * Abre uma nova janela e gera uma proposta imobiliária premium em PDF prontinha para impressão/salvamento.
 */
export const generateProposalPDF = (lead, realtorName = '', realtorEmail = '', realtorPhone = '', realtorCompany = '', customTitle = '', customSubtitle = '') => {
  const history = parseNotesToHistory(lead.notes);
  const formattedBudget = lead.budget ? (typeof lead.budget === 'number' ? formatCurrency(lead.budget) : (isNaN(parseFloat(lead.budget)) ? lead.budget : formatCurrency(parseFloat(lead.budget)))) : 'Não especificado';
  const realtor = realtorName || 'Loreny Corretora';
  const company = realtorCompany || 'Loreny Imóveis';
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const title = customTitle || 'Proposta Comercial';
  const subtitle = customSubtitle || 'Ficha de Interesse Cadastral';

  const historyHtml = history.length === 0
    ? '<p style="color: #64748b; font-style: italic; font-size: 13px;">Nenhum registro de atendimento cadastrado.</p>'
    : history.map(item => `
        <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;">
            <span>${item.isInteraction ? '💬 DIÁLOGO REGISTRADO' : '📝 NOTA HISTÓRICA'} • ${item.date} ${item.time ? `às ${item.time}` : ''}</span>
          </div>
          <div style="font-size: 13px; color: #1e293b; line-height: 1.5; white-space: pre-line;">${item.content}</div>
        </div>
      `).join('');

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor, libere os pop-ups para gerar a proposta em PDF.');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Proposta Comercial - ${lead.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', sans-serif;
          background-color: #ffffff;
          color: #1e293b;
          padding: 20px;
          line-height: 1.6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .proposal-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
          background: linear-gradient(135deg, #0a1424 0%, #111e35 100%);
          color: #ffffff;
          padding: 32px 40px;
          border-bottom: 4px solid #10b981;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-logo {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
        }
        .header-logo span {
          color: #10b981;
        }
        .header-title {
          text-align: right;
        }
        .header-title h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-title p {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
          font-weight: 500;
        }
        .content {
          padding: 40px;
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0a1424;
          text-transform: uppercase;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .info-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }
        .info-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 14px;
          color: #0a1424;
          font-weight: 600;
        }
        .info-value-budget {
          color: #10b981;
          font-size: 16px;
          font-weight: 800;
        }
        .timeline {
          margin-bottom: 36px;
        }
        .footer-realtor {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
        }
        .realtor-card {
          font-size: 13px;
          color: #475569;
        }
        .realtor-name {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0a1424;
          margin-bottom: 4px;
        }
        .signature-box {
          text-align: right;
          font-size: 12px;
          color: #64748b;
        }
        .signature-line {
          width: 220px;
          height: 1px;
          background-color: #94a3b8;
          margin-bottom: 6px;
        }
        @media print {
          body {
            padding: 0;
            background-color: transparent;
          }
          .proposal-container {
            border: none;
            box-shadow: none;
          }
          .header {
            background: #0a1424 !important;
            color: #ffffff !important;
          }
          .header-logo span {
            color: #10b981 !important;
          }
          .info-card {
            background-color: #f8fafc !important;
          }
          .info-value-budget {
            color: #10b981 !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="proposal-container">
        <!-- HEADER -->
        <div class="header">
          <div class="header-logo">
            Loreny<span>Imóveis</span>
          </div>
          <div class="header-title">
            <h1>${title}</h1>
            <p>${subtitle} • Emissão: ${dateStr}</p>
          </div>
        </div>

        <!-- CONTENT -->
        <div class="content">
          <!-- SECTION 1: FICHA CADASTRAL -->
          <div class="section-title">Ficha de Interesse do Cliente</div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Nome do Cliente</div>
              <div class="info-value">${lead.name}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Celular / WhatsApp</div>
              <div class="info-value">${lead.phone}</div>
            </div>
            <div class="info-card" style="grid-column: span 2;">
              <div class="info-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 0; gap: 12px;">
                <div>
                  <div class="info-label">Tipo de Imóvel</div>
                  <div class="info-value">${lead.property_type || 'Não especificado'}</div>
                </div>
                <div>
                  <div class="info-label">Região Preferencial</div>
                  <div class="info-value">${lead.region}</div>
                </div>
                <div>
                  <div class="info-label">Orçamento Pretendido</div>
                  <div class="info-value info-value-budget">${formattedBudget}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: TIMELINE HISTORICA -->
          <div class="section-title">Linha do Tempo & Acompanhamento</div>
          <div class="timeline">
            ${historyHtml}
          </div>

          <!-- FOOTER SIGNATURE -->
          <div class="footer-realtor">
            <div class="realtor-card">
              <div class="realtor-name">${realtor}</div>
              <div>Consultor(a) Técnico Imobiliário</div>
              <div style="font-weight: 500; margin-top: 4px; color: #0a1424;">${company}</div>
              ${realtorPhone ? `<div style="margin-top: 2px;">WhatsApp: ${realtorPhone}</div>` : ''}
              ${realtorEmail ? `<div>E-mail: ${realtorEmail}</div>` : ''}
            </div>
            
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Assinatura do Consultor</div>
              <div style="font-size: 10px; margin-top: 2px; color: #94a3b8;">Loreny Imóveis v3</div>
            </div>
          </div>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
};

