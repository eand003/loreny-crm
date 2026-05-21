/* ============================================================
   CRM Loreny Imóveis — app.js
   Lógica completa: CRUD, filtros, kanban, histórico, CSV
   ============================================================ */

'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */
const STORAGE_KEY = 'loreny_crm_leads';

const STATUS_CONFIG = {
  'Novo lead':            { badge: 'novo',     color: '#3498db', bg: 'rgba(52,152,219,0.10)'  },
  'Contato feito':        { badge: 'contato',  color: '#78909c', bg: 'rgba(120,144,156,0.10)' },
  'Entendeu necessidade': { badge: 'entendeu', color: '#00acc1', bg: 'rgba(0,172,193,0.10)'   },
  'Enviou opções':        { badge: 'enviou',   color: '#f39c12', bg: 'rgba(243,156,18,0.10)'  },
  'Agendou visita':       { badge: 'agendou',  color: '#8e44ad', bg: 'rgba(142,68,173,0.10)'  },
  'Visitou imóvel':       { badge: 'visitou',  color: '#9b59b6', bg: 'rgba(155,89,182,0.10)'  },
  'Proposta feita':       { badge: 'proposta', color: '#e67e22', bg: 'rgba(230,126,34,0.10)'  },
  'Fechado':              { badge: 'fechado',  color: '#27ae60', bg: 'rgba(39,174,96,0.10)'   },
  'Perdido':              { badge: 'perdido',  color: '#e74c3c', bg: 'rgba(231,76,60,0.10)'   },
  'Nutrição futura':      { badge: 'nutricao', color: '#795548', bg: 'rgba(121,85,72,0.10)'   },
};

const KANBAN_ORDER = [
  'Novo lead', 'Contato feito', 'Entendeu necessidade', 'Enviou opções',
  'Agendou visita', 'Visitou imóvel', 'Proposta feita', 'Fechado',
  'Perdido', 'Nutrição futura',
];

const CSV_FIELDS = [
  'nome', 'whatsapp', 'origem', 'tipo', 'regiao',
  'valor', 'status', 'proximaAcao', 'dataRetorno', 'observacoes', 'criadoEm'
];

const CSV_HEADERS = [
  'Nome', 'WhatsApp', 'Origem', 'Tipo de Imóvel', 'Região/Bairro',
  'Faixa de Valor', 'Status', 'Próxima Ação', 'Data de Retorno', 'Observações', 'Criado Em'
];

/* ============================================================
   STATE
   ============================================================ */
let leads          = [];
let filteredLeads  = [];
let currentView    = 'tabela';
let deleteTargetId = null;
let draggingId     = null;

const filters = {
  busca:       '',
  status:      '',
  origem:      '',
  tipo:        '',
  retornoHoje: false,
  semAcao:     false,
};

/* ============================================================
   UTILITIES
   ============================================================ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Returns today's date as YYYY-MM-DD using local timezone */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format a YYYY-MM-DD string to DD/MM/YYYY for display */
function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/** Format current datetime as DD/MM/YYYY HH:mm */
function fmtDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} às ${hh}:${min}`;
}

/** Clean phone number digits only */
function cleanPhone(n) {
  return n.replace(/\D/g, '');
}

/** Build WhatsApp URL */
function waUrl(numero) {
  const digits = cleanPhone(numero);
  const full   = digits.startsWith('55') ? digits : '55' + digits;
  return `https://wa.me/${full}`;
}

/** Escape a value for CSV */
function csvEsc(val) {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Parse a CSV line respecting quoted fields */
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/** Get date classification vs today */
function dateCls(str) {
  if (!str) return '';
  const t = today();
  if (str < t) return 'date-overdue';
  if (str === t) return 'date-today';
  return 'date-future';
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   LOCAL STORAGE & SUPABASE STORAGE
   ============================================================ */
let supabaseClient = null;

function initSupabase() {
  const url = localStorage.getItem('loreny_crm_supabase_url');
  const key = localStorage.getItem('loreny_crm_supabase_key');
  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      return true;
    } catch (e) {
      console.error("Falha ao inicializar o Supabase:", e);
      supabaseClient = null;
    }
  }
  supabaseClient = null;
  return false;
}

function updateSupabaseUI(connected) {
  const indicator = $('supa-status-indicator');
  const text      = $('supa-status-text');
  const supaBtn   = $('btn-config-supabase');
  
  if (connected) {
    if (indicator) indicator.textContent = '🟢';
    if (text) text.textContent = 'Conectado à nuvem (Supabase)';
    if (supaBtn) {
      supaBtn.innerHTML = '☁️ Online';
      supaBtn.style.color = '#27ae60';
    }
  } else {
    if (indicator) indicator.textContent = '🟡';
    if (text) text.textContent = 'Usando armazenamento local (Offline)';
    if (supaBtn) {
      supaBtn.innerHTML = '☁️ Nuvem';
      supaBtn.style.color = '';
    }
  }
}

function saveLeadsLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function loadLeadsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      leads = JSON.parse(raw);
    } else {
      leads = sampleData();
      saveLeadsLocal();
    }
  } catch (e) {
    leads = sampleData();
    saveLeadsLocal();
  }
}

