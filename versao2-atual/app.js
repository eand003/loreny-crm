/* ============================================================
   CRM Loreny Imóveis — app.js
   Lógica completa: CRUD, filtros, kanban, histórico, CSV
   ============================================================ */

'use strict';

// Captura de Erros Global — Mostra alertas visíveis para depuração rápida
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error:", message, "at", source, ":", lineno);
  alert("Erro no CRM: " + message + " (Linha " + lineno + ")");
  return false;
};

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
   WHATSAPP TEMPLATES ✨
   ============================================================ */
const WA_TEMPLATES_DEFAULTS = [
  {
    id: "wa-apresentacao",
    title: "Apresentação",
    desc: "Primeiro contato com o lead",
    text: "Olá, {nome}! Aqui é a Loreny, tudo bem? Vi seu interesse no imóvel ({tipo}) na região de {regiao}. Como posso te ajudar na sua busca hoje?"
  },
  {
    id: "wa-visita",
    title: "Visita",
    desc: "Confirmar agendamento de visita",
    text: "Oi, {nome}! Gostaria de confirmar nossa visita ao imóvel no bairro {regiao}. Qual o melhor horário para você: na parte da manhã ou da tarde?"
  },
  {
    id: "wa-acompanhamento",
    title: "Acompanhamento",
    desc: "Follow-up das opções enviadas",
    text: "Olá, {nome}! Passando para saber se conseguiu analisar as opções de {tipo} que te enviei. Ficou alguma dúvida sobre as condições ou valores?"
  },
  {
    id: "wa-novas-opcoes",
    title: "Novas Opções",
    desc: "Novidades dentro do perfil",
    text: "Oi, {nome}! Acabaram de entrar novas opções de {tipo} na faixa de {valor} na região de {regiao} que se encaixam exatamente no que procura. Posso te enviar as fotos?"
  }
];

let waTemplates = [];

async function loadWaTemplates() {
  try {
    if (supabaseClient && currentUser) {
      const { data, error } = await supabaseClient
        .from('wa_templates')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('criado_em', { ascending: true });
      
      if (error) throw error;

      if (data && data.length > 0) {
        waTemplates = data.map(t => ({
          id:   t.id,
          title: t.title,
          desc:  t.description || '',
          text:  t.text_content
        }));
      } else {
        const raw = localStorage.getItem('loreny_crm_wa_templates');
        waTemplates = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(WA_TEMPLATES_DEFAULTS));
        await saveWaTemplatesToStorage();
      }
    } else {
      const raw = localStorage.getItem('loreny_crm_wa_templates');
      if (raw) {
        waTemplates = JSON.parse(raw);
      } else {
        waTemplates = JSON.parse(JSON.stringify(WA_TEMPLATES_DEFAULTS));
        saveWaTemplatesToStorage();
      }
    }
  } catch (e) {
    console.error("Erro ao carregar templates do Supabase, usando local:", e);
    const raw = localStorage.getItem('loreny_crm_wa_templates');
    waTemplates = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(WA_TEMPLATES_DEFAULTS));
    saveWaTemplatesToStorage();
  }
}

async function saveWaTemplatesToStorage() {
  localStorage.setItem('loreny_crm_wa_templates', JSON.stringify(waTemplates));
  
  if (supabaseClient && currentUser) {
    try {
      const dbTemplates = waTemplates.map((t, idx) => ({
        id:           t.id || uid(),
        user_id:      currentUser.id,
        title:        t.title,
        description:  t.desc || '',
        text_content: t.text,
        criado_em:    t.criado_em || new Date(Date.now() + idx * 1000).toISOString()
      }));

      waTemplates.forEach((t, idx) => {
        if (!t.id) t.id = dbTemplates[idx].id;
      });
      localStorage.setItem('loreny_crm_wa_templates', JSON.stringify(waTemplates));

      const { error } = await supabaseClient
        .from('wa_templates')
        .upsert(dbTemplates);
      
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao sincronizar templates com o Supabase:", e);
      toast('Não consegui salvar os modelos na nuvem.', 'warning');
    }
  }
}


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
// Credenciais centrais do Supabase (SaaS Comercial).
// Deixe vazias ou como placeholders "SUA_SUPABASE..." para testar localmente.
// Quando preenchidas com chaves reais, o botão "☁️ Nuvem" é ocultado automaticamente dos corretores.
const MASTER_SUPABASE_URL = "https://bcaltkoimnapblaiykaw.supabase.co"; 
const MASTER_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYWx0a29pbW5hcGJsYWl5a2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzkxNzUsImV4cCI6MjA5NDk1NTE3NX0.q7LGWM3NKb-q--XwjZRi3OhBGDaptTJxo2rBYcMjfNc";

