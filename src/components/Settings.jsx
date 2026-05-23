import React, { useState, useEffect } from 'react';
import { User, Phone, Briefcase, DollarSign, Save, ShieldAlert } from 'lucide-react';
import { supabase } from '../config/supabase';

const Settings = ({ user, onProfileUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    company: '',
    commission_rate: 5.00
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const userRole = user?.user_metadata?.role || 'broker';
  let roleLabel = 'Corretor Autônomo';
  let roleColor = 'var(--primary)'; // Gold
  if (userRole === 'manager') {
    roleLabel = 'Gerente de Vendas';
    roleColor = '#a855f7'; // Purple
  } else if (userRole === 'admin') {
    roleLabel = 'Diretor Imobiliário';
    roleColor = '#3b82f6'; // Blue
  }

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          company: data.company || '',
          commission_rate: data.commission_rate || 5.00
        });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      // Fallback para metadados da sessão se der erro no banco
      setProfile({
        full_name: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
        company: user?.user_metadata?.company || '',
        commission_rate: 5.00
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'commission_rate' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      setErrorMsg('O Nome Completo é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setSuccessMsg('');
      setErrorMsg('');

      // 1. Atualizar na tabela re_profiles
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          company: profile.company.trim(),
          commission_rate: profile.commission_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. Atualizar nos metadados do Supabase Auth (para manter a sessão em sincronia instantânea)
      if (!supabase.isMock) {
        const { data: authData, error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: profile.full_name.trim(),
            phone: profile.phone.trim(),
            company: profile.company.trim(),
            commission_rate: profile.commission_rate
          }
        });
        if (authError) throw authError;
        
        // Disparar atualização do estado global de usuário no App.jsx
        if (onProfileUpdate && authData?.user) {
          onProfileUpdate(authData.user);
        }
      } else {
        // Se for banco simulado, atualizar local storage manualmente
        const sessionJson = localStorage.getItem('re_mock_session');
        if (sessionJson) {
          const session = JSON.parse(sessionJson);
          session.user.user_metadata = {
            ...session.user.user_metadata,
            full_name: profile.full_name.trim(),
            phone: profile.phone.trim(),
            company: profile.company.trim(),
            commission_rate: profile.commission_rate
          };
          localStorage.setItem('re_mock_session', JSON.stringify(session));
          
          if (onProfileUpdate) {
            onProfileUpdate(session.user);
          }
        }
      }

      setSuccessMsg('Perfil imobiliário atualizado com sucesso!');
      
      // Auto-ocultar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Erro ao salvar perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Configurações & Meu Perfil
        </h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '4px' }}>
          Gerencie suas informações de contato e parâmetros de comissão para fechamento de vendas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* PROFILE CARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar and Badge Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '20px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: roleColor, 
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '24px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {(profile.full_name || user?.email || 'CO').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--gray-900)' }}>
                {profile.full_name || 'Corretor/a'}
              </h3>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: roleColor, 
                backgroundColor: `${roleColor}12`, 
                border: `1px solid ${roleColor}25`,
                padding: '2px 8px', 
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px'
              }}>
                🔑 {roleLabel}
              </span>
            </div>
          </div>

          {/* Messages */}
          {successMsg && (
            <div style={{ 
              backgroundColor: 'var(--status-won-bg)', 
              color: 'var(--status-won)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '13px', 
              fontWeight: 500,
              borderLeft: '4px solid var(--status-won)'
            }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ 
              backgroundColor: 'var(--status-lost-bg)', 
              color: 'var(--status-lost)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '13px', 
              fontWeight: 500,
              borderLeft: '4px solid var(--status-lost)'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> Nome Completo *
              </label>
              <input 
                type="text" 
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                placeholder="Seu nome profissional"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={15} /> WhatsApp / Telefone
              </label>
              <input 
                type="tel" 
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Ex: 11999998888 (Apenas números)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={15} /> Imobiliária / Empresa
              </label>
              <input 
                type="text" 
                name="company"
                value={profile.company}
                onChange={handleChange}
                placeholder="Ex: Loreny Imóveis"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={15} /> Taxa de Comissão Padrão (%)
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  name="commission_rate"
                  value={profile.commission_rate}
                  onChange={handleChange}
                  placeholder="Ex: 5.00"
                  step="0.01"
                  min="0"
                  max="100"
                  style={{ paddingRight: '36px' }}
                  disabled={loading}
                />
                <span style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '12px', 
                  color: 'var(--gray-400)',
                  fontWeight: 600,
                  fontSize: '14px' 
                }}>%</span>
              </div>
              <p style={{ color: 'var(--gray-400)', fontSize: '11px', marginTop: '4px' }}>
                Utilizada para estimar suas receitas acumuladas e projeções no Simulador Financeiro.
              </p>
            </div>

            <div style={{ 
              fontSize: '12px', 
              color: 'var(--gray-600)', 
              padding: '12px', 
              backgroundColor: 'rgba(0, 0, 0, 0.02)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                🔒 <strong>Papéis e Permissões de Conta:</strong> O cargo corporativo atribuído à sua conta é gerenciado de forma segura pelo painel da imobiliária. Para solicitar elevação ou alteração de cargo, contate o administrador do sistema.
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-large" 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
            >
              <Save size={16} />
              <span>{loading ? 'Salvando Alterações...' : 'Salvar Perfil Imobiliário'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