async function loadLeads() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      
      leads = data.map(l => ({
        id:          l.id,
        nome:        l.nome,
        whatsapp:    l.whatsapp    || '',
        origem:      l.origem      || '',
        tipo:        l.tipo        || '',
        regiao:      l.regiao      || '',
        valor:       l.valor       || '',
        status:      l.status      || 'Novo lead',
        proximaAcao: l.proxima_acao || '',
        dataRetorno: l.data_retorno || '',
        observacoes: l.observacoes || '',
        historico:   l.historico   || [],
        criadoEm:    l.criado_em   || new Date().toISOString()
      }));
    } catch (e) {
      console.error("Erro ao carregar do Supabase:", e);
      toast("Falha na sincronização online. Carregando dados locais.", "warning");
      loadLeadsLocal();
    }
  } else {
    loadLeadsLocal();
  }
}

async function saveLeads() {
  if (supabaseClient) {
    try {
      const dbLeads = leads.map(l => ({
        id:           l.id,
        nome:         l.nome,
        whatsapp:     l.whatsapp,
        origem:       l.origem,
        tipo:         l.tipo,
        regiao:       l.regiao,
        valor:        l.valor,
        status:       l.status,
        proxima_acao: l.proximaAcao,
        data_retorno: l.dataRetorno,
        observacoes:  l.observacoes,
        historico:    l.historico || [],
        criado_em:    l.criadoEm || new Date().toISOString()
      }));
      const { error } = await supabaseClient.from('leads').upsert(dbLeads);
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao sincronizar com o Supabase:", e);
      toast("Erro de conexão ao salvar na nuvem.", "error");
    }
  } else {
    saveLeadsLocal();
  }
}

/* ============================================================
   SAMPLE DATA
   ============================================================ */
function sampleData() {
  const t = today();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  return [
    {
      id: uid(), nome: 'João Silva', whatsapp: '65999990000',
      origem: 'Instagram', tipo: 'Casa', regiao: 'Centro',
      valor: 'Até 450 mil', status: 'Enviou opções',
      proximaAcao: 'Fazer follow-up', dataRetorno: t,
      observacoes: 'Quer casa com 3 quartos e garagem. Prefere bairro central.',
      historico: [
        { id: uid(), data: new Date(Date.now() - 86400000*2).toISOString(), tipo: 'Instagram', obs: 'Cliente entrou em contato pelo Instagram perguntando sobre casas na região central.' },
        { id: uid(), data: new Date(Date.now() - 86400000).toISOString(), tipo: 'WhatsApp', obs: 'Enviou 3 opções de casas. Aguardando retorno.' },
      ],
      criadoEm: new Date(Date.now() - 86400000*3).toISOString(),
    },
    {
      id: uid(), nome: 'Maria Oliveira', whatsapp: '65988880000',
      origem: 'Indicação', tipo: 'Apartamento', regiao: 'Próximo ao shopping',
      valor: '300 a 500 mil', status: 'Agendou visita',
      proximaAcao: 'Confirmar horário da visita', dataRetorno: t,
      observacoes: 'Prefere imóvel novo. Indicada pela cliente Ana Costa.',
      historico: [
        { id: uid(), data: new Date(Date.now() - 86400000*4).toISOString(), tipo: 'Ligação', obs: 'Primeiro contato. Tem interesse em apartamento 2 ou 3 quartos.' },
        { id: uid(), data: new Date(Date.now() - 86400000*2).toISOString(), tipo: 'WhatsApp', obs: 'Visita agendada para amanhã às 10h.' },
      ],
      criadoEm: new Date(Date.now() - 86400000*5).toISOString(),
    },
    {
      id: uid(), nome: 'Carlos Pereira', whatsapp: '65977770000',
      origem: 'WhatsApp', tipo: 'Lote', regiao: 'Bairro em expansão',
      valor: 'Até 180 mil', status: 'Novo lead',
      proximaAcao: 'Fazer primeiro contato', dataRetorno: t,
      observacoes: 'Cliente ainda não respondeu. Entrou pelo grupo do WhatsApp.',
      historico: [],
      criadoEm: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: uid(), nome: 'Ana Lima', whatsapp: '65966660000',
      origem: 'OLX', tipo: 'Apartamento', regiao: 'Jardim Europa',
      valor: '400 a 700 mil', status: 'Proposta feita',
      proximaAcao: 'Cobrar resposta da proposta', dataRetorno: yesterday,
      observacoes: 'Proposta enviada. Está avaliando com o marido. Urgente!',
      historico: [
        { id: uid(), data: new Date(Date.now() - 86400000*6).toISOString(), tipo: 'WhatsApp', obs: 'Lead captado pelo anúncio no OLX.' },
        { id: uid(), data: new Date(Date.now() - 86400000*3).toISOString(), tipo: 'Visita', obs: 'Visitou o apartamento no Jardim Europa. Gostou muito.' },
        { id: uid(), data: new Date(Date.now() - 86400000*2).toISOString(), tipo: 'Proposta', obs: 'Proposta feita no valor de R$ 520.000.' },
      ],
      criadoEm: new Date(Date.now() - 86400000*7).toISOString(),
    },
    {
      id: uid(), nome: 'Roberto Santos', whatsapp: '65955550000',
      origem: 'Indicação', tipo: 'Casa', regiao: 'Setor Sul',
      valor: '250 a 400 mil', status: 'Fechado',
      proximaAcao: 'Solicitar indicações para novos clientes', dataRetorno: tomorrow,
      observacoes: 'Negócio fechado! Casa de 280 mil. Cliente muito satisfeito.',
      historico: [
        { id: uid(), data: new Date(Date.now() - 86400000*10).toISOString(), tipo: 'WhatsApp', obs: 'Primeiro atendimento. Indicado pela Maria.' },
        { id: uid(), data: new Date(Date.now() - 86400000*7).toISOString(), tipo: 'Visita', obs: 'Visita realizada no Setor Sul. Aprovado!' },
        { id: uid(), data: new Date(Date.now() - 86400000*5).toISOString(), tipo: 'Proposta', obs: 'Proposta aceita de R$ 280.000. Contrato assinado.' },
      ],
      criadoEm: new Date(Date.now() - 86400000*12).toISOString(),
    },
    {
      id: uid(), nome: 'Fernanda Costa', whatsapp: '65944440000',
      origem: 'Facebook', tipo: 'Chácara', regiao: 'Zona Rural',
      valor: 'Acima de 700 mil', status: 'Nutrição futura',
      proximaAcao: 'Mandar novo imóvel quando surgir', dataRetorno: tomorrow,
      observacoes: 'Ainda não está no momento de comprar. Manter aquecida com novidades.',
      historico: [
        { id: uid(), data: new Date(Date.now() - 86400000*15).toISOString(), tipo: 'Facebook', obs: 'Comentou em post sobre chácaras. Entrou em contato.' },
      ],
      criadoEm: new Date(Date.now() - 86400000*16).toISOString(),
    },
  ];
}