let supabaseClient = null;
let currentUser = null;
let realtimeChannel = null;
let authListener = null;

function sanitizeSupabaseUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/, ''); // strips /rest/v1 or /rest/v1/
  clean = clean.replace(/\/+$/, ''); // strips trailing slashes
  return clean;
}

function initSupabase() {
  let url = MASTER_SUPABASE_URL;
  let key = MASTER_SUPABASE_KEY;

  const isHardcoded = url && !url.includes("SUA_SUPABASE") && key && !key.includes("SUA_SUPABASE");

  if (!isHardcoded) {
    url = localStorage.getItem('loreny_crm_supabase_url');
    key = localStorage.getItem('loreny_crm_supabase_key');
  }

  if (url && key && window.supabase) {
    url = sanitizeSupabaseUrl(url);
    try {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
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
  const authBtn   = $('btn-auth-account');
  const authBox   = $('auth-status-box');

  const isHardcoded = MASTER_SUPABASE_URL && !MASTER_SUPABASE_URL.includes("SUA_SUPABASE") && MASTER_SUPABASE_KEY && !MASTER_SUPABASE_KEY.includes("SUA_SUPABASE");

  // Ocultar botão de configuração do banco se estiver rodando no modo SaaS comercial
  if (supaBtn) {
    if (isHardcoded) {
      supaBtn.style.display = 'none';
    } else {
      supaBtn.style.display = '';
    }
  }

  if (connected) {
    if (indicator) indicator.textContent = currentUser ? '🟢' : '🟠';
    if (text) text.textContent = currentUser
      ? `Conectado como ${currentUser.email}`
      : 'Supabase conectado — faça login para carregar os dados';
    if (supaBtn && !isHardcoded) {
      supaBtn.innerHTML = currentUser ? '☁️ Online' : '☁️ Conectar Login';
      supaBtn.style.color = currentUser ? '#27ae60' : '#f39c12';
    }
    if (authBtn) {
      authBtn.classList.remove('hidden');
      authBtn.innerHTML = currentUser ? '👤 Conta' : '🔐 Login';
    }
    if (authBox) authBox.textContent = currentUser ? `Logado: ${currentUser.email}` : 'Sem login ativo';
  } else {
    if (indicator) indicator.textContent = '🟡';
    if (text) text.textContent = 'Usando armazenamento local (Offline)';
    if (supaBtn && !isHardcoded) {
      supaBtn.innerHTML = '☁️ Nuvem';
      supaBtn.style.color = '';
    }
    if (authBtn) {
      authBtn.classList.remove('hidden');
      authBtn.innerHTML = '🔐 Login';
    }
    if (authBox) authBox.textContent = 'Modo local/offline';
  }
}

async function refreshCurrentUser() {
  if (!supabaseClient) {
    currentUser = null;
    updateSupabaseUI(false);
    return null;
  }
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    currentUser = data.session?.user || null;
    updateSupabaseUI(true);
    return currentUser;
  } catch (e) {
    console.error('Erro ao recuperar sessão:', e);
    currentUser = null;
    updateSupabaseUI(true);
    return null;
  }
}

function setupAuthListener() {
  if (!supabaseClient || authListener) return;
  const { data } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateSupabaseUI(!!supabaseClient);
    await loadWaTemplates();
    await loadLeads();
    setupRealtime();
    renderAll();
  });
  authListener = data?.subscription || null;
}

function requireAuthForCloud() {
  if (supabaseClient && !currentUser) {
    openAuthModal('login');
    toast('Faça login para acessar os dados na nuvem.', 'warning');
    return false;
  }
  return true;
}

function openAuthModal(mode = 'login') {
  if (!$('modal-auth')) return;
  
  if (currentUser) {
    // Show logged-in pane
    $('auth-pane-logged-in').classList.remove('hidden');
    $('auth-pane-logged-out').classList.add('hidden');
    $('auth-title').textContent = 'Sua Conta';
    $('auth-logged-email').textContent = currentUser.email || 'Conectado';
    $('auth-logged-leads-count').textContent = leads.length;
  } else {
    // Show login form
    $('auth-pane-logged-in').classList.add('hidden');
    $('auth-pane-logged-out').classList.remove('hidden');
    $('auth-email').value = localStorage.getItem('loreny_crm_last_email') || '';
    $('auth-password').value = '';
    setAuthMode(mode);
  }
  openModal('modal-auth');
  if (!currentUser) {
    setTimeout(() => $('auth-email').focus(), 100);
  }
}

