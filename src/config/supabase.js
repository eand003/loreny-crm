import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid (i.e. present and not placeholders)
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_public_key' &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '';

// Map clean tables in frontend to re_* tables in Supabase for Real Estate v3
const RE_TABLE_MAP = {
  'profiles':           're_profiles',
  'leads':              're_leads',
  'visits':             're_visits',
  'whatsapp_templates': 're_whatsapp_templates',
  'properties':         're_properties'
};

function createReWrappedClient(client) {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return (tableName) => {
          const mappedTable = RE_TABLE_MAP[tableName] || tableName;
          return target.from(mappedTable);
        };
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

export let supabase;

if (isConfigured) {
  const rawClient = createClient(supabaseUrl, supabaseAnonKey);
  supabase = createReWrappedClient(rawClient);
  console.log('🔌 Conectado ao Supabase oficial — Tabelas mapeadas para o prefixo re_* (Imobiliário).');
} else {
  console.warn('⚠️ Credenciais do Supabase não encontradas. Utilizando banco simulado de alta fidelidade (LocalStorage Mock DB).');

  const MOCK_KEYS = {
    PROFILES: 're_mock_profiles',
    LEADS: 're_mock_leads',
    VISITS: 're_mock_visits',
    TEMPLATES: 're_mock_whatsapp_templates',
    SESSION: 're_mock_session',
    PROPERTIES: 're_mock_properties'
  };

  const getOrInit = (key, defaultVal) => {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(val);
  };

  const save = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Seed profiles
  const defaultRealtorId = 'realtor-loreny-001';
  getOrInit(MOCK_KEYS.PROFILES, [
    {
      id: defaultRealtorId,
      full_name: 'Loreny Corretora',
      email: 'contato@lorenyimoveis.com.br',
      phone: '(11) 98888-7777',
      role: 'admin',
      status: 'active'
    }
  ]);

  // Seed leads (Real Estate Focus)
  getOrInit(MOCK_KEYS.LEADS, [
    {
      id: 'lead-re-1',
      owner_id: defaultRealtorId,
      name: 'Ana Paula Albuquerque',
      phone: '11999998888',
      email: 'anapaula@email.com',
      property_type: 'Apartamento',
      region: 'Jardim Botânico',
      budget: 680000,
      notes: 'Busca apartamento de 3 quartos, suíte e 2 vagas. Valorizou varanda gourmet e andar alto.',
      status: 'proposal',
      next_action: 'Negociar desconto no fluxo de entrada da construtora',
      next_action_date: '2026-05-25',
      created_at: new Date().toISOString(),
      is_deleted: false,
      lead_source: 'Tráfego Pago',
      lead_type: 'Compra',
      temperature: 'hot'
    },
    {
      id: 'lead-re-2',
      owner_id: defaultRealtorId,
      name: 'Bruno dos Santos Ferreira',
      phone: '11988885555',
      email: 'bruno.ferreira@email.com',
      property_type: 'Casa em Condomínio',
      region: 'Zona Sul / Villaggio',
      budget: 1250000,
      notes: 'Família com 2 filhos e cachorro. Precisa de quintal privativo amplo e lazer no condomínio.',
      status: 'visit_scheduled',
      next_action: 'Apresentar Sobrado Mobiliado de 4 suítes',
      next_action_date: '2026-05-23',
      created_at: new Date().toISOString(),
      is_deleted: false,
      lead_source: 'WhatsApp',
      lead_type: 'Compra',
      temperature: 'warm'
    },
    {
      id: 'lead-re-3',
      owner_id: defaultRealtorId,
      name: 'Carla Beatriz Lima',
      phone: '11977772222',
      email: 'carla.lima@email.com',
      property_type: 'Sala Comercial',
      region: 'Centro Financeiro',
      budget: 380000,
      notes: 'Médica dermatologista buscando abrir consultório próprio. Prefere prédios com portaria 24h e acessibilidade.',
      status: 'new',
      next_action: 'Ligar para enviar portfólio de salas comerciais de saúde',
      next_action_date: '2026-05-28',
      created_at: new Date().toISOString(),
      is_deleted: false,
      lead_source: 'Visita',
      lead_type: 'Locação',
      temperature: 'cold'
    }
  ]);

  // Seed visits
  getOrInit(MOCK_KEYS.VISITS, [
    {
      id: 'visit-re-1',
      owner_id: defaultRealtorId,
      lead_id: 'lead-re-2',
      property_details: 'Residencial Villaggio - Sobrado Quadra C Lote 12',
      visit_datetime: '2026-05-23T14:30:00Z',
      notes: 'Cliente Bruno e esposa assistirão a visita. Mostrar área gourmet e os acabamentos em mármore.',
      status: 'Agendada',
      created_at: new Date().toISOString(),
      is_deleted: false
    }
  ]);

  // Seed properties
  getOrInit(MOCK_KEYS.PROPERTIES, [
    {
      id: 'prop-1',
      owner_id: defaultRealtorId,
      code: 'AP202',
      title: 'Residencial Splendia',
      property_type: 'Apartamento',
      region: 'Jardim Botânico',
      price: null,
      commission_rate: 5.00,
      owner_name: 'Construtora Splendia Incorporações',
      owner_phone: '11977776666',
      photos_url: 'https://drive.google.com/drive/folders/splendia-mock',
      is_project: true,
      typologies: [
        { name: '2 Quartos (Suíte) - Varanda Gourmet', size: '64m²', price: 420000, status: 'Disponível' },
        { name: '3 Suítes - Pé Direito Duplo', size: '110m²', price: 790000, status: 'Disponível' },
        { name: 'Duplex Penthouse - Lazer Privativo', size: '185m²', price: 1350000, status: 'Reservado' }
      ],
      notes: 'Lançamento com previsão de entrega para Dezembro/2027. Excelente fluxo de entrada parcelado direto com a construtora.',
      created_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'prop-2',
      owner_id: defaultRealtorId,
      code: 'CA05',
      title: 'Sobrado Contemporâneo Mobiliado',
      property_type: 'Casa',
      region: 'Zona Sul / Villaggio',
      price: 1250000,
      commission_rate: 6.00,
      owner_name: 'Bruno dos Santos Ferreira',
      owner_phone: '11988885555',
      photos_url: 'https://drive.google.com/drive/folders/villaggio-sobrado',
      is_project: false,
      typologies: [],
      notes: 'Casa seminova com 4 suítes, piscina aquecida com borda infinita, energia fotovoltaica instalada e marcenaria planejada premium em todos os ambientes.',
      created_at: new Date().toISOString(),
      is_deleted: false
    }
  ]);

  // Seed pre-defined WhatsApp Templates
  getOrInit(MOCK_KEYS.TEMPLATES, [
    {
      id: 'template-re-1',
      owner_id: defaultRealtorId,
      title: 'Apresentação e Primeiro Contato 🏠',
      description: 'Mensagem de boas-vindas logo após o lead demonstrar interesse.',
      text_content: 'Olá, {nome}! Tudo bem? Sou o/a {corretor}, especialista de imóveis da Loreny Imóveis. 🙋‍♀️\n\nVi que você está buscando um(a) {imovel} na região de {regiao} na faixa de orçamento de {valor}. Tenho algumas opções excelentes selecionadas para o seu perfil. Podermos conversar por ligação rápida de 3 minutos hoje às 17h?'
    },
    {
      id: 'template-re-2',
      owner_id: defaultRealtorId,
      title: 'Confirmação de Visitação 🗓️',
      description: 'Para enviar um dia antes ou horas antes da visita agendada.',
      text_content: 'Olá, {nome}! Tudo certo para nossa visita de amanhã? 🚀\n\nFicou agendado para o dia {data_visita} às {hora_visita} no imóvel {imovel}.\n\nEndereço ou Ponto de encontro: {regiao}.\n\nCaso tenha algum imprevisto, me avise por aqui! Abraços!'
    },
    {
      id: 'template-re-3',
      owner_id: defaultRealtorId,
      title: 'Acompanhamento de Proposta 📝',
      description: 'Follow-up de negociação para destravar propostas pendentes.',
      text_content: 'Olá, {nome}! Tudo bem?\n\nPassando para saber se teve a oportunidade de avaliar a proposta de {valor} enviada para o imóvel em {regiao}. O proprietário demonstrou abertura, mas precisamos formalizar os termos. Ficamos no aguardo de sua resposta para fecharmos esse excelente negócio! ✨'
    }
  ]);

  // Build simulated client
  supabase = {
    isMock: true,
    auth: {
      listeners: [],
      async getSession() {
        const sessionJson = localStorage.getItem(MOCK_KEYS.SESSION);
        if (sessionJson) {
          return { data: { session: JSON.parse(sessionJson) }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        const profiles = JSON.parse(localStorage.getItem(MOCK_KEYS.PROFILES));
        const user = profiles.find(p => p.email === email.trim().toLowerCase());
        
        if (user) {
          const session = {
            access_token: 'mock-jwt-token-' + Math.random(),
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.full_name,
                role: user.role
              }
            }
          };
          localStorage.setItem(MOCK_KEYS.SESSION, JSON.stringify(session));
          this.listeners.forEach(fn => fn('SIGNED_IN', session));
          return { data: { session, user: session.user }, error: null };
        }
        return { data: null, error: { message: 'Corretor não cadastrado na base local (tente contato@lorenyimoveis.com.br com qualquer senha).' } };
      },
      async signUp({ email, password, options }) {
        const profiles = JSON.parse(localStorage.getItem(MOCK_KEYS.PROFILES)) || [];
        if (profiles.some(p => p.email === email)) {
          return { data: null, error: { message: 'E-mail de corretor já cadastrado.' } };
        }
        const newId = 'realtor-' + Math.random().toString(36).substr(2, 9);
        const name = options?.data?.full_name || email.split('@')[0];
        
        const userRole = options?.data?.role || 'broker';
        
        const newProfile = {
          id: newId,
          full_name: name,
          email,
          role: userRole,
          status: 'active',
          created_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        save(MOCK_KEYS.PROFILES, profiles);

        const session = {
          access_token: 'mock-jwt-token-' + Math.random(),
          user: {
            id: newId,
            email,
            user_metadata: { full_name: name, role: userRole }
          }
        };
        localStorage.setItem(MOCK_KEYS.SESSION, JSON.stringify(session));
        this.listeners.forEach(fn => fn('SIGNED_IN', session));
        return { data: { session, user: session.user }, error: null };
      },
      async signOut() {
        localStorage.removeItem(MOCK_KEYS.SESSION);
        this.listeners.forEach(fn => fn('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange(callback) {
        this.listeners.push(callback);
        this.getSession().then(({ data }) => {
          callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
        });
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.listeners = this.listeners.filter(fn => fn !== callback);
              }
            }
          }
        };
      }
    },

    from(table) {
      let storageKey;
      switch (table) {
        case 'leads': storageKey = MOCK_KEYS.LEADS; break;
        case 'visits': storageKey = MOCK_KEYS.VISITS; break;
        case 'whatsapp_templates': storageKey = MOCK_KEYS.TEMPLATES; break;
        case 'profiles': storageKey = MOCK_KEYS.PROFILES; break;
        case 'properties': storageKey = MOCK_KEYS.PROPERTIES; break;
        default: storageKey = table;
      }

      const getItems = () => JSON.parse(localStorage.getItem(storageKey)) || [];
      const saveItems = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

      return {
        select(fields) {
          const items = getItems();
          const activeItems = items.filter(item => !item.is_deleted);
          
          return {
            eq(field, value) {
              const filtered = activeItems.filter(item => item[field] === value);
              return {
                order(orderByField, { ascending = false } = {}) {
                  const sorted = [...filtered].sort((a, b) => {
                    const valA = a[orderByField];
                    const valB = b[orderByField];
                    if (valA < valB) return ascending ? -1 : 1;
                    if (valA > valB) return ascending ? 1 : -1;
                    return 0;
                  });
                  return Promise.resolve({ data: sorted, error: null });
                },
                then(resolve) {
                  return resolve({ data: filtered, error: null });
                }
              };
            },
            order(orderByField, { ascending = false } = {}) {
              const sorted = [...activeItems].sort((a, b) => {
                const valA = a[orderByField];
                const valB = b[orderByField];
                if (valA < valB) return ascending ? -1 : 1;
                if (valA > valB) return ascending ? 1 : -1;
                return 0;
              });
              return {
                then(resolve) {
                  return resolve({ data: sorted, error: null });
                }
              };
            },
            then(resolve) {
              return resolve({ data: activeItems, error: null });
            }
          };
        },

        insert(record) {
          const records = Array.isArray(record) ? record : [record];
          const currentItems = getItems();
          const inserted = records.map(rec => ({
            id: rec.id || 'rec-' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            is_deleted: false,
            ...rec
          }));

          currentItems.push(...inserted);
          saveItems(currentItems);

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0], error: null });
                },
                then(resolve) {
                  return resolve({ data: inserted, error: null });
                }
              };
            },
            then(resolve) {
              return resolve({ data: inserted, error: null });
            }
          };
        },

        update(updatedData) {
          return {
            eq(field, value) {
              const currentItems = getItems();
              const modifiedItems = currentItems.map(item => {
                if (item[field] === value) {
                  return { ...item, ...updatedData, updated_at: new Date().toISOString() };
                }
                return item;
              });
              
              saveItems(modifiedItems);

              return {
                then(resolve) {
                  return resolve({ data: modifiedItems.filter(item => item[field] === value), error: null });
                }
              };
            }
          };
        },

        delete() {
          return {
            eq(field, value) {
              const currentItems = getItems();
              const remaining = currentItems.filter(item => item[field] !== value);
              saveItems(remaining);
              return {
                then(resolve) {
                  return resolve({ data: remaining, error: null });
                }
              };
            }
          };
        }
      };
    }
  };
}
