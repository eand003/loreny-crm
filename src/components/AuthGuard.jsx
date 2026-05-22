import React, { useState } from 'react';
import { Home, Mail, Lock, User, Phone, Briefcase } from 'lucide-react';
import { supabase } from '../config/supabase';

const AuthGuard = ({ children, user, setUser, loadingSession }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('broker'); // broker default
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) throw error;
      
      setUser(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao fazer login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      alert('Preencha os campos obrigatórios (E-mail, Senha e Nome).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: role
          }
        }
      });

      if (error) throw error;

      alert('Cadastro imobiliário realizado com sucesso!');
      setIsSignUp(false); // Go to login
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="login-screen">
        <div style={{ color: 'var(--gray-800)', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Home size={48} className="text-primary spin-anim" style={{ color: 'var(--primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span>Autenticando acesso imobiliário...</span>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (user) {
    return children;
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: 'var(--radius-lg)', color: 'var(--primary)' }}>
            <Home size={32} />
          </div>
          <h1 className="logo-text" style={{ justifyContent: 'center', display: 'flex', gap: '4px', fontSize: '24px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: '12px' }}>
            Loreny<span>Imóveis</span>
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '4px' }}>
            CRM de Leads e Gestão de VGV Imobiliário
          </p>
        </div>

        <h2 className="login-title" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {isSignUp ? 'Criar Cadastro' : 'Acesse o Painel'}
        </h2>
        <p className="login-subtitle">
          {isSignUp 
            ? 'Inscreva-se como corretor para gerenciar sua carteira' 
            : 'Informe suas credenciais para gerenciar leads e comissões'
          }
        </p>

        {errorMsg && (
          <div style={{ 
            backgroundColor: 'var(--status-lost-bg)', 
            color: 'var(--status-lost)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '13px', 
            marginBottom: '20px',
            borderLeft: '4px solid var(--status-lost)',
            fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}

        {isSignUp ? (
          /* ================= SIGN UP FORM ================= */
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  placeholder="Seu nome completo" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>E-mail Corporativo *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="corretor@lorenyimoveis.com" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>WhatsApp / Celular (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="DD + Número" 
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Cargo / Perfil</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                >
                  <option value="broker">Corretor de Imóveis (Autônomo)</option>
                  <option value="manager">Gerente de Vendas</option>
                  <option value="admin">Diretor / Administrador</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ marginTop: '10px' }}>
              {loading ? 'Cadastrando...' : 'Criar Minha Conta'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
              Já tem registro?{' '}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }} 
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Faça login
              </button>
            </div>
          </form>
        ) : (
          /* ================= LOGIN FORM ================= */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="Ex: contato@lorenyimoveis.com.br" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha de Acesso</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Sua senha secreta" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ marginTop: '10px' }}>
              {loading ? 'Entrando...' : 'Acessar Painel Loreny'}
            </button>

            {supabase.isMock && (
              <div style={{ 
                marginTop: '20px', 
                padding: '12px', 
                backgroundColor: 'var(--gray-100)', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--gray-700)',
                border: '1px dashed var(--gray-300)'
              }}>
                <strong>Credenciais do banco simulado:</strong><br />
                E-mail: <code>contato@lorenyimoveis.com.br</code><br />
                Senha: <i>qualquer senha</i> (acesso imediato offline)
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
              Ainda não possui conta?{' '}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }} 
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Cadastre-se grátis
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthGuard;
