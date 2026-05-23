import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, Phone, Calendar, Plus, Edit2, CheckCircle2, AlertCircle, Trash2, Send, MessageSquare, Upload, FileText, Copy } from 'lucide-react';
import { supabase } from '../config/supabase';
import { getLeadStatusLabel, formatDate, formatCurrency, compileWhatsAppTemplate, OPTIONS, matchPropertyType, parseNotesToHistory, generateProposalPDF } from '../utils/helpers';
import Modal from './UI/Modal';

const extractLinkedPropertyCode = (notes) => {
  if (!notes) return null;
  const match = notes.match(/\[im[óo]vel:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};


const Leads = ({ user, activeQuickAction, onClearQuickAction, setCurrentTab, setPreselectedLeadForVisit }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');      // filtro por corretor (manager/admin)
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('');
  const [profiles, setProfiles] = useState([]);              // lista de corretores para o filtro
  const [visits, setVisits] = useState([]);
  const [newTimelineNote, setNewTimelineNote] = useState('');
  
  // WhatsApp Template Modal states
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waTemplates, setWaTemplates] = useState([]);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState(null);
  const [compiledWaMessage, setCompiledWaMessage] = useState('');
  const [activeWaLead, setActiveWaLead] = useState(null);

  // Edit / Add Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);

  // PDF Proposal Preview Modal states
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalData, setProposalData] = useState({
    title: 'Proposta Comercial',
    subtitle: 'Ficha de Interesse Cadastral',
    name: '',
    phone: '',
    property_type: 'Apartamento',
    region: '',
    budget: '',
    notes: '',
    realtorName: '',
    realtorCompany: '',
    realtorPhone: '',
    realtorEmail: ''
  });
  
  // Form fields matching Real Estate CRM
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    property_type: 'Apartamento',
    region: '',
    budget: '',
    status: 'new',
    notes: '',
    next_action: '',
    next_action_date: ''
  });

  const realtorName = user?.user_metadata?.full_name || 'Corretora Loreny';
  const userRole = user?.user_metadata?.role || 'broker';
  const isManager = userRole === 'manager' || userRole === 'admin';

  useEffect(() => {
    fetchLeads();
    fetchWaTemplates();
    fetchVisits();
    fetchProperties();
    if (isManager) fetchProfiles();
  }, [user]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.from('properties').select('*').eq('is_deleted', false);
      if (error) throw error;
      setProperties(data || []);
    } catch (e) {
      console.error('Erro ao carregar imóveis para leads:', e);
    }
  };

  useEffect(() => {
    if (activeQuickAction === 'add-lead') {
      handleOpenAddModal();
      onClearQuickAction();
    }
  }, [activeQuickAction]);

  useEffect(() => {
    // Dynamic filtering
    let result = leads;
    
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(q) || 
        (l.region && l.region.toLowerCase().includes(q)) ||
        (l.property_type && l.property_type.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }
    
    if (statusFilter !== '') {
      result = result.filter(l => l.status === statusFilter);
    }

    if (propertyTypeFilter !== '') {
      result = result.filter(l => matchPropertyType(l.property_type, propertyTypeFilter));
    }

    if (brokerFilter !== '') {
      result = result.filter(l => l.owner_id === brokerFilter);
    }

    if (selectedPropertyFilter !== '') {
      const prop = properties.find(p => p.id === selectedPropertyFilter);
      if (prop) {
        const qCode = prop.code.toLowerCase();
        result = result.filter(l => {
          const notes = (l.notes || '').toLowerCase();
          const region = (l.region || '').toLowerCase();
          return notes.includes(qCode) || region.includes(qCode);
        });
      }
    }
    
    setFilteredLeads(result);
  }, [search, statusFilter, propertyTypeFilter, brokerFilter, selectedPropertyFilter, leads, properties]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase.from('leads').select('*').eq('is_deleted', false);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error('Erro ao carregar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      console.error('Erro ao carregar perfis de corretores:', e);
    }
  };

  // Retorna o nome do corretor dono do lead
  const getBrokerName = (owner_id) => {
    if (!owner_id) return null;
    const profile = profiles.find(p => p.id === owner_id);
    if (profile) return profile.full_name || profile.email;
    // fallback: se é o próprio usuário logado
    if (owner_id === user?.id) return user?.user_metadata?.full_name || 'Você';
    return null;
  };

  const fetchVisits = async () => {
    try {
      const { data, error } = await supabase.from('visits').select('*').eq('is_deleted', false);
      if (error) throw error;
      setVisits(data || []);
    } catch (e) {
      console.error('Erro ao buscar visitas no Leads:', e);
    }
  };

  const handleAddTimelineNote = async (leadId) => {
    if (!newTimelineNote.trim()) return;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedNote = `${formData.notes ? '\n' : ''}[${dateStr} ${timeStr}] - ${newTimelineNote.trim()}`;
    
    const updatedNotes = (formData.notes || '') + formattedNote;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({ notes: updatedNotes })
        .eq('id', leadId);
        
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, notes: updatedNotes }));
      setNewTimelineNote('');
      fetchLeads();
    } catch (e) {
      alert('Erro ao registrar nota histórica: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaTemplates = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_templates').select('*');
      if (error) throw error;

      if ((!data || data.length === 0) && user?.id) {
        // Safe auto-backfill for existing accounts or mock database
        const defaults = [
          {
            owner_id: user.id,
            title: 'Apresentação e Primeiro Contato 🏠',
            description: 'Mensagem de boas-vindas logo após o lead demonstrar interesse.',
            text_content: 'Olá, {nome}! Tudo bem? Sou o/a {corretor}, especialista de imóveis da Loreny Imóveis. 🙋‍♀️' + '\n\n' + 'Vi que você está buscando um(a) {imovel} na região de {regiao} na faixa de orçamento de {valor}. Tenho algumas opções excelentes selecionadas para o seu perfil. Podermos conversar por ligação rápida de 3 minutos hoje às 17h?'
          },
          {
            owner_id: user.id,
            title: 'Confirmação de Visitação 🗓️',
            description: 'Para enviar um dia antes ou horas antes da visita agendada.',
            text_content: 'Olá, {nome}! Tudo certo para nossa visita de amanhã? 🚀' + '\n\n' + 'Ficou agendado para o dia {data_visita} às {hora_visita} no imóvel {imovel}.' + '\n\n' + 'Endereço ou Ponto de encontro: {regiao}.' + '\n\n' + 'Caso tenha algum imprevisto, me avise por aqui! Abraços!'
          },
          {
            owner_id: user.id,
            title: 'Acompanhamento de Proposta 📝',
            description: 'Follow-up de negociação para destravar propostas pendentes.',
            text_content: 'Olá, {nome}! Tudo bem?' + '\n\n' + 'Passando para saber se teve a oportunidade de avaliar a proposta de {valor} enviada para o imóvel em {regiao}. O proprietário demonstrou abertura, mas precisamos formalizar os termos. Ficamos no aguardo de sua resposta para fecharmos esse excelente negócio! ✨'
          }
        ];

        await supabase.from('whatsapp_templates').insert(defaults);
        const { data: refetched } = await supabase.from('whatsapp_templates').select('*');
        setWaTemplates(refetched || []);
        if (refetched && refetched.length > 0) {
          setSelectedWaTemplate(refetched[0]);
        }
      } else {
        setWaTemplates(data || []);
        if (data && data.length > 0) {
          setSelectedWaTemplate(data[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar templates de WhatsApp:', e);
    }
  };

  const handleOpenAddModal = () => {
    fetchProperties();
    setEditingLead(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      property_type: 'Apartamento',
      region: '',
      budget: '',
      status: 'new',
      notes: '',
      next_action: '',
      next_action_date: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    fetchProperties();
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone || '',
      email: lead.email || '',
      property_type: lead.property_type || 'Apartamento',
      region: lead.region || '',
      budget: lead.budget || '',
      status: lead.status,
      notes: lead.notes || '',
      next_action: lead.next_action || '',
      next_action_date: lead.next_action_date || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenProposalModal = (lead) => {
    setProposalData({
      title: 'Proposta Comercial',
      subtitle: 'Ficha de Interesse Cadastral',
      name: lead.name || '',
      phone: lead.phone || '',
      property_type: lead.property_type || 'Apartamento',
      region: lead.region || '',
      budget: lead.budget || '',
      notes: lead.notes || '',
      realtorName: user?.user_metadata?.full_name || 'Corretora Loreny',
      realtorCompany: user?.user_metadata?.company || 'Loreny Imóveis',
      realtorPhone: user?.user_metadata?.phone || '',
      realtorEmail: user?.email || ''
    });
    setIsProposalModalOpen(true);
  };

  const handleProposalInputChange = (e) => {
    const { name, value } = e.target;
    setProposalData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateProposal = (e) => {
    e.preventDefault();
    const tempLead = {
      name: proposalData.name,
      phone: proposalData.phone,
      property_type: proposalData.property_type,
      region: proposalData.region,
      budget: proposalData.budget,
      notes: proposalData.notes
    };
    generateProposalPDF(
      tempLead,
      proposalData.realtorName,
      proposalData.realtorEmail,
      proposalData.realtorPhone,
      proposalData.realtorCompany,
      proposalData.title,
      proposalData.subtitle
    );
    setIsProposalModalOpen(false);
  };

  const handleCopyLeadSummary = (lead) => {
    const formattedBudget = lead.budget 
      ? (typeof lead.budget === 'number' 
          ? formatCurrency(lead.budget) 
          : (isNaN(parseFloat(lead.budget)) ? lead.budget : formatCurrency(parseFloat(lead.budget)))) 
      : 'Não especificado';
      
    const realtor = user?.user_metadata?.full_name || 'Corretora Loreny';
    const company = user?.user_metadata?.company || 'Loreny Imóveis';
    const realtorPhone = user?.user_metadata?.phone || '';
    
    let text = `🔑 *Ficha de Interesse do Cliente — ${company}*\n\n`;
    text += `👤 *Cliente:* ${lead.name}\n`;
    text += `📞 *WhatsApp:* ${lead.phone || 'Não informado'}\n`;
    text += `🏠 *Tipo de Imóvel:* ${lead.property_type || 'Não especificado'}\n`;
    text += `📍 *Região de Interesse:* ${lead.region || 'Não informada'}\n`;
    text += `💰 *Orçamento Pretendido:* ${formattedBudget}\n\n`;
    text += `---\n`;
    text += `🤝 *Consultor Técnico:* ${realtor}\n`;
    if (realtorPhone) {
      text += `📞 *Contato Consultor:* ${realtorPhone}\n`;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Ficha do cliente copiada com sucesso! Pronta para colar no WhatsApp. 🚀');
      })
      .catch(err => {
        console.error('Erro ao copiar ficha:', err);
        alert('Não foi possível copiar automaticamente. Por favor, tente novamente.');
      });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.region) {
      alert('Por favor, preencha os campos obrigatórios: Nome, WhatsApp e Região.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        next_action_date: formData.next_action_date ? formData.next_action_date : null,
        next_action: formData.next_action ? formData.next_action : null,
        email: formData.email ? formData.email : null,
        owner_id: user.id
      };

      if (editingLead) {
        const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      alert('Erro ao salvar lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (lead) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir o lead "${lead.name}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      // Soft-delete matching baseline pattern
      const { error } = await supabase
        .from('leads')
        .update({ is_deleted: true })
        .eq('id', lead.id);

      if (error) throw error;

      alert(`Lead "${lead.name}" excluído com sucesso.`);
      fetchLeads();
    } catch (err) {
      alert('Erro ao excluir lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitForLead = (lead) => {
    setPreselectedLeadForVisit({ id: lead.id, name: lead.name, isLead: true });
    setCurrentTab('visits');
  };

  // OPEN WHATSAPP CHOOSE & EDIT MODAL
  const handleOpenWaModal = (lead) => {
    setActiveWaLead(lead);
    
    // Choose first template or fallback
    let initialTemplate = waTemplates.length > 0 ? waTemplates[0] : null;
    setSelectedWaTemplate(initialTemplate);
    
    const compiled = initialTemplate 
      ? compileWhatsAppTemplate(initialTemplate.text_content, lead, realtorName) 
      : `Olá, ${lead.name}! Tudo bem? Sou o(a) ${realtorName}, seu corretor da Loreny Imóveis...`;

    setCompiledWaMessage(compiled);
    setIsWaModalOpen(true);
  };

  // Handle template selection change
  const handleWaTemplateChange = (templateId) => {
    const template = waTemplates.find(t => t.id === templateId);
    setSelectedWaTemplate(template);
    
    if (template && activeWaLead) {
      const compiled = compileWhatsAppTemplate(template.text_content, activeWaLead, realtorName);
      setCompiledWaMessage(compiled);
    }
  };

  const handleSendWaMessage = () => {
    if (!activeWaLead || !compiledWaMessage) return;
    
    // Format phone number to clean digits
    const cleanPhone = activeWaLead.phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(compiledWaMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`;
    
    // Open in new tab
    window.open(waUrl, '_blank');
    setIsWaModalOpen(false);
  };

  const handleImportCSV = async (file) => {
    if (!file) return;

    const confirmImport = window.confirm(`Deseja importar os dados do arquivo "${file.name}" para a conta de ${user?.email || 'draloreny@gmail.com'}?`);
    if (!confirmImport) return;

    try {
      setLoading(true);
      const text = await file.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        alert('O arquivo CSV parece estar vazio ou sem cabeçalhos.');
        return;
      }

      const parseCSVLine = (line) => {
        const out = [];
        let cur = '';
        let q = false;
        for (let i = 0; i < line.length; i++) {
          let c = line[i];
          if (c === '"') {
            if (q && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              q = !q;
            }
          } else if (c === ',' && !q) {
            out.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        out.push(cur.trim());
        return out;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      
      const getColIndex = (options) => {
        return headers.findIndex(h => options.some(opt => h.includes(opt)));
      };

      const nameIdx = getColIndex(['nome', 'name']);
      const phoneIdx = getColIndex(['whatsapp', 'telefone', 'phone', 'celular']);
      const emailIdx = getColIndex(['email', 'e-mail']);
      const typeIdx = getColIndex(['tipo', 'property_type', 'imovel']);
      const regionIdx = getColIndex(['região', 'regiao', 'region', 'bairro']);
      const budgetIdx = getColIndex(['valor', 'budget', 'orçamento', 'orcamento']);
      const statusIdx = getColIndex(['status', 'estágio', 'estagio']);
      const nextActionIdx = getColIndex(['próxima ação', 'proxima_acao', 'próxima', 'action']);
      const nextActionDateIdx = getColIndex(['data retorno', 'data_retorno', 'retorno', 'date']);
      const notesIdx = getColIndex(['observações', 'observacoes', 'notes', 'notas']);

      if (nameIdx === -1) {
        alert('Cabeçalho inválido. O arquivo CSV deve conter pelo menos uma coluna com o nome "Nome".');
        return;
      }

      const STATUS_MAP = {
        'novo lead': 'new',
        'contato feito': 'contacted',
        'entendeu necessidade': 'contacted',
        'enviou opções': 'contacted',
        'agendou visita': 'visit_scheduled',
        'visitou imóvel': 'visited',
        'proposta feita': 'proposal',
        'fechado': 'won',
        'perdido': 'lost',
        'nutrição futura': 'new'
      };

      const importedLeads = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length === 0 || !cols[nameIdx]) continue;

        const name = cols[nameIdx];
        
        const rawPhone = (phoneIdx !== -1 && cols[phoneIdx]) ? cols[phoneIdx] : '';
        const phone = typeof rawPhone === 'string' ? rawPhone.replace(/[^\d+]/g, '') : '';

        const email = (emailIdx !== -1 && cols[emailIdx]) ? cols[emailIdx] : null;
        
        const rawType = (typeIdx !== -1 && cols[typeIdx]) ? cols[typeIdx] : 'Apartamento';
        let propertyType = 'Apartamento';
        if (typeof rawType === 'string') {
          if (rawType.toLowerCase().includes('casa') || rawType.toLowerCase().includes('sobrado')) {
            propertyType = 'Casa';
          } else if (rawType.toLowerCase().includes('lote') || rawType.toLowerCase().includes('terreno')) {
            propertyType = 'Terreno / Lote';
          } else if (rawType.toLowerCase().includes('comercial') || rawType.toLowerCase().includes('sala')) {
            propertyType = 'Comercial';
          } else if (rawType.toLowerCase().includes('chácara') || rawType.toLowerCase().includes('sítio') || rawType.toLowerCase().includes('sitio')) {
            propertyType = 'Chácara / Sítio';
          }
        }

        const region = (regionIdx !== -1 && cols[regionIdx]) ? cols[regionIdx] : 'Não especificada';
        
        const rawBudget = (budgetIdx !== -1 && cols[budgetIdx]) ? cols[budgetIdx] : '';
        const cleanBudget = typeof rawBudget === 'string' ? rawBudget.replace(/[^\d]/g, '') : '';
        const budget = cleanBudget ? parseFloat(cleanBudget) : null;

        const rawStatus = (statusIdx !== -1 && cols[statusIdx]) ? cols[statusIdx].toLowerCase() : 'novo lead';
        const status = STATUS_MAP[rawStatus] || 'new';

        const notes = (notesIdx !== -1 && cols[notesIdx]) ? cols[notesIdx] : '';
        const next_action = (nextActionIdx !== -1 && cols[nextActionIdx]) ? cols[nextActionIdx] : '';
        
        let next_action_date = null;
        if (nextActionDateIdx !== -1 && cols[nextActionDateIdx]) {
          const rawDate = cols[nextActionDateIdx];
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              next_action_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            next_action_date = rawDate;
          }
        }

        importedLeads.push({
          owner_id: user?.id,
          name,
          phone,
          email,
          property_type: propertyType,
          region,
          budget,
          status,
          notes,
          next_action,
          next_action_date,
          is_deleted: false
        });
      }

      if (importedLeads.length === 0) {
        alert('Nenhum lead válido encontrado no arquivo.');
        return;
      }

      const { error } = await supabase.from('leads').insert(importedLeads);
      if (error) throw error;

      alert(`Sucesso! ${importedLeads.length} leads foram importados com sucesso.`);
      fetchLeads();
    } catch (err) {
      alert('Erro ao importar CSV: ' + err.message);
    } finally {
      setLoading(false);
      document.getElementById('csv-import-input').value = '';
    }
  };

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Gestão de Leads & Negócios
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => document.getElementById('csv-import-input').click()} 
            className="btn btn-outline" 
            style={{ 
              fontFamily: 'Inter, sans-serif', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--gray-300)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Upload size={18} />
            <span>Importar CSV</span>
          </button>
          <input 
            type="file" 
            id="csv-import-input" 
            accept=".csv" 
            onChange={(e) => handleImportCSV(e.target.files[0])} 
            style={{ display: 'none' }} 
          />
          <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            <Plus size={18} />
            <span>Cadastrar Lead</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="search-filter-bar flex-col gap-2" style={{ display: 'flex', marginBottom: '24px' }}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, região, tipo de imóvel..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTRO POR CORRETOR — visível apenas para gerente e admin */}
        {isManager && profiles.length > 0 && (
          <div className="filter-row no-scrollbar">
            <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Filter size={14} /> Corretor:
            </span>
            <button
              className={`badge ${brokerFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
              onClick={() => setBrokerFilter('')}
              style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Todos ({leads.length})
            </button>
            {profiles.map(p => {
              const count = leads.filter(l => l.owner_id === p.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={p.id}
                  className={`badge ${brokerFilter === p.id ? 'badge-new' : 'badge-no_fit'}`}
                  onClick={() => setBrokerFilter(brokerFilter === p.id ? '' : p.id)}
                  style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  👤 {p.full_name || p.email} <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '8px', marginLeft: '4px' }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
        
        <div className="filter-row no-scrollbar">
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Estágio Funil:
          </span>
          <button 
            className={`badge ${statusFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('')}
            style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            Todos <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{leads.length}</span>
          </button>
          {OPTIONS.STAGES.map(stage => {
            const count = leads.filter(l => l.status === stage.value).length;
            return (
              <button 
                key={stage.value}
                className={`badge ${statusFilter === stage.value ? `badge-${stage.value}` : 'badge-no_fit'}`}
                onClick={() => setStatusFilter(stage.value)}
                style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                {stage.label} <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="filter-row no-scrollbar">
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Tipo de Imóvel:
          </span>
          <button 
            className={`badge ${propertyTypeFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setPropertyTypeFilter('')}
            style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            Todos <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{leads.length}</span>
          </button>
          {OPTIONS.PROPERTY_TYPES.map(type => {
            const count = leads.filter(l => matchPropertyType(l.property_type, type)).length;
            return (
              <button 
                key={type}
                className={`badge ${propertyTypeFilter === type ? 'badge-new' : 'badge-no_fit'}`}
                onClick={() => setPropertyTypeFilter(type)}
                style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                {type} <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {properties.length > 0 && (
          <div className="filter-row no-scrollbar">
            <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Filter size={14} /> Empreendimento:
            </span>
            <button 
              className={`badge ${selectedPropertyFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
              onClick={() => setSelectedPropertyFilter('')}
              style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              Todos <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{leads.length}</span>
            </button>
            {properties.map(p => {
              const count = leads.filter(l => {
                const qCode = p.code.toLowerCase();
                const notes = (l.notes || '').toLowerCase();
                const region = (l.region || '').toLowerCase();
                return notes.includes(qCode) || region.includes(qCode);
              }).length;
              
              return (
                <button 
                  key={p.id}
                  className={`badge ${selectedPropertyFilter === p.id ? 'badge-new' : 'badge-no_fit'}`}
                  onClick={() => setSelectedPropertyFilter(selectedPropertyFilter === p.id ? '' : p.id)}
                  style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  🏢 {p.code} - {p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title} <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 0, 0, 0.08)', padding: '1px 5px', borderRadius: '8px' }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* LEADS LIST CARDS */}
      {loading && leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Buscando base de leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhum lead encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="mobile-card-list">
          {filteredLeads.map((ld) => {
            const brokerName = isManager ? getBrokerName(ld.owner_id) : null;
            return (
            <div key={ld.id} className="mobile-card">
              <div className="mobile-card-header">
                <div>
                  <h3 className="mobile-card-title">{ld.name}</h3>
                  <div className="mobile-card-subtitle">
                    <span style={{ color: 'var(--primary)' }}>🏠 {ld.property_type || 'Imóvel'}</span>
                    <span>•</span>
                    <span>📍 {ld.region}</span>
                  </div>
                  {/* Badges do corretor e imóvel vinculado */}
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {brokerName && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.08)',
                        border: '1px solid rgba(124, 58, 237, 0.18)',
                        borderRadius: '5px',
                        padding: '2px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        👤 {brokerName}
                      </span>
                    )}
                    
                    {(() => {
                      const propCode = extractLinkedPropertyCode(ld.notes);
                      if (!propCode) return null;
                      const linkedProp = properties.find(p => p.code.toUpperCase() === propCode.toUpperCase());
                      const displayName = linkedProp ? linkedProp.title : propCode;
                      return (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--primary-dark)',
                          backgroundColor: 'var(--primary-light)',
                          border: '1px solid rgba(197, 155, 39, 0.3)',
                          borderRadius: '5px',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🏢 Imóvel: {displayName} ({propCode})
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <span className={`badge badge-${ld.status}`}>
                  {getLeadStatusLabel(ld.status)}
                </span>
              </div>

              <div className="flex justify-between" style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '10px' }}>
                <div>
                  <strong>Orçamento:</strong>{' '}
                  <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>
                    {ld.budget ? formatCurrency(ld.budget) : 'Não definido'}
                  </span>
                </div>
                {ld.email && <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{ld.email}</div>}
              </div>

              {ld.next_action_date && (
                <div style={{ 
                  fontSize: '13px', 
                  backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  marginBottom: '12px',
                  borderLeft: '3px solid #f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.1)'
                }}>
                  <div className="flex align-center gap-1" style={{ fontWeight: 600, color: '#f59e0b' }}>
                    <Calendar size={14} />
                    Retorno agendado: {formatDate(ld.next_action_date)}
                  </div>
                  <div style={{ color: 'var(--gray-700)', marginTop: '2px' }}>{ld.next_action}</div>
                </div>
              )}

              {ld.notes && (
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  "{ld.notes}"
                </p>
              )}

              {/* ACTION BUTTONS (NO SIDE SCROLLING!) */}
              <div className="mobile-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button 
                  onClick={() => handleOpenWaModal(ld)} 
                  className="action-btn action-btn-whatsapp"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.2)' }}
                >
                  <MessageSquare size={14} />
                  Contatar WhatsApp
                </button>
                
                {ld.status !== 'won' && ld.status !== 'lost' && (
                  <button 
                    onClick={() => handleCreateVisitForLead(ld)} 
                    className="action-btn action-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} />
                    Agendar Visita
                  </button>
                )}
                
                <button 
                  onClick={() => handleOpenProposalModal(ld)} 
                  className="action-btn"
                  style={{ flex: '0 0 auto', width: '40px', padding: 0, justifyContent: 'center', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                  title="Gerar Proposta PDF"
                >
                  <FileText size={14} />
                </button>

                <button 
                  onClick={() => handleCopyLeadSummary(ld)} 
                  className="action-btn"
                  style={{ flex: '0 0 auto', width: '40px', padding: 0, justifyContent: 'center', color: 'var(--primary)', borderColor: 'rgba(181, 148, 16, 0.2)' }}
                  title="Copiar Ficha do Cliente"
                >
                  <Copy size={14} />
                </button>
                
                <button 
                  onClick={() => handleOpenEditModal(ld)} 
                  className="action-btn" 
                  style={{ flex: '0 0 auto', width: '40px', padding: 0, justifyContent: 'center' }}
                  title="Editar Lead"
                >
                  <Edit2 size={14} />
                </button>
                
                <button 
                  onClick={() => handleDeleteLead(ld)} 
                  className="action-btn" 
                  style={{ flex: '0 0 auto', width: '40px', padding: 0, justifyContent: 'center', color: 'var(--status-lost)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  title="Excluir Lead"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* LEAD CREATION / MODIFICATION MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLead ? 'Editar Lead Imobiliário' : 'Cadastrar Novo Lead'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Cliente *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder="Ex: Ana Paula Albuquerque"
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp / Telefone *</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleInputChange} 
                placeholder="Ex: 11999998888 (Apenas números)"
                required 
              />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                placeholder="Ex: cliente@email.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Imóvel Desejado</label>
              <select name="property_type" value={formData.property_type} onChange={handleInputChange}>
                {OPTIONS.PROPERTY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Região / Bairro de Interesse *</label>
                {properties.length > 0 && (
                  <select 
                    onChange={(e) => {
                      const propId = e.target.value;
                      if (!propId) return;
                      const selected = properties.find(p => p.id === propId);
                      if (selected) {
                        setFormData(prev => {
                          const tag = `[Imóvel: ${selected.code}]`;
                          let updatedNotes = prev.notes || '';
                          if (!updatedNotes.includes(tag)) {
                            updatedNotes = updatedNotes ? `${tag}\n${updatedNotes}` : tag;
                          }
                          return {
                            ...prev,
                            region: selected.region,
                            property_type: selected.property_type,
                            budget: selected.price || prev.budget,
                            notes: updatedNotes
                          };
                        });
                      }
                      e.target.value = ''; // reset dropdown
                    }}
                    style={{ width: 'auto', height: '24px', padding: '0 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent' }}
                  >
                    <option value="">🔍 Vincular da Carteira</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>[{p.code}] {p.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <input 
                type="text" 
                name="region" 
                value={formData.region} 
                onChange={handleInputChange} 
                placeholder="Ex: Jardim Botânico"
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Orçamento Limite (R$)</label>
              <input 
                type="number" 
                name="budget" 
                value={formData.budget} 
                onChange={handleInputChange} 
                placeholder="Ex: 750000"
              />
            </div>
            <div className="form-group">
              <label>Estágio Atual do Negócio</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                {OPTIONS.STAGES.map(stage => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            marginBottom: '20px'
          }}>
            <label style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <Calendar size={15} /> Acompanhamento de Retorno (Opcional)
            </label>
            <div className="form-row" style={{ marginTop: '10px', marginBottom: 0 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data</label>
                <input 
                  type="date" 
                  name="next_action_date" 
                  value={formData.next_action_date} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>O que fazer?</label>
                <input 
                  type="text" 
                  name="next_action" 
                  value={formData.next_action} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Ligar para colher feedback"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Observações Adicionais</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Ex: Busca imóvel mobiliado, quer sol da manhã..."
              rows={3}
            />
          </div>

          {editingLead && (
            <div style={{ 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px', 
              backgroundColor: 'rgba(0,0,0,0.01)',
              marginBottom: '20px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', margin: 0 }}>
                  📜 Linha do Tempo & Histórico do Cliente
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button"
                    onClick={() => handleCopyLeadSummary(editingLead)}
                    className="btn btn-outline"
                    style={{ 
                      height: '28px', 
                      padding: '0 10px', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      borderColor: 'rgba(181, 148, 16, 0.3)',
                      color: 'var(--primary)',
                      backgroundColor: 'rgba(181, 148, 16, 0.05)'
                    }}
                  >
                    <Copy size={12} />
                    <span>Copiar Ficha</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenProposalModal(editingLead)}
                    className="btn btn-outline"
                    style={{ 
                      height: '28px', 
                      padding: '0 10px', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)'
                    }}
                  >
                    <FileText size={12} />
                    <span>Gerar PDF</span>
                  </button>
                </div>
              </div>
              
              {/* Quick Log Note Box */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="text"
                  placeholder="Registrar nova anotação ou contato com o cliente..."
                  value={newTimelineNote}
                  onChange={(e) => setNewTimelineNote(e.target.value)}
                  style={{ flex: 1, height: '36px', fontSize: '13px', backgroundColor: '#fff', color: 'var(--gray-800)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 8px' }}
                />
                <button 
                  type="button" 
                  onClick={() => handleAddTimelineNote(editingLead.id)}
                  className="btn btn-primary"
                  style={{ height: '36px', padding: '0 12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Registrar Nota
                </button>
              </div>

              {/* Combined History Timeline List */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {(() => {
                  const notesHistory = parseNotesToHistory(formData.notes);
                  const leadVisits = visits
                    .filter(v => v.lead_id === editingLead.id)
                    .map(v => ({
                      date: formatDate(v.visit_datetime.substring(0, 10)),
                      time: v.visit_datetime.substring(11, 16) + 'h',
                      content: `Visita ${v.status}: ${v.property_details}` + (v.notes ? ` ("${v.notes}")` : ''),
                      isVisit: true,
                      status: v.status,
                      created: v.visit_datetime
                    }));
                    
                  const fullTimeline = [
                    ...notesHistory.map(n => ({
                      ...n,
                      sortDate: n.date.includes('/') 
                        ? new Date(n.date.split('/').reverse().join('-') + 'T' + (n.time || '00:00') + ':00')
                        : new Date(0)
                    })),
                    ...leadVisits.map(v => ({
                      ...v,
                      sortDate: new Date(v.created)
                    }))
                  ].sort((a, b) => b.sortDate - a.sortDate);

                  if (fullTimeline.length === 0) {
                    return <div style={{ fontSize: '12px', color: 'var(--gray-500)', textAlign: 'center', padding: '8px' }}>Nenhuma interação registrada ainda.</div>;
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {fullTimeline.map((item, idx) => {
                        let icon = '📝';
                        let borderLeft = '2px solid var(--border-color)';
                        
                        if (item.isInteraction) {
                          icon = '💬';
                          borderLeft = '2px solid var(--primary)';
                        } else if (item.isVisit) {
                          icon = '🏠';
                          borderLeft = item.status === 'Realizada' 
                            ? '2px solid var(--status-won)' 
                            : item.status === 'Cancelada' 
                              ? '2px solid var(--status-lost)' 
                              : '2px solid #f59e0b';
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              padding: '8px 12px', 
                              backgroundColor: '#ffffff', 
                              borderRadius: 'var(--radius-sm)', 
                              border: '1px solid var(--border-color)',
                              borderLeft: borderLeft,
                              fontSize: '12px',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '2px' }}>
                              <span>{icon} {item.date} {item.time && `às ${item.time}`}</span>
                              {item.isVisit && (
                                <span style={{ 
                                  fontSize: '10px', 
                                  padding: '1px 5px', 
                                  borderRadius: '8px',
                                  backgroundColor: item.status === 'Realizada' ? 'var(--status-won-bg)' : item.status === 'Cancelada' ? 'var(--status-lost-bg)' : 'rgba(245, 158, 11, 0.1)',
                                  color: item.status === 'Realizada' ? 'var(--status-won)' : item.status === 'Cancelada' ? 'var(--status-lost)' : '#f59e0b'
                                }}>
                                  {item.status}
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--gray-800)', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{item.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Salvando...' : editingLead ? 'Salvar Alterações' : 'Criar Lead'}
          </button>
        </form>
      </Modal>

      {/* MODAL PARA REVISAR E AJUSTAR DADOS DA PROPOSTA PDF */}
      <Modal 
        isOpen={isProposalModalOpen} 
        onClose={() => setIsProposalModalOpen(false)} 
        title="Visualizar & Ajustar Proposta Comercial 📄"
      >
        <form onSubmit={handleGenerateProposal}>
          <div style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.04)', 
            border: '1px solid rgba(16, 185, 129, 0.15)', 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '20px', 
            fontSize: '13px', 
            color: 'var(--gray-700)',
            lineHeight: '1.4'
          }}>
            ✨ <strong>Personalização Temporária:</strong> Os ajustes feitos nesta tela servem exclusivamente para a geração deste PDF. Nenhuma informação será salva permanentemente na sua base de dados principal, permitindo que você personalize propostas sob medida para cada cliente sem poluir o histórico.
          </div>

          {/* DOCUMENT HEADER DETAILS */}
          <div style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>
              🎨 Layout & Títulos do Documento
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label>Título Principal</label>
                <input 
                  type="text" 
                  name="title" 
                  value={proposalData.title} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Proposta Comercial"
                  required
                />
              </div>
              <div className="form-group">
                <label>Subtítulo / Descritivo</label>
                <input 
                  type="text" 
                  name="subtitle" 
                  value={proposalData.subtitle} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Ficha de Interesse Cadastral"
                  required
                />
              </div>
            </div>
          </div>

          {/* CLIENT DETAILS */}
          <div style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>
              👤 Informações do Cliente (Lead)
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Cliente</label>
                <input 
                  type="text" 
                  name="name" 
                  value={proposalData.name} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Ana Paula"
                  required
                />
              </div>
              <div className="form-group">
                <label>Celular / WhatsApp</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={proposalData.phone} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: 11999998888"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Imóvel</label>
                <select name="property_type" value={proposalData.property_type} onChange={handleProposalInputChange}>
                  {OPTIONS.PROPERTY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Região / Bairro</label>
                <input 
                  type="text" 
                  name="region" 
                  value={proposalData.region} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Jardim Botânico"
                  required
                />
              </div>
              <div className="form-group">
                <label>Orçamento Limite (R$)</label>
                <input 
                  type="number" 
                  name="budget" 
                  value={proposalData.budget} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: 750000"
                />
              </div>
            </div>
          </div>

          {/* REALTOR DETAILS */}
          <div style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>
              🤝 Dados do Consultor Técnico
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Consultor</label>
                <input 
                  type="text" 
                  name="realtorName" 
                  value={proposalData.realtorName} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Corretora Loreny"
                  required
                />
              </div>
              <div className="form-group">
                <label>Imobiliária / Empresa</label>
                <input 
                  type="text" 
                  name="realtorCompany" 
                  value={proposalData.realtorCompany} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: Loreny Imóveis"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Celular de Contato</label>
                <input 
                  type="tel" 
                  name="realtorPhone" 
                  value={proposalData.realtorPhone} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: 11999997777"
                />
              </div>
              <div className="form-group">
                <label>E-mail de Contato</label>
                <input 
                  type="email" 
                  name="realtorEmail" 
                  value={proposalData.realtorEmail} 
                  onChange={handleProposalInputChange} 
                  placeholder="Ex: consultor@imoveis.com"
                />
              </div>
            </div>
          </div>

          {/* HISTORICAL NOTES/TIMELINE */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>
              📜 Linha do Tempo & Anotações do Atendimento
            </h4>
            <p style={{ color: 'var(--gray-400)', fontSize: '11px', marginBottom: '10px' }}>
              As notas abaixo serão renderizadas na timeline da proposta. Edite o texto mantendo o padrão <code>[DD/MM/AAAA hh:mm] - Nota</code> se desejar que sejam detectadas como marcos cronológicos ou reescreva livremente.
            </p>
            <textarea 
              name="notes" 
              value={proposalData.notes} 
              onChange={handleProposalInputChange} 
              placeholder="Ex: [23/05/2026 14:00] - Apresentação das opções..."
              rows={5}
              style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={() => setIsProposalModalOpen(false)} 
              className="btn btn-outline"
              style={{ flex: 1, height: '44px', fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 2, height: '44px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FileText size={18} />
              <span>Gerar e Imprimir Proposta PDF 📄</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* WHATSAPP CUSTOMIZABLE MESSAGE TEMPLATES MODAL */}
      <Modal 
        isOpen={isWaModalOpen} 
        onClose={() => setIsWaModalOpen(false)} 
        title="Enviar Mensagem por WhatsApp 💬"
      >
        {activeWaLead && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                <strong>Cliente:</strong> {activeWaLead.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                Imóvel: {activeWaLead.property_type} em {activeWaLead.region}
              </div>
            </div>

            <div className="form-group">
              <label>Escolha o Modelo Pré-definido</label>
              {waTemplates.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--status-lost)' }}>
                  Nenhum modelo cadastrado. Acesse a aba "Modelos WhatsApp" para criar.
                </div>
              ) : (
                <select 
                  value={selectedWaTemplate?.id || ''} 
                  onChange={(e) => handleWaTemplateChange(e.target.value)}
                >
                  {waTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'between', width: '100%' }}>
                <span>Mensagem Personalizada (Você pode editar antes de enviar!)</span>
              </label>
              <textarea 
                value={compiledWaMessage} 
                onChange={(e) => setCompiledWaMessage(e.target.value)}
                placeholder="Escreva a mensagem..."
                rows={6}
                style={{ 
                  fontFamily: 'sans-serif', 
                  lineHeight: '1.5'
                }}
              />
            </div>

            <button 
              onClick={handleSendWaMessage} 
              className="btn btn-primary btn-large"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#25d366' }}
            >
              <Send size={16} />
              <span>Enviar pelo WhatsApp</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Leads;