/* ============================================================
   FILTER & SEARCH
   ============================================================ */
function applyFilters() {
  const t = today();
  const busca = filters.busca.toLowerCase().trim();

  filteredLeads = leads.filter(l => {
    if (busca && !(
      l.nome.toLowerCase().includes(busca) ||
      (l.regiao  || '').toLowerCase().includes(busca) ||
      (l.observacoes || '').toLowerCase().includes(busca) ||
      (l.whatsapp || '').includes(busca)
    )) return false;

    if (filters.status && l.status !== filters.status) return false;
    if (filters.origem && l.origem !== filters.origem) return false;
    if (filters.tipo   && l.tipo   !== filters.tipo)   return false;

    if (filters.retornoHoje && l.dataRetorno !== t) return false;
    if (filters.semAcao && (l.proximaAcao || '').trim() !== '') return false;

    return true;
  });
}

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard() {
  const t = today();

  const total     = leads.length;
  const retorno   = leads.filter(l => l.dataRetorno === t).length;
  const visitas   = leads.filter(l => l.status === 'Agendou visita').length;
  const propostas = leads.filter(l => l.status === 'Proposta feita').length;
  const fechados  = leads.filter(l => l.status === 'Fechado').length;
  const perdidos  = leads.filter(l => l.status === 'Perdido').length;

  setEl('count-total',    total);
  setEl('count-retorno',  retorno);
  setEl('count-visitas',  visitas);
  setEl('count-propostas',propostas);
  setEl('count-fechados', fechados);
  setEl('count-perdidos', perdidos);

  const badge = $('badge-retorno');
  if (badge) {
    badge.style.display = retorno > 0 ? 'flex' : 'none';
  }
}

/* ============================================================
   RENDER: STATUS BADGE HTML
   ============================================================ */
function badgeHtml(status) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return `<span class="badge">${esc(status)}</span>`;
  return `<span class="badge badge-${cfg.badge}">${esc(status)}</span>`;
}

/* ============================================================
   RENDER: DATE CELL HTML
   ============================================================ */
function dateCellHtml(dateStr) {
  if (!dateStr) return '<span class="date-future">—</span>';
  const cls  = dateCls(dateStr);
  const txt  = fmtDate(dateStr);
  const label = cls === 'date-today' ? `${txt} ⚡` :
                cls === 'date-overdue' ? `${txt} ⚠️` : txt;
  return `<span class="${cls}">${label}</span>`;
}

/* ============================================================
   RENDER: TABLE
   ============================================================ */
