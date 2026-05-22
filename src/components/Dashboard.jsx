import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, DollarSign, Plus, MapPin, Phone, ChevronRight } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';

const Dashboard = ({ user, onQuickAction, setCurrentTab }) => {
  const [stats, setStats] = useState({
    leads: 0,
    visits: 0,
    vgv: 0,
    commission: 0
  });
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtorName = user?.user_metadata?.full_name || 'Corretor/a';

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch leads that are active (not deleted)
      const { data: leadsData, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('is_deleted', false);
        
      if (leadsErr) throw leadsErr;

      const activeLeads = leadsData || [];
      
      // 2. Fetch visits
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

      setStats({
        leads: totalActiveLeadsCount,
        visits: activeVisits.filter(v => v.status === 'Agendada').length,
        vgv: vgvAtivo,
        commission: estimatedCommission
      });

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
            leadPhone: matchingLead ? matchingLead.phone : ''
          };
        });

      setUpcomingVisits(sortedVisits);

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

  return (
    <div>
      {/* Broker Header greeting */}
      <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ fontSize: '22px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Olá, {realtorName}! 🔑
        </h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '14px', lineHeight: '1.5' }}>
          "Conectando pessoas aos seus lares ideais e maximizando o Valor Geral de Vendas (VGV)."
        </p>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gray-400)', marginBottom: '12px', fontWeight: 700 }}>
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-lead')}
            style={{ padding: '16px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            <Plus size={18} />
            <span>Novo Lead</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-visit')}
            style={{ padding: '16px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', backgroundColor: 'var(--primary-dark)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            <Calendar size={18} />
            <span>Nova Visita</span>
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
      </div>

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
                  {visit.leadPhone && (
                    <div className="flex justify-end" style={{ marginTop: '10px' }}>
                      <a 
                        href={`https://wa.me/55${visit.leadPhone}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex align-center gap-1"
                        style={{ color: '#25d366', fontWeight: 700, fontSize: '12px', textDecoration: 'none' }}
                      >
                        <Phone size={12} />
                        Confirmar via WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              ))}
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
    </div>
  );
};

export default Dashboard;