function showAuthLoginForm(mode = 'login') {
  $('auth-pane-logged-in').classList.add('hidden');
  $('auth-pane-logged-out').classList.remove('hidden');
  $('auth-title').textContent = 'Entrar no CRM';
  $('auth-email').value = '';
  $('auth-password').value = '';
  setAuthMode(mode);
  setTimeout(() => $('auth-email').focus(), 100);
}

function setAuthMode(mode) {
  const isSignup = mode === 'signup';
  $('auth-mode').value = mode;
  $('auth-title').textContent = isSignup ? 'Criar acesso' : 'Entrar no CRM';
  $('auth-primary-btn').textContent = isSignup ? 'Criar conta' : 'Entrar';
  $('auth-switch-text').textContent = isSignup ? 'Já tem conta?' : 'Ainda não tem conta?';
  $('auth-switch-btn').textContent = isSignup ? 'Entrar' : 'Criar acesso';
}

async function submitAuth() {
  if (!supabaseClient) {
    toast('Conecte o Supabase primeiro.', 'warning');
    closeModal('modal-auth');
    openSupabaseModal();
    return;
  }
  const email = ($('auth-email').value || '').trim();
  const password = ($('auth-password').value || '').trim();
  const mode = $('auth-mode').value || 'login';
  if (!email || !password) {
    toast('Preencha e-mail e senha.', 'warning');
    return;
  }
  if (password.length < 6) {
    toast('A senha precisa ter pelo menos 6 caracteres.', 'warning');
    return;
  }
  try {
    localStorage.setItem('loreny_crm_last_email', email);
    const result = mode === 'signup'
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    await refreshCurrentUser();
    closeModal('modal-auth');
    await loadWaTemplates();
    await loadLeads();
    setupRealtime();
    renderAll();
    toast(mode === 'signup' ? 'Conta criada! Verifique o e-mail se o Supabase pedir confirmação.' : 'Login realizado com sucesso!', 'success');
  } catch (e) {
    console.error('Erro de autenticação:', e);
    toast(e.message || 'Falha no login. Confira e-mail e senha.', 'error');
  }
}

async function signOutAuth() {
  currentUser = null;
  leads = [];
  waTemplates = JSON.parse(JSON.stringify(WA_TEMPLATES_DEFAULTS));
  teardownRealtime();
  updateSupabaseUI(true);
  renderAll();
  closeModal('modal-auth');
  
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.error('Erro de rede ou banco ao sair do Supabase:', e);
    }
  }
  toast('Você saiu da conta.', 'info');
}