function renderTable() {
  const tbody = $('tabela-body');
  const empty = $('tabela-empty');
  if (!tbody) return;

  if (filteredLeads.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filteredLeads.map(l => {
    const cfg   = STATUS_CONFIG[l.status] || {};
    const color = cfg.color || '#999';
    const wa    = l.whatsapp ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="action-btn btn-wa" title="Abrir WhatsApp">💬</a>` : '';

    return `
    <tr data-id="${l.id}" style="animation: fadeInUp 0.2s ease both;">
      <td><span class="td-nome" title="${esc(l.nome)}">${esc(l.nome)}</span></td>
      <td>
        ${l.whatsapp
          ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener"
               style="color:var(--text-muted); font-size:0.8rem; text-decoration:none;">
               ${esc(l.whatsapp)}
             </a>`
          : '<span class="td-muted">—</span>'
        }
      </td>
      <td><span class="td-muted">${esc(l.origem) || '—'}</span></td>
      <td><span class="td-muted">${esc(l.tipo) || '—'}</span></td>
      <td><span class="td-muted" title="${esc(l.regiao)}">${esc(l.regiao) || '—'}</span></td>
      <td><span class="td-muted">${esc(l.valor) || '—'}</span></td>
      <td>${badgeHtml(l.status)}</td>
      <td>${dateCellHtml(l.dataRetorno)}</td>
      <td>
        <span class="td-muted" style="max-width:180px; display:inline-block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(l.proximaAcao)}">
          ${esc(l.proximaAcao) || '—'}
        </span>
      </td>
      <td>
        <div class="actions-cell">
          ${wa}
          <button class="action-btn btn-edit"  onclick="openEditModal('${l.id}')" title="Editar cliente">✏️</button>
          <button class="action-btn btn-hist"  onclick="openHistorico('${l.id}')" title="Histórico de interações">📋</button>
          <button class="action-btn btn-del"   onclick="confirmDelete('${l.id}')" title="Excluir cliente">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ============================================================
   RENDER: MOBILE CARDS
   ============================================================ */
function renderMobileCards() {
  const container = $('mobile-cards');
  if (!container) return;

  if (filteredLeads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p class="empty-title">Nenhum cliente encontrado</p>
        <p class="empty-sub">Ajuste os filtros ou cadastre um novo cliente.</p>
      </div>`;
    return;
  }

  container.innerHTML = filteredLeads.map(l => {
    const cfg   = STATUS_CONFIG[l.status] || {};
    const color = cfg.color || '#999';
    return `
    <div class="mobile-card" style="--card-color:${color}">
      <div class="mc-header">
        <div>
          <div class="mc-name">${esc(l.nome)}</div>
          <div class="mc-origin">${esc(l.origem) || ''} ${l.origem && l.tipo ? '·' : ''} ${esc(l.tipo) || ''}</div>
        </div>
        ${badgeHtml(l.status)}
      </div>
      <div class="mc-grid">
        <div class="mc-field">
          <span class="mc-field-label">Região</span>
          <span class="mc-field-value">${esc(l.regiao) || '—'}</span>
        </div>
        <div class="mc-field">
          <span class="mc-field-label">Valor</span>
          <span class="mc-field-value">${esc(l.valor) || '—'}</span>
        </div>
        <div class="mc-field">
          <span class="mc-field-label">Retorno</span>
          <span class="mc-field-value">${dateCellHtml(l.dataRetorno)}</span>
        </div>
        <div class="mc-field">
          <span class="mc-field-label">Próx. Ação</span>
          <span class="mc-field-value" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(l.proximaAcao) || '—'}</span>
        </div>
      </div>
      <div class="mc-actions">
        ${l.whatsapp
          ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="btn btn-sm btn-success">💬 WhatsApp</a>`
          : ''}
        <button class="btn btn-sm btn-secondary" onclick="openEditModal('${l.id}')">✏️ Editar</button>
        <button class="btn btn-sm btn-secondary" onclick="openHistorico('${l.id}')">📋</button>
        <button class="btn btn-sm btn-danger"    onclick="confirmDelete('${l.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   RENDER: KANBAN
   ============================================================ */
function renderKanban() {
  const board = $('kanban-board');
  if (!board) return;

  board.innerHTML = KANBAN_ORDER.map(status => {
    const cfg   = STATUS_CONFIG[status] || {};
    const color = cfg.color || '#999';
    const cards = filteredLeads.filter(l => l.status === status);

    const cardsHtml = cards.length === 0
      ? `<div style="text-align:center;padding:1.5rem 0.5rem;color:var(--text-muted);font-size:0.78rem;">Sem clientes</div>`
      : cards.map(l => kanbanCardHtml(l, color)).join('');

    return `
    <div class="kanban-col">
      <div class="kanban-col-header" style="--col-color:${color}; background:${color};">
        <span class="kanban-col-title">${esc(status)}</span>
        <span class="kanban-col-count">${cards.length}</span>
      </div>
      <div class="kanban-col-body"
           data-status="${esc(status)}"
           style="--col-color:${color}"
           ondragover="onDragOver(event, this)"
           ondragleave="onDragLeave(this)"
           ondrop="onDrop(event, '${esc(status)}')">
        ${cardsHtml}
      </div>
    </div>`;
  }).join('');
}

function kanbanCardHtml(l, color) {
  return `
  <div class="kanban-card"
       draggable="true"
       data-id="${l.id}"
       style="--card-color:${color}"
       ondragstart="onDragStart(event, '${l.id}')"
       ondragend="onDragEnd(event)">
    <div class="kc-name" title="${esc(l.nome)}">${esc(l.nome)}</div>
    ${l.tipo    ? `<div class="kc-row">🏠 ${esc(l.tipo)}</div>` : ''}
    ${l.regiao  ? `<div class="kc-row">📍 ${esc(l.regiao)}</div>` : ''}
    ${l.valor   ? `<div class="kc-row">💰 ${esc(l.valor)}</div>` : ''}
    ${l.dataRetorno ? `<div class="kc-row ${dateCls(l.dataRetorno)}">📅 ${fmtDate(l.dataRetorno)}</div>` : ''}
    ${l.proximaAcao ? `<div class="kc-row" style="white-space:normal;line-height:1.4;">⚡ ${esc(l.proximaAcao)}</div>` : ''}
    <div class="kc-actions">
      ${l.whatsapp
        ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="action-btn btn-wa" title="WhatsApp">💬</a>`
        : ''}
      <button class="action-btn btn-edit"  onclick="openEditModal('${l.id}')" title="Editar">✏️</button>
      <button class="action-btn btn-hist"  onclick="openHistorico('${l.id}')" title="Histórico">📋</button>
      <button class="action-btn btn-del"   onclick="confirmDelete('${l.id}')" title="Excluir">🗑️</button>
    </div>
  </div>`;
}

/* ============================================================
   RENDER: RESULTS COUNT
   ============================================================ */
function renderResultsCount() {
  const el = $('results-num');
  if (el) el.textContent = filteredLeads.length;
}

/* ============================================================
   RENDER: ALL (main entrypoint)
   ============================================================ */
function renderAll() {
  applyFilters();
  renderDashboard();
  renderResultsCount();
  renderTable();
  renderMobileCards();
  if (currentView === 'kanban') renderKanban();
}

/* ============================================================
   DRAG & DROP (Kanban)
   ============================================================ */
function onDragStart(e, id) {
  draggingId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('is-dragging');
}

function onDragEnd(e) {
  e.target.classList.remove('is-dragging');
  draggingId = null;
  document.querySelectorAll('.kanban-col-body').forEach(col => col.classList.remove('drag-over'));
}

function onDragOver(e, el) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kanban-col-body').forEach(col => col.classList.remove('drag-over'));
  el.classList.add('drag-over');
}

function onDragLeave(el) {
  el.classList.remove('drag-over');
}

function onDrop(e, newStatus) {
  e.preventDefault();
  document.querySelectorAll('.kanban-col-body').forEach(col => col.classList.remove('drag-over'));

  const id = draggingId;
  if (!id) return;

  const lead = leads.find(l => l.id === id);
  if (!lead || lead.status === newStatus) return;

  const oldStatus = lead.status;
  lead.status = newStatus;

  // Auto-log the status change in history
  lead.historico = lead.historico || [];
  lead.historico.unshift({
    id: uid(),
    data: new Date().toISOString(),
    tipo: 'Kanban',
    obs: `Status alterado de "${oldStatus}" para "${newStatus}".`,
  });

  saveLeads();
  renderAll();
  toast(`${lead.nome} movido para "${newStatus}"`, 'success');
}

/* ============================================================
   MODAL: CLIENTE (NEW / EDIT)
   ============================================================ */
function openNewModal() {
  $('modal-cliente-icon').textContent = '➕';
  $('modal-cliente-titulo').textContent = 'Novo Cliente';
  $('form-cliente').reset();
  $('campo-id').value = '';

  // Set default status
  $('campo-status').value = 'Novo lead';

  openModal('modal-cliente');
  setTimeout(() => $('campo-nome').focus(), 100);
}

function openEditModal(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;

  $('modal-cliente-icon').textContent = '✏️';
  $('modal-cliente-titulo').textContent = 'Editar Cliente';

  $('campo-id').value             = l.id;
  $('campo-nome').value           = l.nome           || '';
  $('campo-whatsapp').value       = l.whatsapp        || '';
  $('campo-origem').value         = l.origem          || '';
  $('campo-tipo').value           = l.tipo            || '';
  $('campo-regiao').value         = l.regiao          || '';
  $('campo-valor').value          = l.valor           || '';
  $('campo-status').value         = l.status          || '';
  $('campo-proxima-acao').value   = l.proximaAcao     || '';
  $('campo-data-retorno').value   = l.dataRetorno     || '';
  $('campo-observacoes').value    = l.observacoes     || '';

  openModal('modal-cliente');
  setTimeout(() => $('campo-nome').focus(), 100);
}

function saveCliente() {
  const nome = ($('campo-nome').value || '').trim();
  if (!nome) {
    $('campo-nome').focus();
    $('campo-nome').style.borderColor = '#e74c3c';
    setTimeout(() => { $('campo-nome').style.borderColor = ''; }, 2000);
    toast('Informe o nome do cliente.', 'error');
    return;
  }

  const id = $('campo-id').value;
  const data = {
    nome,
    whatsapp:    ($('campo-whatsapp').value    || '').trim(),
    origem:      $('campo-origem').value       || '',
    tipo:        $('campo-tipo').value         || '',
    regiao:      ($('campo-regiao').value      || '').trim(),
    valor:       ($('campo-valor').value       || '').trim(),
    status:      $('campo-status').value       || 'Novo lead',
    proximaAcao: ($('campo-proxima-acao').value || '').trim(),
    dataRetorno: $('campo-data-retorno').value || '',
    observacoes: ($('campo-observacoes').value || '').trim(),
  };

  if (id) {
    // Edit
    const idx = leads.findIndex(l => l.id === id);
    if (idx !== -1) {
      leads[idx] = { ...leads[idx], ...data };
      toast(`"${nome}" atualizado com sucesso!`, 'success');
    }
  } else {
    // New
    leads.unshift({
      id: uid(),
      ...data,
      historico: [],
      criadoEm: new Date().toISOString(),
    });
    toast(`"${nome}" cadastrado com sucesso!`, 'success');
  }

  saveLeads();
  closeModal('modal-cliente');
  renderAll();
}

/* ============================================================
   MODAL: HISTÓRICO
   ============================================================ */
function openHistorico(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;

  $('hist-lead-id').value    = l.id;
  $('hist-lead-nome').textContent = `👤 ${l.nome}`;
  $('hist-obs').value        = '';
  $('hist-tipo').value       = 'WhatsApp';

  renderHistoricoList(l);
  openModal('modal-historico');
}

function renderHistoricoList(l) {
  const lista = $('hist-lista');
  if (!lista) return;

  const hist = (l.historico || []).slice().sort((a, b) => new Date(b.data) - new Date(a.data));

  if (hist.length === 0) {
    lista.innerHTML = '<div class="history-empty">Nenhuma interação registrada ainda.</div>';
    return;
  }

  lista.innerHTML = hist.map(h => `
    <div class="history-item">
      <div class="history-meta">
        <span class="history-date">${fmtDatetime(h.data)}</span>
        <span class="history-tipo-badge">${esc(h.tipo)}</span>
      </div>
      <div class="history-obs-text">${esc(h.obs)}</div>
    </div>`).join('');
}

function salvarInteracao() {
  const id  = $('hist-lead-id').value;
  const obs = ($('hist-obs').value || '').trim();
  const tipo = $('hist-tipo').value || 'WhatsApp';

  if (!obs) {
    $('hist-obs').focus();
    toast('Descreva o que aconteceu nesta interação.', 'warning');
    return;
  }

  const l = leads.find(x => x.id === id);
  if (!l) return;

  l.historico = l.historico || [];
  l.historico.unshift({ id: uid(), data: new Date().toISOString(), tipo, obs });

  saveLeads();
  $('hist-obs').value = '';
  renderHistoricoList(l);
  toast('Interação registrada!', 'success');
}

/* ============================================================
   MODAL: CONFIRM DELETE
   ============================================================ */
function confirmDelete(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  deleteTargetId = id;
  $('confirm-text').textContent = `Isso vai remover "${l.nome}" e todo o histórico permanentemente.`;
  openModal('modal-confirm');
}

async function executeDelete() {
  if (!deleteTargetId) return;
  const l    = leads.find(x => x.id === deleteTargetId);
  const nome = l ? l.nome : 'Cliente';
  leads = leads.filter(x => x.id !== deleteTargetId);
  
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('leads').delete().eq('id', deleteTargetId);
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao deletar lead do Supabase:", e);
      toast("Erro de conexão ao remover da nuvem.", "error");
    }
  } else {
    saveLeadsLocal();
  }
  
  deleteTargetId = null;
  closeModal('modal-confirm');
  renderAll();
  toast(`"${nome}" removido.`, 'info');
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id) {
  const el = $(id);
  if (el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const el = $(id);
  if (el) { el.classList.add('hidden'); document.body.style.overflow = ''; }
}

/* ============================================================
   FILTERS: EVENT HANDLERS
   ============================================================ */
function setupFilters() {
  // Search with debounce
  let debounceTimer;
  $('filtro-busca').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filters.busca = e.target.value;
      renderAll();
    }, 220);
  });

  $('filtro-status').addEventListener('change', e => {
    filters.status = e.target.value;
    renderAll();
  });

  $('filtro-origem').addEventListener('change', e => {
    filters.origem = e.target.value;
    renderAll();
  });

  $('filtro-tipo').addEventListener('change', e => {
    filters.tipo = e.target.value;
    renderAll();
  });

  $('btn-retorno-hoje').addEventListener('click', () => {
    filters.retornoHoje = !filters.retornoHoje;
    filters.semAcao = false;
    $('btn-retorno-hoje').classList.toggle('btn-filter-active', filters.retornoHoje);
    $('btn-sem-acao').classList.remove('btn-filter-active');
    renderAll();
  });

  $('btn-sem-acao').addEventListener('click', () => {
    filters.semAcao = !filters.semAcao;
    filters.retornoHoje = false;
    $('btn-sem-acao').classList.toggle('btn-filter-active', filters.semAcao);
    $('btn-retorno-hoje').classList.remove('btn-filter-active');
    renderAll();
  });

  $('btn-limpar-filtros').addEventListener('click', clearFilters);
}

function clearFilters() {
  filters.busca       = '';
  filters.status      = '';
  filters.origem      = '';
  filters.tipo        = '';
  filters.retornoHoje = false;
  filters.semAcao     = false;

  $('filtro-busca').value   = '';
  $('filtro-status').value  = '';
  $('filtro-origem').value  = '';
  $('filtro-tipo').value    = '';
  $('btn-retorno-hoje').classList.remove('btn-filter-active');
  $('btn-sem-acao').classList.remove('btn-filter-active');

  renderAll();
}

/* ============================================================
   DASHBOARD CARD CLICK → FILTER
   ============================================================ */
function setupDashboardClicks() {
  document.querySelectorAll('.dash-card[data-filter-status]').forEach(card => {
    card.addEventListener('click', () => {
      const status = card.dataset.filterStatus;
      clearFilters();
      filters.status = status;
      $('filtro-status').value = status;
      renderAll();
      if (currentView === 'kanban') switchView('tabela');
    });
  });

  const retornoCard = $('card-retorno');
  if (retornoCard) {
    retornoCard.addEventListener('click', () => {
      clearFilters();
      filters.retornoHoje = true;
      $('btn-retorno-hoje').classList.add('btn-filter-active');
      renderAll();
    });
  }
}

/* ============================================================
   VIEW TOGGLE
   ============================================================ */
function switchView(view) {
  currentView = view;
  const isTabela  = view === 'tabela';

  $('view-tabela').style.display  = isTabela ? '' : 'none';
  $('view-kanban').style.display  = isTabela ? 'none' : '';

  $('btn-view-tabela').classList.toggle('active', isTabela);
  $('btn-view-kanban').classList.toggle('active', !isTabela);
  $('btn-view-tabela').setAttribute('aria-selected', isTabela);
  $('btn-view-kanban').setAttribute('aria-selected', !isTabela);

  if (!isTabela) renderKanban();
}

/* ============================================================
   CSV EXPORT
   ============================================================ */
function exportCSV() {
  if (leads.length === 0) {
    toast('Não há clientes para exportar.', 'warning');
    return;
  }

  const rows = [
    CSV_HEADERS.map(csvEsc).join(','),
    ...leads.map(l =>
      CSV_FIELDS.map(f => csvEsc(l[f] || '')).join(',')
    )
  ];

  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `loreny-crm-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast(`${leads.length} clientes exportados com sucesso!`, 'success');
}

/* ============================================================
   CSV IMPORT
   ============================================================ */
function importCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text  = e.target.result.replace(/^\uFEFF/, ''); // strip BOM
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length < 2) { toast('Arquivo CSV vazio ou inválido.', 'error'); return; }

      const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const row  = {};
        header.forEach((h, idx) => { row[h] = cols[idx] || ''; });

        const nome = (row['nome'] || '').trim();
        if (!nome) continue;

        // Map CSV headers to field names
        const lead = {
          id:          uid(),
          nome,
          whatsapp:    row['whatsapp']        || '',
          origem:      row['origem']           || '',
          tipo:        row['tipo de imóvel']   || row['tipo']  || '',
          regiao:      row['região/bairro']    || row['regiao'] || row['região'] || '',
          valor:       row['faixa de valor']   || row['valor'] || '',
          status:      row['status']           || 'Novo lead',
          proximaAcao: row['próxima ação']     || row['proxima acao'] || row['proximaacao'] || '',
          dataRetorno: row['data de retorno']  || row['dataretorno'] || '',
          observacoes: row['observações']      || row['observacoes'] || '',
          historico:   [],
          criadoEm:    row['criado em']        || new Date().toISOString(),
        };

        // Skip if status is invalid
        if (lead.status && !STATUS_CONFIG[lead.status]) lead.status = 'Novo lead';

        leads.push(lead);
        imported++;
      }

      saveLeads();
      renderAll();
      toast(`${imported} clientes importados com sucesso!`, 'success');
    } catch (err) {
      toast('Erro ao ler o arquivo CSV. Verifique o formato.', 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = $('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || '✅'}</span><span>${esc(msg)}</span>`;

  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, 3500);
}

/* ============================================================
   DOM HELPERS
   ============================================================ */
function $(id) { return document.getElementById(id); }
function setEl(id, val) { const el = $(id); if (el) el.textContent = val; }

/* ============================================================
   EVENT LISTENERS SETUP
   ============================================================ */
function setupEvents() {
  // Header buttons
  $('btn-novo-cliente').addEventListener('click', openNewModal);
  $('btn-exportar-csv').addEventListener('click', exportCSV);
  $('btn-importar-csv').addEventListener('click', () => $('input-csv-file').click());
  $('input-csv-file').addEventListener('change', e => {
    importCSV(e.target.files[0]);
    e.target.value = '';
  });

  // View toggle
  $('btn-view-tabela').addEventListener('click', () => switchView('tabela'));
  $('btn-view-kanban').addEventListener('click', () => switchView('kanban'));

  // Filters
  setupFilters();

  // Dashboard card clicks
  setupDashboardClicks();

  // Modal: Cliente
  $('btn-salvar-cliente').addEventListener('click', saveCliente);
  $('btn-cancelar-cliente').addEventListener('click', () => closeModal('modal-cliente'));
  $('btn-fechar-modal-cliente').addEventListener('click', () => closeModal('modal-cliente'));

  // Form: Enter to save
  $('form-cliente').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveCliente();
    }
  });

  // Modal: Histórico
  $('btn-salvar-interacao').addEventListener('click', salvarInteracao);
  $('btn-fechar-modal-hist').addEventListener('click', () => closeModal('modal-historico'));
  $('btn-fechar-hist').addEventListener('click', () => closeModal('modal-historico'));

  $('hist-obs').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); salvarInteracao(); }
  });

  // Modal: Confirm delete
  $('btn-confirm-excluir').addEventListener('click', executeDelete);
  $('btn-confirm-cancelar').addEventListener('click', () => closeModal('modal-confirm'));

  // Close modals clicking backdrop
  ['modal-cliente', 'modal-historico', 'modal-confirm', 'modal-supabase'].forEach(id => {
    $(id).addEventListener('click', e => {
      if (e.target === $(id)) closeModal(id);
    });
  });

  // Escape key closes any open modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['modal-cliente', 'modal-historico', 'modal-confirm', 'modal-supabase'].forEach(id => {
      if ($(id) && !$(id).classList.contains('hidden')) closeModal(id);
    });
  });

  // Modal: Supabase (Nuvem)
  $('btn-config-supabase').addEventListener('click', openSupabaseModal);
  $('btn-fechar-modal-supa').addEventListener('click', () => closeModal('modal-supabase'));
  $('btn-cancelar-supabase').addEventListener('click', () => closeModal('modal-supabase'));
  $('btn-salvar-supabase').addEventListener('click', testAndSaveSupabase);
  $('btn-desconectar-supabase').addEventListener('click', disconnectSupabase);
  $('btn-sincronizar-leads').addEventListener('click', syncLocalToSupabase);
}

