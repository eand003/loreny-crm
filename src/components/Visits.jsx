import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit2, Trash2, Check, AlertTriangle, Users, MapPin } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatDate, formatDateTime, getGoogleCalendarUrl } from '../utils/helpers';
import Modal from './UI/Modal';

const Visits = ({ user, preselectedLeadForVisit, onClearPreselectedLead }) => {
  const [visits, setVisits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);

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
  }, [user]);

  // Handle pre-selected triggers from other tabs
  useEffect(() => {
    if (preselectedLeadForVisit) {
      handleOpenAddModal();
      if (preselectedLeadForVisit.id) {
        setFormData(prev => ({ 
          ...prev, 
          lead_id: preselectedLeadForVisit.id 
        }));
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

  const handleOpenAddModal = () => {
    setEditingVisit(null);
    setFormData({
      lead_id: leads.length > 0 ? leads[0].id : '',
      property_details: '',
      visit_datetime: '',
      notes: '',
      status: 'Agendada'
    });
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

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Agenda de Visitas
        </h2>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          <Plus size={18} />
          <span>Agendar Visita</span>
        </button>
      </div>

      {loading && visits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Carregando agenda...</div>
      ) : mappedVisits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhuma visita agendada. Clique em "Agendar Visita" para iniciar sua rotina!
        </div>
      ) : (
        <div className="mobile-card-list">
          {mappedVisits.map((v) => (
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

      {/* VISIT SCHEDULER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVisit ? 'Editar Agendamento' : 'Agendar Nova Visita'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Selecione o Lead / Cliente *</label>
            {leads.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--status-lost)' }}>
                Nenhum lead disponível. Cadastre um lead antes de agendar visitas!
              </div>
            ) : (
              <select name="lead_id" value={formData.lead_id} onChange={handleInputChange} required>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.property_type} em {lead.region})
                  </option>
                ))}
              </select>
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
    </div>
  );
};

export default Visits;
