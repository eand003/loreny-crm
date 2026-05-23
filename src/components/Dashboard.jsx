import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, DollarSign, Plus, MapPin, Phone, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency, formatDate, formatDateTime, compileWhatsAppTemplate, getGoogleCalendarUrl } from '../utils/helpers';
import Modal from './UI/Modal';

const Dashboard = ({ user, onQuickAction, setCurrentTab, setVisitsSubTab }) => {
  const [stats, setStats] = useState({
    leads: 0,
    visits: 0,
    vgv: 0,
    commission: 0,
    followups: 0
  });
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // WhatsApp Template Modal states
  const [waTemplates, setWaTemplates] = useState([]);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState(null);
  const [compiledWaMessage, setCompiledWaMessage] = useState('');
  const [activeWaVisit, setActiveWaVisit] = useState(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [isNewFollowUpModalOpen, setIsNewFollowUpModalOpen] = useState(false);
  const [newFollowUpLeadId, setNewFollowUpLeadId] = useState('');
  const [newFollowUpLeadSearch, setNewFollowUpLeadSearch] = useState('');
  const [isNewFollowUpDropdownOpen, setIsNewFollowUpDropdownOpen] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpAction, setNewFollowUpAction] = useState('Entrar em contato');

  // Controle de Performance da Equipe
  const [profiles, setProfiles] = useState([]);
  const [brokerPerformance, setBrokerPerformance] = useState([]);

  const realtorName = user?.user_metadata?.full_name || 'Corretor/a';
  const userRole = user?.user_metadata?.role || 'broker';
  const isManager = userRole === 'manager' || userRole === 'admin';

  useEffect(() => {
    fetchDashboardData();
    fetchTemplates();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar perfis se for gestor para o hub de performance
      let profilesList = [];
      if (isManager) {
        const { data: profs, error: profsErr } = await supabase
          .from('profiles')
          .select('*');
        if (profsErr) throw profsErr;
        profilesList = profs || [];
        setProfiles(profilesList);
      }

      // 2. Fetch leads that are active (not deleted)
      const { data: leadsData, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('is_deleted', false);
        
      if (leadsErr) throw leadsErr;

      const activeLeads = leadsData || [];
      setAllLeads(activeLeads);
      
      // 3. Fetch visits
      const { data: visitsData, error: visitsErr } = await supabase
        .from('visits')
        .select('*')
        .eq('is_deleted', false);
        
      if (visitsErr) throw visitsErr;

      const activeVisits = visitsData || [];

      // Calculate Real Estate metrics
      const activeNegotiationLeads = activeLeads.filter(l => l.status !== 'won' && l.status !== 'lost');
      const totalActiveLeadsCount = activeNegotiationLeads.length;

      // VGV Ativo = Sum of budget of all active negotiation leads
      const vgvAtivo = activeNegotiationLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
      
      // Commission estimated = 5% of active VGV
      const estimatedCommission = vgvAtivo * 0.05;

      // Calculate Follow-up tasks count
      const totalFollowUps = activeLeads.filter(l => l.next_action_date && l.status !== 'won' && l.status !== 'lost').length;

      setStats({
        leads: totalActiveLeadsCount,
        visits: activeVisits.filter(v => v.status === 'Agendada').length,
        vgv: vgvAtivo,
        commission: estimatedCommission,
        followups: totalFollowUps
      });

      // Calcular performance dos corretores se for gestor
      if (isManager && profilesList.length > 0) {
        const perf = profilesList.map(prof => {
          const brokerLeads = activeLeads.filter(l => l.owner_id === prof.id);
          const brokerVisits = activeVisits.filter(v => v.owner_id === prof.id);
          
          const activeNegotiations = brokerLeads.filter(l => l.status !== 'won' && l.status !== 'lost');
          const wonLeads = brokerLeads.filter(l => l.status === 'won');
          
          const totalVGV = activeNegotiations.reduce((acc, curr) => acc + (curr.budget || 0), 0);
          const wonVGV = wonLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
          
          const rate = prof.commission_rate || 5.00;
          const commissionEarned = wonVGV * (rate / 100);

          return {
            id: prof.id,
            full_name: prof.full_name || prof.email.split('@')[0],
            email: prof.email,
            role: prof.role,
            activeLeadsCount: activeNegotiations.length,
            wonLeadsCount: wonLeads.length,
            totalVGV,
            wonVGV,
            commissionEarned,
            visitsCount: brokerVisits.filter(v => v.status === 'Agendada').length
          };
        }).sort((a, b) => b.totalVGV - a.totalVGV); // Rank by VGV

        setBrokerPerformance(perf);
      }

      // Upcoming visits matching lead names
      const sortedVisits = activeVisits
        .filter(v => v.status === 'Agendada' && new Date(v.visit_datetime) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.visit_datetime) - new Date(b.visit_datetime))
        .slice(0, 3)
        .map(visit => {
          const matchingLead = activeLeads.find(l => l.id === visit.lead_id);
          return {
            ...visit,
            leadName: matchingLead ? matchingLead.name : 'Cliente Interessado',
            leadPhone: matchingLead ? matchingLead.phone : '',
            lead: matchingLead
          };
        });

      setUpcomingVisits(sortedVisits);

      // Follow-up tasks (leads with next_action_date scheduled)
      const followUps = activeLeads
        .filter(l => l.next_action_date && l.status !== 'won' && l.status !== 'lost')
        .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))
        .slice(0, 5);
        
      setUpcomingFollowUps(followUps);

      // Latest leads created (timeline)
      const latestLeads = [...activeLeads]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);
        
      setRecentLeads(latestLeads);

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard imobiliário:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_templates').select('*');
      if (error) throw error;
      setWaTemplates(data || []);
      
      if (data && data.length > 0) {
        const confirmTemplate = data.find(t => t.title.toLowerCase().includes('confirma') || t.description.toLowerCase().includes('visita'));
        setSelectedWaTemplate(confirmTemplate || data[0]);
      }
    } catch (err) {
      console.error('Erro ao buscar templates no dashboard:', err);
    }
  };

  const handleOpenWaModal = (visit) => {
    setActiveWaVisit(visit);
    
    let defaultTemplate = null;
    if (waTemplates.length > 0) {
      const confirmTemplate = waTemplates.find(t => t.title.toLowerCase().includes('confirma') || t.description.toLowerCase().includes('visita'));
      defaultTemplate = confirmTemplate || waTemplates[0];
    }
    setSelectedWaTemplate(defaultTemplate);

    const compiled = defaultTemplate && visit.lead
      ? compileWhatsAppTemplate(defaultTemplate.text_content, visit.lead, realtorName, visit)
      : `Olá, ${visit.leadName}! Tudo bem? Sou o(a) ${realtorName}, seu corretor da Loreny Imóveis. Gostaria de confirmar nossa visita agendada no imóvel ${visit.property_details} no dia ${formatDateTime(visit.visit_datetime)}.`;

    setCompiledWaMessage(compiled);
    setIsWaModalOpen(true);
  };

  const handleWaTemplateChange = (templateId) => {
    const template = waTemplates.find(t => t.id === templateId);
    setSelectedWaTemplate(template);
    
    if (template && activeWaVisit && activeWaVisit.lead) {
      const compiled = compileWhatsAppTemplate(template.text_content, activeWaVisit.lead, realtorName, activeWaVisit);
      setCompiledWaMessage(compiled);
    }
  };

  const handleSendWaMessage = () => {
    if (!activeWaVisit || !compiledWaMessage) return;
    
    const cleanPhone = activeWaVisit.leadPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(compiledWaMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`;
    
    window.open(waUrl, '_blank');
    setIsWaModalOpen(false);
  };

  const handleOpenWaModalForLead = (lead) => {
    setActiveWaVisit({
      lead: lead,
      leadName: lead.name,
      leadPhone: lead.phone,
      property_details: `${lead.property_type} em ${lead.region}`,
      visit_datetime: lead.next_action_date
    });
    
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
      fetchDashboardData();
    } catch (err) {
      alert('Erro ao concluir follow-up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleFollowUp = async (lead) => {
    const newDate = window.prompt("Nova Data de Retorno (AAAA-MM-DD):", lead.next_action_date || "");
    if (newDate === null) return; // cancelado
    
    const newAction = window.prompt("O que fazer no retorno?", lead.next_action || "Entrar em contato");
    if (newAction === null) return; // cancelado
    
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
      fetchDashboardData();
    } catch (err) {
      alert('Erro ao remarcar follow-up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewFollowUpModal = () => {
    setNewFollowUpLeadId('');
    setNewFollowUpLeadSearch('');
    setIsNewFollowUpDropdownOpen(false);
    setNewFollowUpDate('');
    setNewFollowUpAction('Entrar em contato');
    setIsNewFollowUpModalOpen(true);
  };

  const handleCreateNewFollowUp = async (e) => {
    e.preventDefault();
    
    if (!newFollowUpLeadId || !newFollowUpDate || !newFollowUpAction.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios: Cliente, Data e O que fazer.');
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('leads')
        .update({
          next_action: newFollowUpAction.trim(),
          next_action_date: newFollowUpDate
        })
        .eq('id', newFollowUpLeadId);
        
      if (error) throw error;
      
      setIsNewFollowUpModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert('Erro ao agendar retorno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Broker Header greeting */}
      <div className="glass-card" style={{ 
        marginBottom: '24px', 
        borderLeft: userRole === 'admin' 
          ? '6px solid #3b82f6' 
          : userRole === 'manager' 
            ? '6px solid #a855f7' 
            : '6px solid var(--primary)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px' 
      }}>
        <h2 style={{ fontSize: '22px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Olá, {realtorName}! 🔑
        </h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '14px', lineHeight: '1.5' }}>
          {userRole === 'admin' 
            ? '"Direção estratégica e governança absoluta da carteira geral de VGV imobiliário."' 
            : userRole === 'manager'
              ? '"Supervisionando a equipe de vendas e otimizando a conversão do pipeline da imobiliária."'
              : '"Conectando pessoas aos seus lares ideais e maximizando o Valor Geral de Vendas (VGV)."'}
        </p>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gray-400)', marginBottom: '12px', fontWeight: 700 }}>
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-lead')}
            style={{ padding: '16px 8px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px' }}
          >
            <Plus size={18} />
            <span>Novo Lead</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-visit')}
            style={{ padding: '16px 8px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', backgroundColor: 'var(--primary-dark)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px' }}
          >
            <Calendar size={18} />
            <span>Nova Visita</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenNewFollowUpModal}
            style={{ padding: '16px 8px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', backgroundColor: '#d9a72b', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px' }}
          >
            <Clock size={18} />
            <span>Novo Retorno</span>
          </button>
        </div>
      </div>

      {/* FINANCIAL & LEAD METRICS */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card" onClick={() => setCurrentTab('leads')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.leads}</div>
            <div className="stat-label">Leads em Negociação</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setCurrentTab('visits')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.visits}</div>
            <div className="stat-label">Visitas Agendadas</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 800 }}>
              {loading ? '...' : formatCurrency(stats.vgv)}
            </div>
            <div className="stat-label">VGV Ativo no Funil</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 800 }}>
              {loading ? '...' : formatCurrency(stats.commission)}
            </div>
            <div className="stat-label">Comissão Estimada (5%)</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => { setVisitsSubTab('followups'); setCurrentTab('visits'); }} style={{ cursor: 'pointer', border: '1px solid rgba(217, 167, 43, 0.2)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(217, 167, 43, 0.1)', color: '#d9a72b' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#d9a72b' }}>{loading ? '...' : stats.followups}</div>
            <div className="stat-label">Follow-ups Agendados</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO PERFORMANCE DA EQUIPE — Visível apenas para gestores */}
      {isManager && brokerPerformance.length > 0 && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <h3 className="flex align-center gap-2" style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏆 Performance & VGV da Equipe
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {brokerPerformance.map((broker) => {
              // Calcular a porcentagem do VGV deste corretor em relação ao VGV total
              const totalTeamVGV = stats.vgv || 1; // evitar divisão por 0
              const percentage = Math.min((broker.totalVGV / totalTeamVGV) * 100, 100);

              let roleColor = 'var(--primary)'; // Gold
              let roleName = 'Corretor';
              if (broker.role === 'manager') {
                roleColor = '#a855f7'; // Purple
                roleName = 'Gerente';
              } else if (broker.role === 'admin') {
                roleColor = '#3b82f6'; // Blue
                roleName = 'Diretor';
              }

              return (
                <div key={broker.id} style={{ 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Cabeçalho do Corretor */}
                  <div className="flex justify-between align-center" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        backgroundColor: roleColor, 
                        color: 'var(--white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}>
                        {broker.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)' }}>
                          {broker.full_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          {roleName} • {broker.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                        {formatCurrency(broker.totalVGV)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 500 }}>
                        VGV Ativo no Funil
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso / Participação no VGV */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                      <span>Participação no VGV Geral</span>
                      <span style={{ fontWeight: 600 }}>{percentage.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--primary)',
                        borderRadius: '4px',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}></div>
                    </div>
                  </div>

                  {/* Métricas Auxiliares */}
                  <div className="flex" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '8px', fontSize: '12px', color: 'var(--gray-600)' }}>
                    <div>
                      <strong>Leads Ativos:</strong> {broker.activeLeadsCount}
                    </div>
                    <div>
                      <strong>Visitas Agendadas:</strong> {broker.visitsCount}
                    </div>
                    <div>
                      <strong>Vendas Concluídas:</strong> {broker.wonLeadsCount}
                    </div>
                    {broker.commissionEarned > 0 && (
                      <div style={{ marginLeft: 'auto', color: 'var(--status-won)', fontWeight: 600 }}>
                        💰 Comissão Confirmada: {formatCurrency(broker.commissionEarned)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DASHBOARD BOTTOM ROW */}
      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '24px', display: 'flex', flexDirection: 'column' }}>
        
        {/* UPCOMING PROPERTY VISITS */}
        <div className="card">
          <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="flex align-center gap-2" style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              Próximas Visitas Agendadas
            </h3>
            <button className="tab-btn" onClick={() => setCurrentTab('visits')} style={{ padding: 0, fontSize: '13px', fontWeight: 600 }}>
              Ver todas
            </button>
          </div>

          {upcomingVisits.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Nenhuma visita agendada nos próximos dias.
            </p>
          ) : (
            <div className="mobile-card-list">
              {upcomingVisits.map((visit) => (
                <div key={visit.id} className="mobile-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="flex justify-between align-center">
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                      {visit.leadName}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 600 }}>
                      📆 {formatDateTime(visit.visit_datetime)}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '6px' }}>
                    <strong style={{ color: 'var(--gray-500)' }}>Imóvel:</strong> {visit.property_details}
                  </div>
                  {visit.notes && (
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{visit.notes}"
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                    <a 
                      href={getGoogleCalendarUrl(visit, visit.leadName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex align-center gap-1"
                      style={{ 
                        fontSize: '12px', 
                        color: 'var(--primary)', 
                        fontWeight: 600, 
                        textDecoration: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px' 
                      }}
                    >
                      <span>📅 Google Calendar</span>
                    </a>
                    {visit.leadPhone && (
                      <button 
                        onClick={() => handleOpenWaModal(visit)}
                        className="flex align-center gap-1"
                        style={{ 
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#25d366', 
                          fontWeight: 700, 
                          fontSize: '12px', 
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={12} />
                        Confirmar WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLIENT FOLLOW-UP TASKS */}
        <div className="card">
          <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="flex align-center gap-2" style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              Tarefas de Follow-up (Retorno de Clientes)
            </h3>
            <button className="tab-btn" onClick={() => setCurrentTab('leads')} style={{ padding: 0, fontSize: '13px', fontWeight: 600 }}>
              Ver todos contatos
            </button>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Nenhum retorno de cliente pendente no momento.
            </p>
          ) : (
            <div className="mobile-card-list">
              {upcomingFollowUps.map((ld) => {
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
                    <div className="flex justify-between align-center">
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                        {ld.name}
                      </span>
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
                    <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '6px' }}>
                      <strong style={{ color: 'var(--gray-500)' }}>Ação:</strong> {ld.next_action || 'Entrar em contato'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                      Interesse: {ld.property_type} em {ld.region}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleCompleteFollowUp(ld)}
                          className="action-btn"
                          style={{ fontSize: '11px', color: 'var(--status-won)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          Concluir
                        </button>
                        <button 
                          onClick={() => handleRescheduleFollowUp(ld)}
                          className="action-btn"
                          style={{ fontSize: '11px', color: 'var(--primary)', borderColor: 'rgba(197, 155, 39, 0.2)', padding: '2px 8px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          Remarcar
                        </button>
                      </div>

                      {ld.phone && (
                        <button 
                          onClick={() => handleOpenWaModalForLead(ld)}
                          className="flex align-center gap-1"
                          style={{ 
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#25d366', 
                            fontWeight: 700, 
                            fontSize: '12px', 
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
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

        {/* RECENT LEADS TIMELINE */}
        <div className="card">
          <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="flex align-center gap-2" style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              Leads Recém-Cadastrados
            </h3>
            <button className="tab-btn" onClick={() => setCurrentTab('leads')} style={{ padding: 0, fontSize: '13px', fontWeight: 600 }}>
              Ver funil completo
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Nenhum lead cadastrado ainda. Comece criando um novo lead!
            </p>
          ) : (
            <div className="timeline">
              {recentLeads.map((ld) => (
                <div key={ld.id} className="timeline-item">
                  <div className="timeline-dot" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <div className="timeline-header">
                    <span style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{ld.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{formatDate(ld.created_at)}</span>
                  </div>
                  <div className="timeline-title" style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '2px' }}>
                    Interesse em {ld.property_type} em {ld.region} • {formatCurrency(ld.budget)}
                  </div>
                  {ld.notes && (
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{ld.notes.substring(0, 100)}{ld.notes.length > 100 ? '...' : ''}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* WHATSAPP CUSTOMIZABLE MESSAGE TEMPLATES MODAL */}
      <Modal 
        isOpen={isWaModalOpen} 
        onClose={() => setIsWaModalOpen(false)} 
        title="Confirmar Agendamento de Visita 🗓️"
      >
        {activeWaVisit && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                <strong>Cliente:</strong> {activeWaVisit.leadName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                Imóvel: {activeWaVisit.property_details} • Data: {formatDateTime(activeWaVisit.visit_datetime)}
              </div>
            </div>

            {waTemplates.length > 0 ? (
              <div className="form-group">
                <label>Escolha o Modelo de Confirmação</label>
                <select 
                  value={selectedWaTemplate?.id || ''} 
                  onChange={(e) => handleWaTemplateChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px', backgroundColor: '#fff', color: 'var(--gray-800)' }}
                >
                  {waTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>
                Nenhum template personalizado encontrado. Usando mensagem padrão de confirmação.
              </div>
            )}

            <div className="form-group">
              <label>Mensagem a ser enviada (Edite livremente antes de enviar)</label>
              <textarea 
                value={compiledWaMessage} 
                onChange={(e) => setCompiledWaMessage(e.target.value)} 
                rows={8}
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '1.5', backgroundColor: '#fff', color: 'var(--gray-800)', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => setIsWaModalOpen(false)} 
                className="btn btn-outline" 
                style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendWaMessage} 
                className="btn btn-primary" 
                style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#25d366', borderColor: '#25d366', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
              >
                <span>Enviar para o WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* AGENDAR RETORNO (NEW FOLLOW-UP) QUICK ACTION MODAL */}
      <Modal 
        isOpen={isNewFollowUpModalOpen} 
        onClose={() => setIsNewFollowUpModalOpen(false)} 
        title="Agendar Retorno de Cliente (Follow-up) 📞"
      >
        <form onSubmit={handleCreateNewFollowUp}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Selecione o Cliente / Lead *</label>
            {allLeads.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--status-lost)' }}>
                Nenhum cliente cadastrado no momento. Cadastre um lead primeiro!
              </div>
            ) : (
              <div>
                {/* Click outside overlay backdrop */}
                {isNewFollowUpDropdownOpen && (
                  <div 
                    onClick={() => setIsNewFollowUpDropdownOpen(false)}
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
                    value={newFollowUpLeadSearch}
                    onChange={(e) => {
                      setNewFollowUpLeadSearch(e.target.value);
                      setIsNewFollowUpDropdownOpen(true);
                      setNewFollowUpLeadId('');
                    }}
                    onFocus={() => setIsNewFollowUpDropdownOpen(true)}
                    style={{ width: '100%', paddingRight: '30px', backgroundColor: '#fff', color: 'var(--gray-800)', border: '1px solid var(--border-color)' }}
                    required={!newFollowUpLeadId}
                  />
                  {newFollowUpLeadSearch && (
                    <button 
                      type="button"
                      onClick={() => {
                        setNewFollowUpLeadSearch('');
                        setNewFollowUpLeadId('');
                        setIsNewFollowUpDropdownOpen(true);
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
                
                {isNewFollowUpDropdownOpen && (
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
                    {allLeads
                      .filter(lead => 
                        lead.name.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase()) || 
                        (lead.region && lead.region.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase())) ||
                        (lead.property_type && lead.property_type.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase()))
                      )
                      .slice(0, 100)
                      .map(lead => (
                        <div 
                          key={lead.id}
                          onClick={() => {
                            setNewFollowUpLeadSearch(lead.name);
                            setNewFollowUpLeadId(lead.id);
                            setIsNewFollowUpDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'var(--gray-800)',
                            borderBottom: '1px solid rgba(0,0,0,0.02)',
                            transition: 'background 0.2s',
                            backgroundColor: newFollowUpLeadId === lead.id ? 'var(--primary-light)' : 'transparent',
                            fontWeight: newFollowUpLeadId === lead.id ? '600' : 'normal',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-100)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = newFollowUpLeadId === lead.id ? 'var(--primary-light)' : 'transparent'}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{lead.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            🏠 {lead.property_type} • 📍 {lead.region}
                          </div>
                        </div>
                      ))}
                    {allLeads.filter(lead => 
                      lead.name.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase()) || 
                      (lead.region && lead.region.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase())) ||
                      (lead.property_type && lead.property_type.toLowerCase().includes(newFollowUpLeadSearch.toLowerCase()))
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
          
          <div className="form-row">
            <div className="form-group">
              <label>Data de Retorno *</label>
              <input 
                type="date" 
                value={newFollowUpDate} 
                onChange={(e) => setNewFollowUpDate(e.target.value)} 
                required 
                style={{ backgroundColor: '#fff', color: 'var(--gray-800)', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div className="form-group">
              <label>O que fazer no retorno? *</label>
              <input 
                type="text" 
                value={newFollowUpAction} 
                onChange={(e) => setNewFollowUpAction(e.target.value)} 
                placeholder="Ex: Entrar em contato para tirar dúvidas"
                required 
                style={{ backgroundColor: '#fff', color: 'var(--gray-800)', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ marginTop: '10px' }}>
            {loading ? 'Agendando...' : 'Confirmar Retorno'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
