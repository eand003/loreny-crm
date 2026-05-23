import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit2, Trash2, Check, AlertTriangle, Users, MapPin, Phone, Filter } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatDate, formatDateTime, getGoogleCalendarUrl, compileWhatsAppTemplate } from '../utils/helpers';
import Modal from './UI/Modal';

const Visits = ({ user, preselectedLeadForVisit, onClearPreselectedLead, activeSubTab = 'visits', setActiveSubTab }) => {
  const [visits, setVisits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // WhatsApp Template Modal states for follow-ups
  const [waTemplates, setWaTemplates] = useState([]);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState(null);
  const [compiledWaMessage, setCompiledWaMessage] = useState('');
  const [activeWaLead, setActiveWaLead] = useState(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // Filtro de corretores para gestores
  const [brokerFilter, setBrokerFilter] = useState('');
  const [profiles, setProfiles] = useState([]);

  const realtorName = user?.user_metadata?.full_name || 'Corretor/a';
  const userRole = user?.user_metadata?.role || 'broker';
  const isManager = userRole === 'manager' || userRole === 'admin';

  // Form Fields
  const [formData, setFormData] = useState({
    lead_id: '',
    property_details: '',
    visit_datetime: '',
    notes: '',
    status: 'Agendada'
  });

  useEffect(() => {
    fetchVisits();
    fetchLeads();
    fetchWaTemplates();
    if (isManager) fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      console.error('Erro ao carregar perfis de corretores:', e);
    }
  };

  // Handle pre-selected triggers from other tabs
  useEffect(() => {
    if (preselectedLeadForVisit) {
      handleOpenAddModal();
      if (preselectedLeadForVisit.id) {
        setFormData(prev => ({ 
          ...prev, 
          lead_id: preselectedLeadForVisit.id 
        }));
        setLeadSearch(preselectedLeadForVisit.name || '');
      }
      onClearPreselectedLead();
    }
  }, [preselectedLeadForVisit]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('is_deleted', false);
        
      if (error) throw error;
      setVisits(data || []);
    } catch (e) {
      console.error('Erro ao buscar visitas:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_deleted', false);
        
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error('Erro ao buscar leads:', e);
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
    } catch (err) {
      console.error('Erro ao buscar templates:', err);
    }
  };

  const handleCompleteFollowUp = async (lead) => {
    const confirmComplete = window.confirm(`Deseja marcar a tarefa de retorno para "${lead.name}" como concluída?`);
    if (!confirmComplete) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({ 
          next_action: null, 
          next_action_date: null 
        })
        .eq('id', lead.id);
        
      if (error) throw error;
      fetchLeads();
    } catch (err) {
      alert('Erro ao concluir follow-up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleFollowUp = async (lead) => {
    const newDate = window.prompt("Nova Data de Retorno (AAAA-MM-DD):", lead.next_action_date || "");
    if (newDate === null) return;
    
    const newAction = window.prompt("O que fazer no retorno?", lead.next_action || "Entrar em contato");
    if (newAction === null) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({ 
          next_action: newAction, 
          next_action_date: newDate ? newDate : null 
        })
        .eq('id', lead.id);
        
      if (error) throw error;
      fetchLeads();
    } catch (err) {
      alert('Erro ao remarcar follow-up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWaModalForLead = (lead) => {
    setActiveWaLead(lead);
    
    let defaultTemplate = null;
    if (waTemplates.length > 0) {
      defaultTemplate = waTemplates.find(t => t.title.toLowerCase().includes('acompanhamento') || t.description.toLowerCase().includes('follow')) || waTemplates[0];
    }
    setSelectedWaTemplate(defaultTemplate);

    const compiled = defaultTemplate
      ? compileWhatsAppTemplate(defaultTemplate.text_content, lead, realtorName)
      : `Olá, ${lead.name}! Tudo bem? Sou o(a) ${realtorName}, seu corretor da Loreny Imóveis. Passando para saber se teve a oportunidade de avaliar as opções de imóveis?`;

    setCompiledWaMessage(compiled);
    setIsWaModalOpen(true);
  };

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
    
    const cleanPhone = activeWaLead.phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(compiledWaMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`;
    
    window.open(waUrl, '_blank');
    setIsWaModalOpen(false);
  };

  const handleOpenAddModal = () => {
    setEditingVisit(null);
    setFormData({
      lead_id: '',
      property_details: '',
      visit_datetime: '',
      notes: '',
      status: 'Agendada'
    });
    setLeadSearch('');
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (visit) => {
    setEditingVisit(visit);
    
    // Format datetime-local input value (YYYY-MM-DDThh:mm)
    let formattedDt = '';
    if (visit.visit_datetime) {
      formattedDt = visit.visit_datetime.substring(0, 16);
    }

    setFormData({
      lead_id: visit.lead_id || '',
      property_details: visit.property_details,
      visit_datetime: formattedDt,
      notes: visit.notes || '',
      status: visit.status
    });

    const matchingLead = leads.find(l => l.id === visit.lead_id);
    setLeadSearch(matchingLead ? matchingLead.name : 'Cliente Interessado');
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.lead_id || !formData.property_details || !formData.visit_datetime) {
      alert('Por favor, preencha todos os campos obrigatórios: Cliente, Imóvel e Data/Hora.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        // Ensure standard ISO UTC string format
        visit_datetime: new Date(formData.visit_datetime).toISOString(),
        owner_id: user.id
      };

      if (editingVisit) {
        const { error } = await supabase.from('visits').update(payload).eq('id', editingVisit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('visits').insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchVisits();
    } catch (err) {
      alert('Erro ao salvar agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (visit) => {
    const confirmDelete = window.confirm(`Deseja excluir a visita de "${visit.leadName || 'Cliente'}" ao imóvel "${visit.property_details}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('visits')
        .update({ is_deleted: true })
        .eq('id', visit.id);

      if (error) throw error;

      alert('Agendamento excluído com sucesso.');
      fetchVisits();
    } catch (err) {
      alert('Erro ao excluir agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (visit, newStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('visits')
        .update({ status: newStatus })
        .eq('id', visit.id);

      if (error) throw error;
      fetchVisits();
    } catch (err) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Map lead name for rendering
  const mappedVisits = visits.map(v => {
    const matchingLead = leads.find(l => l.id === v.lead_id);
    return {
      ...v,
      leadName: matchingLead ? matchingLead.name : 'Cliente Interessado',
      leadPhone: matchingLead ? matchingLead.phone : ''
    };
  });

  const filteredVisits = mappedVisits.filter(v => brokerFilter === '' || v.owner_id === brokerFilter);
  const activeFollowUps = leads.filter(l => l.next_action_date && l.status !== 'won' && l.status !== 'lost');
  const filteredFollowUps = activeFollowUps.filter(l => brokerFilter === '' || l.owner_id === brokerFilter);

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Agenda & Atividades
        </h2>
        {activeSubTab === 'visits' && (
          <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            <Plus size={18} />
            <span>Agendar Visita</span>
          </button>
        )}
      </div>

      {/* FILTRO POR CORRETOR — visível apenas para gerente e admin */}
      {isManager && profiles.length > 0 && (
        <div className="flex align-center gap-2" style={{ overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px', borderBottom: '1px dashed var(--gray-200)' }}>
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Corretor:
          </span>
          <button
            className={`badge ${brokerFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setBrokerFilter('')}
            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Todos ({activeSubTab === 'visits' ? mappedVisits.length : activeFollowUps.length})
          </button>
          {profiles.map(p => {
            const count = activeSubTab === 'visits' 
              ? mappedVisits.filter(v => v.owner_id === p.id).length
              : activeFollowUps.filter(l => l.owner_id === p.id).length;
            
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

      {/* SUB-TABS SELECTOR */}
      <div className="flex gap-2" style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
        <button 
          className={`tab-btn`}
          onClick={() => setActiveSubTab('visits')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'visits' ? 'var(--primary-light)' : 'transparent',
            color: activeSubTab === 'visits' ? 'var(--primary-dark)' : 'var(--gray-500)',
            transition: 'all 0.2s'
          }}
        >
          📆 Visitas Imobiliárias ({filteredVisits.length})
        </button>
        <button 
          className={`tab-btn`}
          onClick={() => setActiveSubTab('followups')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'followups' ? 'var(--primary-light)' : 'transparent',
            color: activeSubTab === 'followups' ? 'var(--primary-dark)' : 'var(--gray-500)',
            transition: 'all 0.2s'
          }}
        >
          📞 Contatos & Follow-up ({filteredFollowUps.length})
        </button>
      </div>

      {/* VISITS LIST */}
      {activeSubTab === 'visits' && (
        <>
          {loading && visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Carregando agenda...</div>
          ) : filteredVisits.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Nenhuma visita encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="mobile-card-list">
              {filteredVisits.map((v) => (
                <div key={v.id} className="mobile-card" style={{ borderLeft: `4px solid ${v.status === 'Realizada' ? 'var(--primary)' : v.status === 'Cancelada' ? 'var(--status-lost)' : '#f59e0b'}` }}>
                  <div className="mobile-card-header">
                    <div>
                      <h3 className="mobile-card-title flex align-center gap-1" style={{ fontSize: '15px' }}>
                        <Users size={14} style={{ color: 'var(--gray-600)' }} /> {v.leadName}
                      </h3>
                      <div className="mobile-card-subtitle" style={{ marginTop: '4px' }}>
                        <span className="flex align-center gap-1" style={{ color: 'var(--gray-600)' }}>
                          <MapPin size={12} /> {v.property_details}
                        </span>
                      </div>
                    </div>
                    
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontWeight: 700, 
                      backgroundColor: v.status === 'Realizada' ? 'var(--status-won-bg)' : v.status === 'Cancelada' ? 'var(--status-lost-bg)' : 'rgba(245, 158, 11, 0.1)', 
                      color: v.status === 'Realizada' ? 'var(--status-won)' : v.status === 'Cancelada' ? 'var(--status-lost)' : '#f59e0b' 
                    }}>
                      {v.status}
                    </span>
                  </div>

                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--gray-900)', 
                    margin: '8px 0', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={13} style={{ color: 'var(--primary-dark)' }} />
                    <span>{formatDateTime(v.visit_datetime)}</span>
                  </div>

                  {v.notes && (
                    <p style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '12px', fontStyle: 'italic' }}>
                      "{v.notes}"
                    </p>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="mobile-card-actions" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-200)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {v.status === 'Agendada' && (
                        <>
                          <a 
                            href={getGoogleCalendarUrl(v, v.leadName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn"
                            style={{ color: 'var(--primary)', borderColor: 'rgba(197, 155, 39, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px' }}
                          >
                            📅 Calendar
                          </a>
                          <button 
                            onClick={() => handleStatusChange(v, 'Realizada')}
                            className="action-btn"
                            style={{ color: 'var(--primary)', borderColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={12} /> Realizada
                          </button>
                          <button 
                            onClick={() => handleStatusChange(v, 'Cancelada')}
                            className="action-btn"
                            style={{ color: 'var(--status-lost)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <AlertTriangle size={12} /> Cancelar
                          </button>
                        </>
                      )}
                      {v.status !== 'Agendada' && (
                        <button 
                          onClick={() => handleStatusChange(v, 'Agendada')}
                          className="action-btn"
                          style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                        >
                          Remarcar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(v)} 
                        className="action-btn" 
                        style={{ width: '36px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteVisit(v)} 
                        className="action-btn" 
                        style={{ width: '36px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--status-lost)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FOLLOW-UPS LIST */}
      {activeSubTab === 'followups' && (
        <div>
          {filteredFollowUps.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Nenhum retorno encontrado para o filtro selecionado.
            </div>
          ) : (
            <div className="mobile-card-list">
              {filteredFollowUps
                .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))
                .map((ld) => {
                  const isTodayOrOverdue = new Date(ld.next_action_date) <= new Date(new Date().setHours(23, 59, 59, 999));
                  return (
                    <div 
                      key={ld.id} 
                      className="mobile-card" 
                      style={{ 
                        borderLeft: isTodayOrOverdue ? '4px solid #f59e0b' : '4px solid var(--border-color)',
                        backgroundColor: isTodayOrOverdue ? 'rgba(245, 158, 11, 0.02)' : 'var(--card-bg)'
                      }}
                    >
                      <div className="mobile-card-header">
                        <div>
                          <h3 className="mobile-card-title flex align-center gap-1" style={{ fontSize: '15px' }}>
                            <Users size={14} style={{ color: 'var(--gray-600)' }} /> {ld.name}
                          </h3>
                          <div className="mobile-card-subtitle" style={{ marginTop: '4px' }}>
                            <span style={{ color: 'var(--primary)' }}>🏠 {ld.property_type || 'Imóvel'}</span>
                            <span>•</span>
                            <span>📍 {ld.region}</span>
                          </div>
                        </div>
                        <span style={{ 
                          fontSize: '11px', 
                          color: isTodayOrOverdue ? '#f59e0b' : 'var(--gray-500)', 
                          fontWeight: 700,
                          backgroundColor: isTodayOrOverdue ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.03)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          Retorno: {formatDate(ld.next_action_date)} {isTodayOrOverdue ? '(Urgente)' : ''}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '8px' }}>
                        <strong style={{ color: 'var(--gray-500)' }}>Ação a Fazer:</strong> {ld.next_action || 'Entrar em contato'}
                      </div>

                      {ld.notes && (
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.02)', padding: '6px 8px', borderRadius: '4px' }}>
                          "{ld.notes.substring(0, 150)}{ld.notes.length > 150 ? '...' : ''}"
                        </p>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="mobile-card-actions" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-200)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleCompleteFollowUp(ld)}
                            className="action-btn"
                            style={{ color: 'var(--status-won)', borderColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={12} /> Concluir
                          </button>
                          <button 
                            onClick={() => handleRescheduleFollowUp(ld)}
                            className="action-btn"
                            style={{ color: 'var(--primary)', borderColor: 'rgba(197, 155, 39, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Clock size={12} /> Remarcar
                          </button>
                        </div>

                        {ld.phone && (
                          <button 
                            onClick={() => handleOpenWaModalForLead(ld)}
                            className="action-btn action-btn-whatsapp"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.2)' }}
                          >
                            <Phone size={12} />
                            Contatar Cliente
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VISIT SCHEDULER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVisit ? 'Editar Agendamento' : 'Agendar Nova Visita'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Selecione o Lead / Cliente *</label>
            {leads.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--status-lost)' }}>
                Nenhum lead disponível. Cadastre um lead antes de agendar visitas!
              </div>
            ) : (
              <div>
                {/* Click outside overlay backdrop */}
                {isDropdownOpen && (
                  <div 
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 999,
                      background: 'transparent'
                    }}
                  />
                )}
                
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: 1000 }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Digite o nome do cliente..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setIsDropdownOpen(true);
                      setFormData(prev => ({ ...prev, lead_id: '' }));
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    style={{ width: '100%', paddingRight: '30px' }}
                    required={!formData.lead_id}
                  />
                  {leadSearch && (
                    <button 
                      type="button"
                      onClick={() => {
                        setLeadSearch('');
                        setFormData(prev => ({ ...prev, lead_id: '' }));
                        setIsDropdownOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--gray-400)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    marginTop: '4px'
                  }}>
                    {leads
                      .filter(lead => 
                        lead.name.toLowerCase().includes(leadSearch.toLowerCase()) || 
                        (lead.region && lead.region.toLowerCase().includes(leadSearch.toLowerCase())) ||
                        (lead.property_type && lead.property_type.toLowerCase().includes(leadSearch.toLowerCase()))
                      )
                      .slice(0, 100)
                      .map(lead => (
                        <div 
                          key={lead.id}
                          onClick={() => {
                            setLeadSearch(lead.name);
                            setFormData(prev => ({ ...prev, lead_id: lead.id }));
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'var(--gray-800)',
                            borderBottom: '1px solid rgba(0,0,0,0.02)',
                            transition: 'background 0.2s',
                            backgroundColor: formData.lead_id === lead.id ? 'var(--primary-light)' : 'transparent',
                            fontWeight: formData.lead_id === lead.id ? '600' : 'normal'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-100)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = formData.lead_id === lead.id ? 'var(--primary-light)' : 'transparent'}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{lead.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            🏠 {lead.property_type} • 📍 {lead.region}
                          </div>
                        </div>
                      ))}
                    {leads.filter(lead => 
                      lead.name.toLowerCase().includes(leadSearch.toLowerCase()) || 
                      (lead.region && lead.region.toLowerCase().includes(leadSearch.toLowerCase())) ||
                      (lead.property_type && lead.property_type.toLowerCase().includes(leadSearch.toLowerCase()))
                    ).length === 0 && (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--gray-500)', textAlign: 'center' }}>
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Identificação do Imóvel / Endereço *</label>
            <input 
              type="text" 
              name="property_details" 
              value={formData.property_details} 
              onChange={handleInputChange} 
              placeholder="Ex: Sobrado Condomínio Villaggio, Quadra B, Casa 15"
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data e Hora Agendada *</label>
              <input 
                type="datetime-local" 
                name="visit_datetime" 
                value={formData.visit_datetime} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Agendada">Agendada</option>
                <option value="Realizada">Realizada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Observações / Roteiro da Visita</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Ex: Pegar chaves na portaria. O cliente gosta de sol da tarde. Explicar condições da taxa condominial..."
              rows={3}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Salvando...' : editingVisit ? 'Salvar Alterações' : 'Confirmar Agendamento'}
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
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px', backgroundColor: '#fff', color: 'var(--gray-800)' }}
                >
                  {waTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Mensagem Personalizada (Você pode editar antes de enviar!)</label>
              <textarea 
                value={compiledWaMessage} 
                onChange={(e) => setCompiledWaMessage(e.target.value)}
                placeholder="Escreva a mensagem..."
                rows={6}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: '14px', 
                  lineHeight: '1.5', 
                  backgroundColor: '#fff', 
                  color: 'var(--gray-800)', 
                  resize: 'vertical'
                }}
              />
            </div>

            <button 
              onClick={handleSendWaMessage} 
              className="btn btn-primary btn-large"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#25d366', borderColor: '#25d366', color: '#fff', fontWeight: 600 }}
            >
              <Phone size={16} />
              <span>Enviar pelo WhatsApp</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Visits;
