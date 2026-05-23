import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowRight, User, TrendingUp, CheckCircle, Clock, ArrowUpDown } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../utils/helpers';

const Commissions = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('budget-desc'); // Default to descending budget as requested

  useEffect(() => {
    fetchLeadsData();
  }, [user]);

  const fetchLeadsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_deleted', false);
        
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error('Erro ao buscar dados para comissões:', e);
    } finally {
      setLoading(false);
    }
  };

  // Group leads for financial math
  const activeNegotiationLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  const wonLeads = leads.filter(l => l.status === 'won');

  // Math
  const activeVgv = activeNegotiationLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const estimatedCommission = activeVgv * 0.05;

  const wonVgv = wonLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const confirmedCommission = wonVgv * 0.05;

  // Sorting function
  const getSortedLeads = (leadsList) => {
    return [...leadsList].sort((a, b) => {
      if (sortBy === 'budget-desc') {
        return (b.budget || 0) - (a.budget || 0);
      }
      if (sortBy === 'budget-asc') {
        return (a.budget || 0) - (b.budget || 0);
      }
      return a.name.localeCompare(b.name);
    });
  };

  const sortedActiveLeads = getSortedLeads(activeNegotiationLeads);
  const sortedWonLeads = getSortedLeads(wonLeads);

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <DollarSign size={22} style={{ color: 'var(--primary)' }} />
          Relatório de VGV & Comissões
        </h2>
        
        {/* SORT CONTROLLER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
          <span style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <ArrowUpDown size={14} style={{ color: 'var(--primary)' }} /> Ordenar por:
          </span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)', backgroundColor: 'var(--white)', color: 'var(--gray-800)', cursor: 'pointer' }}
          >
            <option value="budget-desc">Maior Orçamento (VGV Decrescente)</option>
            <option value="budget-asc">Menor Orçamento (VGV Crescente)</option>
            <option value="name-asc">Nome do Cliente (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '6px solid var(--primary)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          💡 Entendendo os Cálculos do CRM
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: 0, lineHeight: '1.6' }}>
          <strong>O que é o VGV?</strong> O Valor Geral de Vendas representa a soma dos orçamentos declarados de todos os seus clientes. <br />
          <strong>De onde vem a comissão?</strong> O CRM calcula automaticamente uma estimativa padrão de <strong>5% de honorários imobiliários</strong> sobre o orçamento/VGV de cada lead. Abaixo você pode ver detalhadamente a origem de cada centavo.
        </p>
      </div>

      {/* FINANCIAL METRICS ROW */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid #3b82f6' }}>
          <div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>
              {loading ? '...' : formatCurrency(activeVgv)}
            </div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> VGV Ativo no Funil
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid #a855f7' }}>
          <div>
            <div className="stat-value" style={{ color: '#a855f7' }}>
              {loading ? '...' : formatCurrency(estimatedCommission)}
            </div>
            <div className="stat-label">Comissão Estimada (5%)</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid var(--status-won)' }}>
          <div>
            <div className="stat-value" style={{ color: 'var(--status-won)' }}>
              {loading ? '...' : formatCurrency(wonVgv)}
            </div>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} /> VGV Faturado (Vendas)
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid var(--primary)' }}>
          <div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>
              {loading ? '...' : formatCurrency(confirmedCommission)}
            </div>
            <div className="stat-label" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Comissão Recebida (5%)</div>
          </div>
        </div>
      </div>

      {/* DETAILS GRID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* WON LEADS (REALIZED REVENUES) */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-won)' }}>
            <CheckCircle size={18} />
            Comissões Confirmadas (Vendas Concluídas)
          </h3>
          
          {loading ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Carregando dados...</p>
          ) : wonLeads.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              Nenhuma comissão recebida ainda. Quando um lead for marcado como "Contrato Assinado (Ganho)", ele aparecerá aqui com seus valores.
            </p>
          ) : (
            <div className="mobile-card-list">
              {sortedWonLeads.map(ld => {
                const commission = (ld.budget || 0) * 0.05;
                return (
                  <div key={ld.id} className="mobile-card" style={{ borderLeft: '4px solid var(--status-won)', padding: '14px' }}>
                    <div className="flex justify-between align-center">
                      <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>{ld.name}</strong>
                      <span className="badge badge-won" style={{ fontSize: '10px' }}>Faturado</span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      🏠 {ld.property_type} em {ld.region}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--gray-200)', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--gray-500)' }}>Valor Imóvel:</span>{' '}
                        <strong style={{ color: 'var(--gray-800)' }}>{formatCurrency(ld.budget || 0)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>Sua Comissão (5%):</span>{' '}
                        <strong style={{ color: 'var(--status-won)', fontSize: '14px' }}>{formatCurrency(commission)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ACTIVE LEADS (ESTIMATED REVENUES) */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
            <Clock size={18} />
            Origem das Comissões Estimadas (Pipeline em Andamento)
          </h3>
          
          {loading ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Carregando dados...</p>
          ) : sortedActiveLeads.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              Nenhum lead em andamento no funil com orçamento definido.
            </p>
          ) : (
            <div className="mobile-card-list">
              {sortedActiveLeads.map(ld => {
                const commission = (ld.budget || 0) * 0.05;
                return (
                  <div key={ld.id} className="mobile-card" style={{ borderLeft: '4px solid #3b82f6', padding: '14px' }}>
                    <div className="flex justify-between align-center">
                      <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>{ld.name}</strong>
                      <span className={`badge badge-${ld.status}`} style={{ fontSize: '10px' }}>
                        {ld.status === 'new' ? 'Novo' : ld.status === 'contacted' ? 'Contato' : ld.status === 'visit_scheduled' ? 'Visita' : ld.status === 'visited' ? 'Visto' : 'Negociando'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      🏠 {ld.property_type} em {ld.region}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--gray-200)', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--gray-500)' }}>Valor Imóvel:</span>{' '}
                        <strong style={{ color: 'var(--gray-800)' }}>{formatCurrency(ld.budget || 0)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>Comissão Prevista (5%):</span>{' '}
                        <strong style={{ color: '#3b82f6', fontSize: '14px' }}>{formatCurrency(commission)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Commissions;