/* ============================================================
   SUPABASE HELPER FUNCTIONS
   ============================================================ */
function openSupabaseModal() {
  $('supa-url').value = localStorage.getItem('loreny_crm_supabase_url') || '';
  $('supa-key').value = localStorage.getItem('loreny_crm_supabase_key') || '';
  
  // Show sync box if offline leads exist and we are currently connected to Supabase
  $('supa-sync-box').classList.add('hidden');
  if (supabaseClient) {
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (localRaw) {
      const localLeads = JSON.parse(localRaw);
      if (localLeads && localLeads.length > 0) {
        $('supa-sync-box').classList.remove('hidden');
      }
    }
  }
  
  openModal('modal-supabase');
  setTimeout(() => $('supa-url').focus(), 100);
}

async function testAndSaveSupabase() {
  const url = ($('supa-url').value || '').trim();
  const key = ($('supa-key').value || '').trim();
  
  if (!url || !key) {
    toast("Preencha todos os campos do Supabase.", "warning");
    return;
  }
  
  try {
    toast("Testando conexão com o Supabase...", "info");
    
    // Create a temporary client
    const tempClient = window.supabase.createClient(url, key);
    
    // Attempt a simple select query to check if credentials are valid and 'leads' table exists
    const { data, error } = await tempClient.from('leads').select('id').limit(1);
    if (error) throw error;
    
    // Connection successful! Save credentials
    localStorage.setItem('loreny_crm_supabase_url', url);
    localStorage.setItem('loreny_crm_supabase_key', key);
    
    supabaseClient = tempClient;
    updateSupabaseUI(true);
    
    toast("Supabase conectado com sucesso! 🟢", "success");
    
    // Show sync box if offline leads exist
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (localRaw) {
      const localLeads = JSON.parse(localRaw);
      if (localLeads && localLeads.length > 0) {
        $('supa-sync-box').classList.remove('hidden');
      }
    }
    
    closeModal('modal-supabase');
    
    // Load leads from Supabase and render
    await loadLeads();
    renderAll();
  } catch (e) {
    console.error("Erro de conexão com o Supabase:", e);
    toast("Falha na conexão. Verifique a URL, Anon Key e se a tabela 'leads' existe no banco.", "error");
  }
}