function teardownRealtime() {
  if (supabaseClient && realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
}

function setupRealtime() {
  teardownRealtime();
  if (!supabaseClient || !currentUser) return;
  try {
    realtimeChannel = supabaseClient
      .channel(`crm-loreny-leads-${currentUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${currentUser.id}`
      }, async () => {
        await loadLeads();
        renderAll();
      })
      .subscribe();
  } catch (e) {
    console.error('Erro ao ativar Realtime:', e);
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
    if (!currentUser) {
      leads = [];
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      
      leads = (data || []).map(l => ({
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
    if (!currentUser) {
      toast('Faça login para salvar na nuvem.', 'warning');
      return;
    }
    try {
      const dbLeads = leads.map(l => ({
        id:           l.id,
        user_id:      currentUser.id,
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
    const wa    = l.whatsapp ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="action-btn btn-wa" title="Abrir WhatsApp Direto">💬</a><button class="action-btn btn-wa-templates" onclick="openWaTemplates('${l.id}')" title="Modelos Rápidos ✨">✨</button>` : '';

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
          ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="btn btn-sm btn-success" title="Abrir WhatsApp Direto">💬 WhatsApp</a>
             <button class="btn btn-sm btn-gold" onclick="openWaTemplates('${l.id}')" title="Modelos Rápidos ✨">✨ Modelo</button>`
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
        ? `<a href="${waUrl(l.whatsapp)}" target="_blank" rel="noopener" class="action-btn btn-wa" title="Abrir WhatsApp Direto">💬</a>
           <button class="action-btn btn-wa-templates" onclick="openWaTemplates('${l.id}')" title="Modelos Rápidos ✨">✨</button>`
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
   MOBILE BOTTOM NAV STATE SYNC
   ============================================================ */
function updateMobileBottomNav() {
  const navRetorno = $('mobile-nav-retorno');
  const navKanban = $('mobile-nav-kanban');
  const navAlertas = $('mobile-nav-alertas');

  if (navRetorno) {
    navRetorno.classList.toggle('active', !!filters.retornoHoje);
  }
  if (navKanban) {
    const isKanban = currentView === 'kanban';
    navKanban.classList.toggle('active', isKanban);
    
    // Smoothly swap icon and text based on active view!
    const label = navKanban.querySelector('small');
    const icon = navKanban.querySelector('span');
    if (isKanban) {
      if (label) label.textContent = 'Tabela';
      if (icon) icon.textContent = '☰';
    } else {
      if (label) label.textContent = 'Kanban';
      if (icon) icon.textContent = '⬛';
    }
  }
  if (navAlertas) {
    const dropdown = $('alerts-dropdown');
    const isOpen = dropdown && !dropdown.classList.contains('hidden');
    navAlertas.classList.toggle('active', !!isOpen);
  }
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
  updateAlerts();
  updateMobileBottomNav();
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
      const { error } = await supabaseClient.from('leads').delete().eq('id', deleteTargetId).eq('user_id', currentUser.id);
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
  ['modal-cliente', 'modal-historico', 'modal-confirm', 'modal-supabase', 'modal-wa-templates', 'modal-auth'].forEach(id => {
    $(id).addEventListener('click', e => {
      if (e.target === $(id)) closeModal(id);
    });
  });

  // Escape key closes any open modal or dropdown
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['modal-cliente', 'modal-historico', 'modal-confirm', 'modal-supabase', 'modal-wa-templates', 'modal-auth'].forEach(id => {
      if ($(id) && !$(id).classList.contains('hidden')) closeModal(id);
    });
    // Also close alerts dropdown on Escape
    const dropdown = $('alerts-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  });

  // Modal: Supabase (Nuvem)
  $('btn-config-supabase').addEventListener('click', openSupabaseModal);
  $('btn-fechar-modal-supa').addEventListener('click', () => closeModal('modal-supabase'));
  $('btn-cancelar-supabase').addEventListener('click', () => closeModal('modal-supabase'));
  $('btn-salvar-supabase').addEventListener('click', testAndSaveSupabase);
  $('btn-desconectar-supabase').addEventListener('click', disconnectSupabase);
  $('btn-sincronizar-leads').addEventListener('click', syncLocalToSupabase);

  // Auth
  $('btn-auth-account').addEventListener('click', () => openAuthModal(currentUser ? 'login' : 'login'));
  $('btn-fechar-modal-auth').addEventListener('click', () => closeModal('modal-auth'));
  $('auth-primary-btn').addEventListener('click', submitAuth);
  $('auth-switch-btn').addEventListener('click', () => setAuthMode($('auth-mode').value === 'signup' ? 'login' : 'signup'));
  $('btn-auth-logout-action').addEventListener('click', signOutAuth);
  $('btn-auth-switch-account').addEventListener('click', () => showAuthLoginForm('login'));
  $('btn-auth-cancel-out').addEventListener('click', () => closeModal('modal-auth'));
  $('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });

  // Mobile bottom nav
  $('mobile-nav-new').addEventListener('click', openNewModal);
  $('mobile-nav-retorno').addEventListener('click', () => {
    const isToday = filters.retornoHoje;
    clearFilters();
    if (!isToday) {
      filters.retornoHoje = true;
      $('btn-retorno-hoje').classList.add('btn-filter-active');
    }
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('mobile-nav-kanban').addEventListener('click', () => { 
    switchView(currentView === 'kanban' ? 'tabela' : 'kanban'); 
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  });
  $('mobile-nav-alertas').addEventListener('click', e => { 
    e.stopPropagation(); 
    $('alerts-dropdown').classList.toggle('hidden'); 
    updateMobileBottomNav();
  });

  // Modal: WhatsApp templates
  $('btn-fechar-modal-wa').addEventListener('click', () => closeModal('modal-wa-templates'));
  $('btn-cancelar-wa').addEventListener('click', () => closeModal('modal-wa-templates'));
  $('btn-copiar-wa').addEventListener('click', copiarWaText);
  $('btn-enviar-wa').addEventListener('click', enviarWaMessage);

  // Toggle dynamic templates manager panes
  $('btn-wa-toggle-pane').addEventListener('click', () => switchWaPane(true));
  $('btn-wa-back-to-send').addEventListener('click', () => switchWaPane(false));
  $('btn-wa-restore-defaults').addEventListener('click', restoreWaTemplatesDefaults);
  $('btn-wa-form-clear').addEventListener('click', clearWaForm);
  $('btn-wa-form-save').addEventListener('click', saveWaTemplate);

  // Wire up variable badges click inside custom text editor
  document.querySelectorAll('.wa-var-badge').forEach(btn => {
    btn.addEventListener('click', () => {
      insertVarAtCursor(btn.dataset.var);
    });
  });

  // Central de Alertas 🔔: Toggle dropdown
  $('btn-alertas').addEventListener('click', e => {
    e.stopPropagation();
    $('alerts-dropdown').classList.toggle('hidden');
    updateMobileBottomNav();
  });

  // Close button inside dropdown
  $('btn-fechar-alertas').addEventListener('click', e => {
    e.stopPropagation();
    $('alerts-dropdown').classList.add('hidden');
    updateMobileBottomNav();
  });

  // Close alerts dropdown when clicking outside
  document.addEventListener('click', e => {
    const container = document.querySelector('.alertas-container');
    if (container && !container.contains(e.target)) {
      const dropdown = $('alerts-dropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        updateMobileBottomNav();
      }
    }
  });
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
  let url = ($('supa-url').value || '').trim();
  const key = ($('supa-key').value || '').trim();
  
  if (!url || !key) {
    toast("Preencha todos os campos do Supabase.", "warning");
    return;
  }
  
  url = sanitizeSupabaseUrl(url);
  
  try {
    toast("Testando conexão com o Supabase...", "info");
    
    // Create a temporary client
    const tempClient = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    
    // Attempt a simple select query to check if credentials are valid and 'leads' table exists
    const { data, error } = await tempClient.from('leads').select('id').limit(1);
    if (error) throw error;
    
    // Connection successful! Save credentials
    localStorage.setItem('loreny_crm_supabase_url', url);
    localStorage.setItem('loreny_crm_supabase_key', key);
    
    supabaseClient = tempClient;
    authListener = null;
    setupAuthListener();
    await refreshCurrentUser();
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
    if (!currentUser) { openAuthModal('login'); }
    
    // Load templates and leads from Supabase and render
    await loadWaTemplates();
    await loadLeads();
    renderAll();
  } catch (e) {
    console.error("Erro de conexão com o Supabase:", e);
    toast("Falha na conexão. Verifique a URL, Anon Key e se a tabela 'leads' existe no banco.", "error");
  }
}

async function disconnectSupabase() {
  localStorage.removeItem('loreny_crm_supabase_url');
  localStorage.removeItem('loreny_crm_supabase_key');
  teardownRealtime();
  currentUser = null;
  authListener = null;
  supabaseClient = null;
  updateSupabaseUI(false);
  
  $('supa-url').value = '';
  $('supa-key').value = '';
  $('supa-sync-box').classList.add('hidden');
  
  toast("Desconectado da nuvem. Usando modo offline local.", "info");
  closeModal('modal-supabase');
  
  // Reload local storage data
  await loadWaTemplates();
  loadLeadsLocal();
  renderAll();
}

async function syncLocalToSupabase() {
  if (!supabaseClient) {
    toast("Supabase não conectado.", "warning");
    return;
  }
  if (!currentUser) {
    openAuthModal('login');
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
      user_id:      currentUser.id,
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
   WHATSAPP QUICK REPLIES ✨ LOGIC
   ============================================================ */
/* ============================================================
   WHATSAPP QUICK REPLIES ✨ LOGIC
   ============================================================ */
function openWaTemplates(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;

  $('wa-lead-id').value = leadId;
  $('wa-lead-nome').textContent = `👤 Lead: ${lead.nome} (${lead.whatsapp || 'sem número'})`;

  // Retorna para o painel de envio e esconde o painel de gerenciamento
  switchWaPane(false);

  // Renderiza o grid de templates
  renderWaTemplatesGrid();

  if (waTemplates.length > 0) {
    selectWaTemplate(0);
  } else {
    $('wa-preview-text').value = '';
  }

  openModal('modal-wa-templates');
}

function renderWaTemplatesGrid() {
  const container = $('wa-templates-list-grid');
  if (!container) return;

  if (waTemplates.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">Nenhum modelo cadastrado. Clique em "⚙️ Personalizar" para criar!</div>`;
    $('wa-preview-text').value = '';
    return;
  }

  const getIcon = (title, idx) => {
    const titles = {
      'apresentação': '✨',
      'visita': '📅',
      'acompanhamento': '📈',
      'novas opções': '🏠'
    };
    const t = (title || '').toLowerCase().trim();
    if (titles[t]) return titles[t];
    const icons = ['💬', '✉️', '🚀', '🔑', '🎯', '📢'];
    return icons[idx % icons.length];
  };

  container.innerHTML = waTemplates.map((t, idx) => `
    <div class="wa-template-card" data-template-idx="${idx}">
      <span class="template-card-icon">${getIcon(t.title, idx)}</span>
      <div class="template-card-info">
        <span class="template-card-title" title="${esc(t.title)}">${esc(t.title)}</span>
        <span class="template-card-desc" title="${esc(t.desc)}">${esc(t.desc) || 'Sem descrição'}</span>
      </div>
    </div>
  `).join('');

  // Adiciona os event listeners aos cards gerados
  container.querySelectorAll('.wa-template-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.templateIdx, 10);
      selectWaTemplate(idx);
    });
  });
}

function selectWaTemplate(idx) {
  document.querySelectorAll('.wa-template-card').forEach((c, i) => {
    c.classList.toggle('active', i === idx);
  });
  updateWaPreview(idx);
}

function updateWaPreview(templateIdx) {
  const leadId = $('wa-lead-id').value;
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;

  const tmpl = waTemplates[templateIdx];
  if (!tmpl) {
    $('wa-preview-text').value = '';
    return;
  }
  const formattedText = fillTemplateVariables(tmpl.text, lead, templateIdx);
  $('wa-preview-text').value = formattedText;
}

function fillTemplateVariables(text, lead, templateIdx) {
  const firstName = lead.nome ? lead.nome.trim().split(/\s+/)[0] : 'Cliente';
  
  let tipoFallback = 'imóvel';
  if (templateIdx === 2) { // Acompanhamento / Follow-up
    tipoFallback = 'imóveis';
  }
  const tipo = lead.tipo ? lead.tipo.toLowerCase() : tipoFallback;
  
  const regiao = lead.regiao ? lead.regiao.trim() : 'excelente região';
  const valor = lead.valor ? lead.valor.trim() : 'sua faixa de interesse';
  
  return text
    .replace(/{nome}/g, firstName)
    .replace(/{tipo}/g, tipo)
    .replace(/{regiao}/g, regiao)
    .replace(/{valor}/g, valor);
}

function copiarWaText() {
  const text = $('wa-preview-text').value;
  if (!text) {
    toast('Nenhum texto para copiar.', 'warning');
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => toast('Texto copiado com sucesso! ✨', 'success'))
    .catch(err => {
      console.error('Falha ao copiar texto:', err);
      toast('Erro ao copiar texto.', 'error');
    });
}

function enviarWaMessage() {
  const leadId = $('wa-lead-id').value;
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;

  const text = $('wa-preview-text').value;
  if (!text) {
    toast('Escreva uma mensagem antes de enviar.', 'warning');
    return;
  }

  if (!lead.whatsapp) {
    toast('Este lead não possui número de WhatsApp cadastrado.', 'warning');
    return;
  }

  const activeCard = document.querySelector('.wa-template-card.active');
  const tmplIdx = activeCard ? parseInt(activeCard.dataset.templateIdx, 10) : -1;
  const tmplTitle = waTemplates[tmplIdx] ? waTemplates[tmplIdx].title : 'Personalizado';

  lead.historico = lead.historico || [];
  lead.historico.unshift({
    id: uid(),
    data: new Date().toISOString(),
    tipo: 'WhatsApp',
    obs: `Envio rápido ("${tmplTitle}"): "${text.substring(0, 80)}..."`
  });

  saveLeads();

  const digits = cleanPhone(lead.whatsapp);
  const full = digits.startsWith('55') ? digits : '55' + digits;
  const url = `https://wa.me/${full}?text=${encodeURIComponent(text)}`;

  window.open(url, '_blank', 'noopener');
  closeModal('modal-wa-templates');
  renderAll();
}

/* ---- WhatsApp Management logic ---- */
function switchWaPane(showManage) {
  const sendPane = $('wa-pane-send');
  const managePane = $('wa-pane-manage');
  const footerSend = $('wa-footer-send');
  const footerManage = $('wa-footer-manage');
  const toggleBtn = $('btn-wa-toggle-pane');
  const modalTitle = $('modal-wa-title');

  if (showManage) {
    sendPane.classList.add('hidden');
    managePane.classList.remove('hidden');
    footerSend.classList.add('hidden');
    footerManage.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
    modalTitle.textContent = '⚙️ Personalizar Modelos';
    
    clearWaForm();
    renderWaManageList();
  } else {
    sendPane.classList.remove('hidden');
    managePane.classList.add('hidden');
    footerSend.classList.remove('hidden');
    footerManage.classList.add('hidden');
    toggleBtn.classList.remove('hidden');
    modalTitle.textContent = '✨ Mensagem Rápida (WhatsApp)';
    
    renderWaTemplatesGrid();
    if (waTemplates.length > 0) {
      selectWaTemplate(0);
    }
  }
}

function renderWaManageList() {
  const container = $('wa-manage-list-container');
  if (!container) return;

  if (waTemplates.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.85rem; border: 1px dashed var(--border); border-radius: 8px;">Nenhum modelo cadastrado. Crie um abaixo!</div>`;
    return;
  }

  container.innerHTML = waTemplates.map((t, idx) => `
    <div class="wa-manage-item" style="animation: fadeInUp 0.15s ease both;">
      <div class="wa-item-info">
        <span class="wa-item-title" title="${esc(t.title)}">${esc(t.title)}</span>
        <span class="wa-item-desc" title="${esc(t.desc)}">${esc(t.desc) || 'Sem descrição curta'}</span>
      </div>
      <div class="wa-item-actions">
        <button class="wa-item-btn edit" onclick="editWaTemplate(${idx})" title="Editar modelo" type="button">✏️</button>
        <button class="wa-item-btn del" onclick="deleteWaTemplate(${idx})" title="Excluir modelo" type="button">🗑️</button>
      </div>
    </div>
  `).join('');
}

function clearWaForm() {
  $('wa-form-idx').value = '';
  $('wa-form-title-input').value = '';
  $('wa-form-desc-input').value = '';
  $('wa-form-text-input').value = '';
  $('wa-form-title').innerHTML = '➕ Criar Novo Modelo';
}

window.editWaTemplate = function(idx) {
  const t = waTemplates[idx];
  if (!t) return;

  $('wa-form-idx').value = idx;
  $('wa-form-title-input').value = t.title || '';
  $('wa-form-desc-input').value = t.desc || '';
  $('wa-form-text-input').value = t.text || '';
  $('wa-form-title').innerHTML = `✏️ Editar Modelo: ${esc(t.title)}`;
  
  $('wa-form-title-input').focus();
};

window.deleteWaTemplate = async function(idx) {
  const t = waTemplates[idx];
  if (!t) return;

  if (confirm(`Excluir permanentemente o modelo "${t.title}"?`)) {
    const deletedId = t.id;
    waTemplates.splice(idx, 1);
    await saveWaTemplatesToStorage();
    
    if (supabaseClient && deletedId) {
      try {
        const { error } = await supabaseClient
          .from('wa_templates')
          .delete()
          .eq('id', deletedId)
          .eq('user_id', currentUser.id);
        if (error) throw error;
      } catch (e) {
        console.error("Erro ao deletar template do Supabase:", e);
      }
    }
    
    renderWaManageList();
    toast(`Modelo "${t.title}" excluído!`, 'info');
    clearWaForm();
  }
};

async function saveWaTemplate() {
  const title = ($('wa-form-title-input').value || '').trim();
  const desc = ($('wa-form-desc-input').value || '').trim();
  const text = ($('wa-form-text-input').value || '').trim();

  if (!title) {
    $('wa-form-title-input').focus();
    toast('Preencha o título do modelo.', 'warning');
    return;
  }
  if (!text) {
    $('wa-form-text-input').focus();
    toast('Preencha o texto da mensagem.', 'warning');
    return;
  }

  const idxVal = $('wa-form-idx').value;
  const idx = idxVal !== '' ? parseInt(idxVal, 10) : -1;
  const existingId = idx !== -1 ? waTemplates[idx].id : uid();
  const tData = { id: existingId, title, desc, text };

  if (idx !== -1) {
    waTemplates[idx] = tData;
    toast(`Modelo "${title}" atualizado!`, 'success');
  } else {
    waTemplates.push(tData);
    toast(`Novo modelo "${title}" criado!`, 'success');
  }

  await saveWaTemplatesToStorage();
  clearWaForm();
  renderWaManageList();
}

async function restoreWaTemplatesDefaults() {
  if (confirm('Deseja restaurar todos os modelos originais premium? Isso apagará suas edições e modelos criados.')) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('wa_templates')
          .delete()
          .eq('user_id', currentUser.id)
          .neq('id', 'placeholder');
        if (error) throw error;
      } catch (e) {
        console.error("Erro ao limpar templates no Supabase:", e);
      }
    }
    
    waTemplates = JSON.parse(JSON.stringify(WA_TEMPLATES_DEFAULTS));
    await saveWaTemplatesToStorage();
    renderWaManageList();
    clearWaForm();
    toast('Modelos originais restaurados!', 'success');
  }
}

function insertVarAtCursor(varName) {
  const textarea = $('wa-form-text-input');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + varName + text.substring(end);
  
  textarea.selectionStart = textarea.selectionEnd = start + varName.length;
  textarea.focus();
}

/* ============================================================
   CENTRAL DE ALERTAS 🔔 LOGIC
   ============================================================ */
function updateAlerts() {
  const t = today();
  const alertsList = $('alerts-list');
  const alertCountEl = $('alert-count');
  if (!alertsList || !alertCountEl) return;

  // Filter active leads (exclude Fechado/Perdido)
  const activeLeads = leads.filter(l => l.status !== 'Fechado' && l.status !== 'Perdido');
  const activeAlerts = [];

  activeLeads.forEach(l => {
    // 1. Overdue return date
    if (l.dataRetorno && l.dataRetorno <= t) {
      activeAlerts.push({
        leadId: l.id,
        type: 'overdue',
        title: `Retorno Pendente: ${l.nome}`,
        desc: l.dataRetorno === t 
          ? 'O contato está agendado para HOJE!' 
          : `Retorno atrasado desde ${fmtDate(l.dataRetorno)}!`,
        tag: l.dataRetorno === t ? 'Hoje 📅' : 'Atrasado ⚠️'
      });
    }

    // 2. Missing next action
    if (!l.proximaAcao || !l.proximaAcao.trim()) {
      activeAlerts.push({
        leadId: l.id,
        type: 'no-action',
        title: `Sem Ação: ${l.nome}`,
        desc: 'Nenhuma próxima ação de atendimento foi definida.',
        tag: 'Definir Ação ✏__'
      });
    }
  });

  // Render alerts list
  if (activeAlerts.length === 0) {
    alertsList.innerHTML = `
      <div class="alerts-empty">
        <span class="alerts-empty-icon">🎉</span>
        <div style="font-weight: 700; color: var(--text-primary);">Tudo em dia!</div>
        <div style="font-size:0.75rem; color: var(--text-muted); margin-top:0.25rem;">Nenhum retorno atrasado ou lead sem ação.</div>
      </div>
    `;
    alertCountEl.textContent = '0';
    alertCountEl.classList.add('hidden');
  } else {
    alertsList.innerHTML = activeAlerts.map(a => `
      <div class="alert-item ${a.type === 'overdue' ? 'alert-overdue' : 'alert-no-action'}" onclick="handleAlertClick('${a.leadId}')">
        <div class="alert-item-title">${esc(a.title)}</div>
        <div class="alert-item-desc">${esc(a.desc)}</div>
        <span class="alert-item-tag">${esc(a.tag)}</span>
      </div>
    `).join('');

    alertCountEl.textContent = activeAlerts.length;
    alertCountEl.classList.remove('hidden');
  }
}

function handleAlertClick(leadId) {
  // Close the alerts dropdown overlay
  const dropdown = $('alerts-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // Open the edit modal for the respective lead
  openEditModal(leadId);
}


function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service Worker não registrado:', err));
  }
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  const isSupaActive = initSupabase();
  updateSupabaseUI(isSupaActive);
  if (isSupaActive) {
    setupAuthListener();
    await refreshCurrentUser();
    setupRealtime();
  }
  
  await loadWaTemplates();
  await loadLeads();
  setupEvents();
  renderAll();
  registerServiceWorker();
  if (isSupaActive && !currentUser) {
    setTimeout(() => openAuthModal('login'), 300);
  }

  // Show a welcome toast on first load
  const isFirst = !localStorage.getItem('loreny_crm_welcomed');
  if (isFirst) {
    localStorage.setItem('loreny_crm_welcomed', '1');
    setTimeout(() => toast('Bem-vinda ao CRM Loreny Imóveis! 🏠', 'success'), 600);
  }
}

document.addEventListener('DOMContentLoaded', init);
