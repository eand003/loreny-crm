import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, Phone, Calendar, Plus, Edit2, CheckCircle2, AlertCircle, Trash2, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../config/supabase';
import { getLeadStatusLabel, formatDate, formatCurrency, compileWhatsAppTemplate, OPTIONS } from '../utils/helpers';
import Modal from './UI/Modal';

const Leads = ({ user, activeQuickAction, onClearQuickAction, setCurrentTab, setPreselectedLeadForVisit }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
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

  useEffect(() => {
    fetchLeads();
    fetchWaTemplates();
  }, [user]);

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
    
    setFilteredLeads(result);
  }, [search, statusFilter, leads]);

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

  const fetchWaTemplates = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_templates').select('*');
      if (error) throw error;
      setWaTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedWaTemplate(data[0]);
      }
    } catch (e) {
      console.error('Erro ao carregar templates de WhatsApp:', e);
    }
  };

  const handleOpenAddModal = () => {
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

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Gestão de Leads & Negócios
        </h2>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          <Plus size={18} />
          <span>Cadastrar Lead</span>
        </button>
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
        
        <div className="flex align-center gap-2" style={{ overflowX: 'auto', paddingBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Estágio Funil:
          </span>
          <button 
            className={`badge ${statusFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Todos
          </button>
          {OPTIONS.STAGES.map(stage => (
            <button 
              key={stage.value}
              className={`badge ${statusFilter === stage.value ? `badge-${stage.value}` : 'badge-no_fit'}`}
              onClick={() => setStatusFilter(stage.value)}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {stage.label}
            </button>
          ))}
        </div>
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
          {filteredLeads.map((ld) => (
            <div key={ld.id} className="mobile-card">
              <div className="mobile-card-header">
                <div>
                  <h3 className="mobile-card-title">{ld.name}</h3>
                  <div className="mobile-card-subtitle">
                    <span style={{ color: 'var(--primary)' }}>🏠 {ld.property_type || 'Imóvel'}</span>
                    <span>•</span>
                    <span>📍 {ld.region}</span>
                  </div>
                </div>
                <span className={`badge badge-${ld.status}`}>
                  {getLeadStatusLabel(ld.status)}
                </span>
              </div>

              <div className="flex justify-between" style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '10px' }}>
                <div>
                  <strong>Orçamento:</strong>{' '}
                  <span style={{ color: 'var(--white)', fontWeight: 600 }}>
                    {ld.budget ? formatCurrency(ld.budget) : 'Não definido'}
                  </span>
                </div>
                {ld.email && <div style={{ fontSize: '12px' }}>{ld.email}</div>}
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
                  <div style={{ color: 'var(--gray-400)', marginTop: '2px' }}>{ld.next_action}</div>
                </div>
              )}

              {ld.notes && (
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '12px', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px' }}>
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
          ))}
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
            <div className="form-group">
              <label>Região / Bairro de Interesse *</label>
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

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Salvando...' : editingLead ? 'Salvar Alterações' : 'Criar Lead'}
          </button>
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
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '14px', color: 'var(--white)' }}>
                <strong>Cliente:</strong> {activeWaLead.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
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
                  lineHeight: '1.5',
                  backgroundColor: 'rgba(10, 15, 30, 0.5)',
                  color: 'var(--white)',
                  border: '1px solid rgba(255,255,255,0.1)'
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
