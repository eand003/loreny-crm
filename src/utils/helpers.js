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

// CRM Global Select Options
export const OPTIONS = {
  PROPERTY_TYPES: [
    'Apartamento',
    'Casa Comercial',
    'Casa de Rua',
    'Casa em Condomínio',
    'Chácara / Sítio',
    'Cobertura',
    'Galpão Comercial',
    'Sala Comercial',
    'Terreno em Condomínio',
    'Terreno de Rua'
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