function disconnectSupabase() {
  localStorage.removeItem('loreny_crm_supabase_url');
  localStorage.removeItem('loreny_crm_supabase_key');
  supabaseClient = null;
  updateSupabaseUI(false);
  
  $('supa-url').value = '';
  $('supa-key').value = '';
  $('supa-sync-box').classList.add('hidden');
  
  toast("Desconectado da nuvem. Usando modo offline local.", "info");
  closeModal('modal-supabase');
  
  // Reload local storage data
  loadLeadsLocal();
  renderAll();
}

async function syncLocalToSupabase() {
  if (!supabaseClient) {
    toast("Supabase não conectado.", "warning");
    return;
  }
  
  try {
    toast("Sincronizando leads locais com a nuvem...", "info");
    
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (!localRaw) {
      toast("Nenhum dado local encontrado para sincronizar.", "info");
      return;
    }
    
    const localLeads = JSON.parse(localRaw);
    if (!localLeads || localLeads.length === 0) {
      toast("Nenhum cliente local para sincronizar.", "info");
      return;
    }
    
    const dbLeads = localLeads.map(l => ({
      id:           l.id,
      nome:         l.nome,
      whatsapp:     l.whatsapp || '',
      origem:       l.origem || '',
      tipo:         l.tipo || '',
      regiao:       l.regiao || '',
      valor:        l.valor || '',
      status:       l.status || 'Novo lead',
      proxima_acao: l.proximaAcao || '',
      data_retorno: l.dataRetorno || '',
      observacoes:  l.observacoes || '',
      historico:    l.historico || [],
      criado_em:    l.criadoEm || new Date().toISOString()
    }));
    
    const { error } = await supabaseClient.from('leads').upsert(dbLeads);
    if (error) throw error;
    
    // Clear the local leads from localStorage since they are now on Supabase
    localStorage.removeItem(STORAGE_KEY);
    
    toast(`${localLeads.length} leads sincronizados com sucesso! ⚡`, "success");
    $('supa-sync-box').classList.add('hidden');
    
    // Refresh leads from Supabase and render
    await loadLeads();
    renderAll();
  } catch (e) {
    console.error("Erro na sincronização:", e);
    toast("Falha ao sincronizar dados locais com a nuvem.", "error");
  }
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  const isSupaActive = initSupabase();
  updateSupabaseUI(isSupaActive);
  
  await loadLeads();
  setupEvents();
  renderAll();

  // Show a welcome toast on first load
  const isFirst = !localStorage.getItem('loreny_crm_welcomed');
  if (isFirst) {
    localStorage.setItem('loreny_crm_welcomed', '1');
    setTimeout(() => toast('Bem-vinda ao CRM Loreny Imóveis! 🏠', 'success'), 600);
  }
}

document.addEventListener('DOMContentLoaded', init);
