import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowRight, User, TrendingUp, CheckCircle, Clock, ArrowUpDown, Percent, Calculator, Award, Shield } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../utils/helpers';

const Commissions = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('budget-desc');
  const [activeSubTab, setActiveSubTab] = useState('report'); // 'report', 'commission_sim', 'financing_sim'

  // Goal Tracker states (persistent via localStorage)
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const saved = localStorage.getItem('loreny_monthly_commission_goal');
    return saved ? parseFloat(saved) : 30000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal);

  // Commission Simulator states
  const [simPropertyValue, setSimPropertyValue] = useState(500000);
  const [simDiscount, setSimDiscount] = useState(0); // in %
  const [simCommissionRate, setSimCommissionRate] = useState(5); // in %
  const [simHasPartner, setSimHasPartner] = useState(false);
  const [simPartnerSplit, setSimPartnerSplit] = useState(50); // in % split
  const [simTaxType, setSimTaxType] = useState('none'); // 'none', 'pj' (6%), 'pf' (15% avg)

  // Financing & Income Simulator states
  const [finPropertyValue, setFinPropertyValue] = useState(500000);
  const [finDownPayment, setFinDownPayment] = useState(100000); // 20% default
  const [finTerm, setFinTerm] = useState(360); // 30 years
  const [finInterestRate, setFinInterestRate] = useState(9.5); // % p.a.
  const [finSystem, setFinSystem] = useState('sac'); // 'sac' or 'price'
  const [finClientIncome, setFinClientIncome] = useState(15000); // Default R$ 15.000,00

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

  // Group leads for financial calculations
  const activeNegotiationLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  const wonLeads = leads.filter(l => l.status === 'won');

  // VGV & Standard 5% Commission
  const activeVgv = activeNegotiationLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const estimatedCommission = activeVgv * 0.05;

  const wonVgv = wonLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const confirmedCommission = wonVgv * 0.05;

  // Probability-weighted realistic commission forecast
  const weightedCommission = activeNegotiationLeads.reduce((acc, curr) => {
    const commission = (curr.budget || 0) * 0.05;
    let probability = 0.1; // 10% for new lead
    if (curr.status === 'contacted') probability = 0.2;
    else if (curr.status === 'visit_scheduled') probability = 0.4;
    else if (curr.status === 'visited') probability = 0.5;
    else if (curr.status === 'proposal') probability = 0.8;
    
    return acc + (commission * probability);
  }, 0);

  // Goal progress math
  const goalProgressWon = monthlyGoal > 0 ? Math.min((confirmedCommission / monthlyGoal) * 100, 100) : 0;
  const goalProgressWeighted = monthlyGoal > 0 ? Math.min(((confirmedCommission + weightedCommission) / monthlyGoal) * 100, 100) : 0;

  // Sorting helper
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

  // 1. Commission Simulator Math
  const finalPropertyPrice = simPropertyValue * (1 - simDiscount / 100);
  const totalGrossCommission = finalPropertyPrice * (simCommissionRate / 100);
  
  const brokerShareRate = simHasPartner ? (100 - simPartnerSplit) / 100 : 1;
  const partnerShareRate = simHasPartner ? simPartnerSplit / 100 : 0;
  
  const brokerGrossShare = totalGrossCommission * brokerShareRate;
  const partnerGrossShare = totalGrossCommission * partnerShareRate;
  
  let estimatedTaxes = 0;
  if (simTaxType === 'pj') {
    estimatedTaxes = brokerGrossShare * 0.06; // PJ standard flat rate
  } else if (simTaxType === 'pf') {
    estimatedTaxes = brokerGrossShare * 0.15; // PF progressive flat estimate
  }
  
  const brokerNetShare = brokerGrossShare - estimatedTaxes;

  // 2. Financing & Income Simulator Math
  const loanAmount = Math.max(0, finPropertyValue - finDownPayment);
  const LTVRate = finPropertyValue > 0 ? (loanAmount / finPropertyValue) * 100 : 0;
  const minRequiredDownPayment = finPropertyValue * 0.20;
  const hasInsufficientDownPayment = finDownPayment < minRequiredDownPayment;

  // Monthly compound interest rate
  const monthlyInterestRate = (finInterestRate / 12) / 100;
  
  let finFirstInstallment = 0;
  let finLastInstallment = 0;
  
  if (loanAmount > 0 && finTerm > 0) {
    if (finSystem === 'sac') {
      const monthlyAmortization = loanAmount / finTerm;
      finFirstInstallment = monthlyAmortization + (loanAmount * monthlyInterestRate);
      finLastInstallment = monthlyAmortization + (monthlyAmortization * monthlyInterestRate);
    } else {
      const rateFactor = Math.pow(1 + monthlyInterestRate, finTerm);
      finFirstInstallment = (loanAmount * monthlyInterestRate * rateFactor) / (rateFactor - 1);
      finLastInstallment = finFirstInstallment; // price is constant
    }
  }

  // 30% monthly installment gross income compromise rule
  const finMinRequiredIncome = finFirstInstallment > 0 ? finFirstInstallment / 0.30 : 0;
  const finCompromiseRate = finClientIncome > 0 ? (finFirstInstallment / finClientIncome) * 100 : 0;

  // Handler for financing property value change to auto-suggest 20% down payment
  const handleFinPropertyValueChange = (val) => {
    setFinPropertyValue(val);
    setFinDownPayment(val * 0.20);
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <DollarSign size={22} style={{ color: 'var(--primary)' }} />
          Gestão de Vendas & Simuladores Operacionais
        </h2>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex gap-2" style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', overflowX: 'auto' }}>
        <button 
          className={`tab-btn`}
          onClick={() => setActiveSubTab('report')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'report' ? 'var(--primary-light)' : 'transparent',
            color: activeSubTab === 'report' ? 'var(--primary-dark)' : 'var(--gray-500)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          📊 Relatório & Metas
        </button>
        <button 
          className={`tab-btn`}
          onClick={() => setActiveSubTab('commission_sim')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'commission_sim' ? 'var(--primary-light)' : 'transparent',
            color: activeSubTab === 'commission_sim' ? 'var(--primary-dark)' : 'var(--gray-500)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🧮 Simulador de Comissão
        </button>
        <button 
          className={`tab-btn`}
          onClick={() => setActiveSubTab('financing_sim')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'financing_sim' ? 'var(--primary-light)' : 'transparent',
            color: activeSubTab === 'financing_sim' ? 'var(--primary-dark)' : 'var(--gray-500)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          🏦 Simulador de Financiamento & Renda
        </button>
      </div>

      {/* TAB 1: REPORT & METAS */}
      {activeSubTab === 'report' && (
        <div>
          {/* MONTHLY GOAL PROGRESS TRACKER CARD */}
          <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--primary)', backgroundColor: 'var(--white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={18} style={{ color: 'var(--primary)' }} />
                  Minha Meta Financeira Mensal
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '2px 0 0 0' }}>
                  Rastreamento e progresso com base em contratos fechados
                </p>
              </div>

              {/* Edit monthly goal */}
              <div>
                {isEditingGoal ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>R$</span>
                    <input 
                      type="number" 
                      value={tempGoal} 
                      onChange={(e) => setTempGoal(e.target.value)} 
                      style={{ width: '110px', padding: '4px 8px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)', height: '30px' }}
                    />
                    <button 
                      onClick={() => {
                        const val = parseFloat(tempGoal) || 0;
                        setMonthlyGoal(val);
                        localStorage.setItem('loreny_monthly_commission_goal', val);
                        setIsEditingGoal(false);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '12px', height: '30px' }}
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={() => setIsEditingGoal(false)}
                      className="action-btn"
                      style={{ height: '30px', padding: '0 8px', fontSize: '12px' }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Meta:</span>
                    <strong style={{ color: 'var(--gray-900)', fontSize: '15px' }}>{formatCurrency(monthlyGoal)}</strong>
                    <button 
                      onClick={() => {
                        setTempGoal(monthlyGoal);
                        setIsEditingGoal(true);
                      }}
                      className="action-btn"
                      style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                    >
                      Definir Meta
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Goal Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Confirmed commissions progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--status-won)' }}>🏆 Comissão Confirmada (Contrato Fechado)</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(confirmedCommission)} ({goalProgressWon.toFixed(1)}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${goalProgressWon}%`, height: '100%', backgroundColor: 'var(--status-won)', borderRadius: '4px', transition: 'width 0.4s' }}></div>
                </div>
              </div>

              {/* Realistic weighted forecast progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>📈 Previsão Ponderada (Contratos + Funil Realista)</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(confirmedCommission + weightedCommission)} ({goalProgressWeighted.toFixed(1)}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${goalProgressWeighted}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s' }}></div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--gray-500)', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                  * A comissão ponderada é calculada pela probabilidade real de fechamento de cada lead em seu estágio do funil (Novo: 10%, Visita: 40%, Proposta: 80%).
                </p>
              </div>
            </div>
          </div>

          {/* FINANCIAL STAT CARDS */}
          <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
            <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid #3b82f6' }}>
              <div>
                <div className="stat-value" style={{ color: '#3b82f6', fontSize: '24px' }}>
                  {loading ? '...' : formatCurrency(activeVgv)}
                </div>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> VGV Ativo no Funil
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid #a855f7' }}>
              <div>
                <div className="stat-value" style={{ color: '#a855f7', fontSize: '24px' }}>
                  {loading ? '...' : formatCurrency(estimatedCommission)}
                </div>
                <div className="stat-label">Comissão Estimada (Total)</div>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid #d9a72b' }}>
              <div>
                <div className="stat-value" style={{ color: '#d9a72b', fontSize: '24px' }}>
                  {loading ? '...' : formatCurrency(weightedCommission)}
                </div>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={12} /> Expectativa Realista
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: 'default', borderLeft: '4px solid var(--status-won)' }}>
              <div>
                <div className="stat-value" style={{ color: 'var(--status-won)', fontSize: '24px' }}>
                  {loading ? '...' : formatCurrency(confirmedCommission)}
                </div>
                <div className="stat-label" style={{ fontWeight: 600 }}>Comissão Recebida</div>
              </div>
            </div>
          </div>

          {/* LISTS FILTER & DETAIL */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <span style={{ fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <ArrowUpDown size={14} style={{ color: 'var(--primary)' }} /> Ordenar por:
              </span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)', backgroundColor: '#fff', color: 'var(--gray-800)', cursor: 'pointer' }}
              >
                <option value="budget-desc">Maior Orçamento (VGV Decrescente)</option>
                <option value="budget-asc">Menor Orçamento (VGV Crescente)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* WON LEADS */}
            <div className="card">
              <h3 style={{ fontSize: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-won)' }}>
                <CheckCircle size={18} />
                Comissões Confirmadas (Vendas Concluídas)
              </h3>
              
              {loading ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Carregando dados...</p>
              ) : wonLeads.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Nenhuma comissão recebida ainda. Mude um lead para "Contrato Assinado" na aba Leads para faturar!
                </p>
              ) : (
                <div className="mobile-card-list">
                  {sortedWonLeads.map(ld => {
                    const commission = (ld.budget || 0) * 0.05;
                    return (
                      <div key={ld.id} className="mobile-card" style={{ borderLeft: '4px solid var(--status-won)', padding: '14px' }}>
                        <div className="flex justify-between align-center">
                          <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>{ld.name}</strong>
                          <span className="badge badge-won" style={{ fontSize: '10px' }}>Ganho</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                          🏠 {ld.property_type} em {ld.region}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--gray-200)', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: 'var(--gray-500)' }}>Venda:</span>{' '}
                            <strong style={{ color: 'var(--gray-800)' }}>{formatCurrency(ld.budget || 0)}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>Comissão (5%):</span>{' '}
                            <strong style={{ color: 'var(--status-won)', fontSize: '14px' }}>{formatCurrency(commission)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTIVE LEADS */}
            <div className="card">
              <h3 style={{ fontSize: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                <Clock size={18} />
                Origem das Comissões Estimadas (Pipeline Ativo)
              </h3>
              
              {loading ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Carregando dados...</p>
              ) : sortedActiveLeads.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Nenhum lead ativo com orçamento definido no momento.
                </p>
              ) : (
                <div className="mobile-card-list">
                  {sortedActiveLeads.map(ld => {
                    const commission = (ld.budget || 0) * 0.05;
                    let probLabel = 'Novo (10%)';
                    let probColor = '#64748b';
                    if (ld.status === 'contacted') { probLabel = 'Contato (20%)'; probColor = '#a855f7'; }
                    else if (ld.status === 'visit_scheduled') { probLabel = 'Visita Ag. (40%)'; probColor = '#f59e0b'; }
                    else if (ld.status === 'visited') { probLabel = 'Visitado (50%)'; probColor = '#06b6d4'; }
                    else if (ld.status === 'proposal') { probLabel = 'Proposta (80%)'; probColor = 'var(--primary)'; }

                    return (
                      <div key={ld.id} className="mobile-card" style={{ borderLeft: '4px solid #3b82f6', padding: '14px' }}>
                        <div className="flex justify-between align-center">
                          <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>{ld.name}</strong>
                          <span className={`badge badge-${ld.status}`} style={{ fontSize: '10px' }}>
                            {ld.status === 'new' ? 'Novo' : ld.status === 'contacted' ? 'Contato' : ld.status === 'visit_scheduled' ? 'Visita' : ld.status === 'visited' ? 'Visitou' : 'Proposta'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>🏠 {ld.property_type} em {ld.region}</span>
                          <span style={{ fontWeight: 600, color: probColor }}>Estágio: {probLabel}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--gray-200)', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: 'var(--gray-500)' }}>VGV:</span>{' '}
                            <strong style={{ color: 'var(--gray-800)' }}>{formatCurrency(ld.budget || 0)}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>Estimativa (5%):</span>{' '}
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
      )}

      {/* TAB 2: COMMISSION SIMULATOR */}
      {activeSubTab === 'commission_sim' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calculator size={20} style={{ color: 'var(--primary)' }} />
              Simulador de Negociação & Divisão de Comissões
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
              Calcule descontos, comissões variáveis, parcerias imobiliárias e impostos na hora
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', display: 'flex', flexDirection: 'column' }}>
            {/* INPUT FORM BLOCK */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(0, 0, 0, 0.01)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Valor do Imóvel (Preço de Tabela) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: 'var(--gray-500)', fontWeight: 600 }}>R$</span>
                  <input 
                    type="number"
                    value={simPropertyValue}
                    onChange={(e) => setSimPropertyValue(parseFloat(e.target.value) || 0)}
                    style={{ paddingLeft: '38px', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Desconto Proposto (%)</label>
                  <select 
                    value={simDiscount} 
                    onChange={(e) => setSimDiscount(parseInt(e.target.value) || 0)}
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                  >
                    <option value="0">Sem Desconto (0%)</option>
                    <option value="1">1% de Desconto</option>
                    <option value="2">2% de Desconto</option>
                    <option value="3">3% de Desconto</option>
                    <option value="5">5% de Desconto</option>
                    <option value="8">8% de Desconto</option>
                    <option value="10">10% de Desconto</option>
                    <option value="12">12% de Desconto</option>
                    <option value="15">15% de Desconto</option>
                    <option value="20">20% de Desconto</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Taxa de Comissão (%)</label>
                  <select 
                    value={simCommissionRate} 
                    onChange={(e) => setSimCommissionRate(parseFloat(e.target.value) || 0)}
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                  >
                    <option value="1">1% (Taxa Mínima)</option>
                    <option value="2">2% de Honorários</option>
                    <option value="3">3% de Honorários</option>
                    <option value="4">4% de Honorários</option>
                    <option value="5">5% (CRM Padrão)</option>
                    <option value="6">6% (Tabela CRECI Padrão)</option>
                    <option value="7">7% de Honorários</option>
                    <option value="8">8% de Honorários</option>
                    <option value="10">10% (Tabela Máxima)</option>
                  </select>
                </div>
              </div>

              {/* Partnership toggle split */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="sim-partner-checkbox"
                    checked={simHasPartner}
                    onChange={(e) => setSimHasPartner(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="sim-partner-checkbox" style={{ fontWeight: 600, fontSize: '13px', margin: 0, cursor: 'pointer' }}>
                    🤝 Venda em Parceria (Dividir Comissão)?
                  </label>
                </div>

                {simHasPartner && (
                  <div className="form-group" style={{ marginTop: '8px', marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Porcentagem do Parceiro / Captador (%)</label>
                    <select 
                      value={simPartnerSplit} 
                      onChange={(e) => setSimPartnerSplit(parseInt(e.target.value) || 0)}
                      style={{ border: '1px solid var(--border-color)', height: '40px', padding: '4px 10px', fontSize: '13px' }}
                    >
                      <option value="10">10% para o parceiro</option>
                      <option value="20">20% para o parceiro</option>
                      <option value="30">30% para o parceiro</option>
                      <option value="40">40% para o parceiro</option>
                      <option value="50">50% (Meio a meio / Split Padrão)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Tax estimation selector */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Regime Tributário / Impostos do Corretor</label>
                <select 
                  value={simTaxType} 
                  onChange={(e) => setSimTaxType(e.target.value)}
                  style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                >
                  <option value="none">Isento / Sem Impostos no Cálculo</option>
                  <option value="pj">Pessoa Jurídica (Simples Nacional - 6%)</option>
                  <option value="pf">Pessoa Física (Carnê-leão Simplificado - 15% méd.)</option>
                </select>
              </div>

            </div>

            {/* SIMULATION RESULT BLOCKS */}
            <div style={{ 
              backgroundColor: 'var(--gray-900)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '24px', 
              color: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              borderLeft: '6px solid var(--primary)'
            }}>
              <h4 style={{ color: '#ffffff', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Award size={18} style={{ color: 'var(--primary)' }} />
                Resultado Líquido Simulado
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Preço com Desconto ({simDiscount}%):</span>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{formatCurrency(finalPropertyPrice)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Comissão Bruta Total ({simCommissionRate}%):</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary)' }}>{formatCurrency(totalGrossCommission)}</span>
                </div>

                {simHasPartner && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Sua Parte Bruta ({100 - simPartnerSplit}%):</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{formatCurrency(brokerGrossShare)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Parte do Parceiro ({simPartnerSplit}%):</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#a855f7' }}>{formatCurrency(partnerGrossShare)}</span>
                    </div>
                  </>
                )}

                {simTaxType !== 'none' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Imposto Estimado ({simTaxType === 'pj' ? 'PJ 6%' : 'PF 15%'}):</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--status-lost)' }}>-{formatCurrency(estimatedTaxes)}</span>
                  </div>
                )}

                {/* Final Net Pocket Profit */}
                <div style={{ 
                  marginTop: '10px', 
                  padding: '16px', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid rgba(197, 155, 39, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comissão Final Líquida</span>
                    <div style={{ color: '#ffffff', fontSize: '11px', marginTop: '2px' }}>(Livre na conta para você)</div>
                  </div>
                  <strong style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 800 }}>
                    {formatCurrency(brokerNetShare)}
                  </strong>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: FINANCING & MINIMUM INCOME SIMULATOR */}
      {activeSubTab === 'financing_sim' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Shield size={20} style={{ color: 'var(--primary)' }} />
              Simulador de Financiamento Habitacional & Renda Mínima
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
              Simule a aprovação bancária (Padrão Caixa/Bancos), valor da entrada e renda familiar necessária
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', display: 'flex', flexDirection: 'column' }}>
            {/* INPUT FORM BLOCK */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(0, 0, 0, 0.01)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Valor do Imóvel (R$) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: 'var(--gray-500)', fontWeight: 600 }}>R$</span>
                  <input 
                    type="number"
                    value={finPropertyValue}
                    onChange={(e) => handleFinPropertyValueChange(parseFloat(e.target.value) || 0)}
                    style={{ paddingLeft: '38px', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
                  * Alterar este valor recalcula a sugestão de entrada para o patamar mínimo padrão de 20%.
                </p>
              </div>

              <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Valor da Entrada (R$) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: 'var(--gray-500)', fontWeight: 600 }}>R$</span>
                    <input 
                      type="number"
                      value={finDownPayment}
                      onChange={(e) => setFinDownPayment(parseFloat(e.target.value) || 0)}
                      style={{ paddingLeft: '38px', backgroundColor: '#fff', border: hasInsufficientDownPayment ? '1px solid var(--status-lost)' : '1px solid var(--border-color)' }}
                    />
                  </div>
                  {hasInsufficientDownPayment && (
                    <div style={{ fontSize: '11px', color: 'var(--status-lost)', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ Bancos exigem no mínimo 20% de entrada ({formatCurrency(minRequiredDownPayment)}).
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Sistema de Amortização</label>
                  <select 
                    value={finSystem} 
                    onChange={(e) => setFinSystem(e.target.value)}
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                  >
                    <option value="sac">SAC (Parcelas Decrescentes - Recomendado)</option>
                    <option value="price">Tabela PRICE (Parcelas Fixas)</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Prazo do Financiamento</label>
                  <select 
                    value={finTerm} 
                    onChange={(e) => setFinTerm(parseInt(e.target.value) || 0)}
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                  >
                    <option value="120">120 meses (10 anos)</option>
                    <option value="180">180 meses (15 anos)</option>
                    <option value="240">240 meses (20 anos)</option>
                    <option value="300">300 meses (25 anos)</option>
                    <option value="360">360 meses (30 anos - Padrão Caixa)</option>
                    <option value="420">420 meses (35 anos - Máximo)</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Taxa de Juros Anual (% a.a.)</label>
                  <select 
                    value={finInterestRate} 
                    onChange={(e) => setFinInterestRate(parseFloat(e.target.value) || 0)}
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', height: '44px' }}
                  >
                    <option value="7.5">7.5% a.a. (Pró-Cotista)</option>
                    <option value="8.5">8.5% a.a. (Média Excelente)</option>
                    <option value="9.0">9.0% a.a. (Caixa SFH)</option>
                    <option value="9.5">9.5% a.a. (Média Padrão)</option>
                    <option value="10.0">10.0% a.a. (Bancos Privados)</option>
                    <option value="10.5">10.5% a.a. (Bancos Privados)</option>
                    <option value="11.5">11.5% a.a. (Mercado Alto)</option>
                    <option value="12.5">12.5% a.a. (Mercado Máximo)</option>
                  </select>
                </div>
              </div>

              {/* Renda Familiar do Cliente */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Renda Familiar Bruta Mensal do Lead (R$)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: 'var(--gray-500)', fontWeight: 600 }}>R$</span>
                  <input 
                    type="number"
                    value={finClientIncome}
                    onChange={(e) => setFinClientIncome(parseFloat(e.target.value) || 0)}
                    style={{ paddingLeft: '38px', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
                  * Fornecer a renda atual ajuda a validar se as parcelas se encaixam no comprometimento de até 30% exigido pelos bancos.
                </p>
              </div>

            </div>

            {/* FINANCING SIMULATION RESULT BLOCKS */}
            <div style={{ 
              backgroundColor: 'var(--secondary)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '24px', 
              color: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              borderLeft: '6px solid #3b82f6'
            }}>
              <h4 style={{ color: '#ffffff', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Shield size={18} style={{ color: '#3b82f6' }} />
                Simulação de Crédito & Financiamento
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Valor do Imóvel:</span>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{formatCurrency(finPropertyValue)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Entrada Fornecida ({LTVRate > 0 ? (100 - LTVRate).toFixed(1) : 0}%):</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: hasInsufficientDownPayment ? 'var(--status-lost)' : '#ffffff' }}>{formatCurrency(finDownPayment)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Valor Financiado Pelo Banco ({LTVRate.toFixed(1)}%):</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#3b82f6' }}>{formatCurrency(loanAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Prazo Escolhido / Juros Aplicados:</span>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{finTerm} meses ({finTerm / 12} anos) • {finInterestRate}% a.a.</span>
                </div>

                {finSystem === 'sac' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Primeira Parcela (Mais Alta):</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#f59e0b' }}>{formatCurrency(finFirstInstallment)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Última Parcela (Mais Baixa):</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--status-won)' }}>{formatCurrency(finLastInstallment)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>Parcela Mensal Fixa (PRICE):</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#f59e0b' }}>{formatCurrency(finFirstInstallment)}</span>
                  </div>
                )}

                {/* Minimal Required Monthly Family Income */}
                <div style={{ 
                  marginTop: '10px', 
                  padding: '16px', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Renda Familiar Mínima Exigida</span>
                    <div style={{ color: '#ffffff', fontSize: '11px', marginTop: '2px' }}>(Comprovação necessária - 30% de comprometimento)</div>
                  </div>
                  <strong style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 800 }}>
                    {formatCurrency(finMinRequiredIncome)}
                  </strong>
                </div>

                {/* Client's Income Evaluation */}
                {finClientIncome > 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '16px', 
                    backgroundColor: finClientIncome >= finMinRequiredIncome ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    borderRadius: 'var(--radius-sm)', 
                    border: finClientIncome >= finMinRequiredIncome ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: finClientIncome >= finMinRequiredIncome ? 'var(--status-won)' : 'var(--status-lost)' }}>
                        Status do Lead
                      </span>
                      <span className={`badge ${finClientIncome >= finMinRequiredIncome ? 'badge-won' : 'badge-lost'}`} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', color: '#fff', backgroundColor: finClientIncome >= finMinRequiredIncome ? 'var(--status-won)' : 'var(--status-lost)' }}>
                        {finClientIncome >= finMinRequiredIncome ? '✓ Renda Aprovada' : '✗ Renda Insuficiente'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#fff' }}>
                      <span style={{ color: 'var(--gray-300)' }}>Comprometimento Real da Renda:</span>
                      <strong style={{ color: finCompromiseRate <= 30 ? '#10b981' : '#ef4444' }}>
                        {finCompromiseRate.toFixed(1)}% da renda
                      </strong>
                    </div>

                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: '1.4' }}>
                      {finClientIncome >= finMinRequiredIncome 
                        ? `Excelente! O comprometimento de ${finCompromiseRate.toFixed(1)}% está dentro do limite máximo de 30% exigido pela Caixa e bancos privados.` 
                        : `Atenção: A primeira parcela consome ${finCompromiseRate.toFixed(1)}% da renda informada (limite é 30%). Recomende ao lead dar uma entrada maior ou estender o prazo.`}
                    </p>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
