import React from 'react';
import { Home, Users, Calendar, MessageSquare, LogOut, Shield, DollarSign, Settings } from 'lucide-react';

const Layout = ({ children, currentTab, setCurrentTab, user, onLogout }) => {
  const realtorName = user?.user_metadata?.full_name || 'Corretor/a';
  const realtorEmail = user?.email || 'loreny@imoveis.com';
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

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: <Home size={18} /> },
    { id: 'leads', label: 'Leads & Funil', icon: <Users size={18} /> },
    { id: 'commissions', label: 'Vendas & Comissões', icon: <DollarSign size={18} /> },
    { id: 'visits', label: 'Agenda de Visitas', icon: <Calendar size={18} /> },
    { id: 'whatsapp_templates', label: 'Modelos WhatsApp', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'Meu Perfil', icon: <Settings size={18} /> },
  ];

  return (
    <div className="layout-container">
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
            <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
              <Home size={20} />
            </div>
            <h1 className="logo-text" style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
              Loreny<span>Imóveis</span>
            </h1>
          </div>

          <div style={{ padding: '0 8px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={10} style={{ color: roleColor }} /> {roleLabel}
            </span>
          </div>

          <nav style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`sidebar-nav-item ${currentTab === item.id ? 'active' : ''}`}
                style={{ width: '100%', fontFamily: 'Inter, sans-serif' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* BOTTOM USER PROFILE IN SIDEBAR */}
        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
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
              fontSize: '14px',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              {realtorName.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {realtorName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {realtorEmail}
              </div>
            </div>
          </div>

          <button 
            onClick={onLogout} 
            className="sidebar-nav-item" 
            style={{ width: '100%', color: 'var(--status-lost)', display: 'flex', gap: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav className="mobile-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`mobile-nav-item ${currentTab === item.id ? 'active' : ''}`}
          >
            {item.icon}
            <span style={{ fontSize: '10px', marginTop: '2px' }}>{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          onClick={onLogout}
          className="mobile-nav-item"
          style={{ color: 'var(--status-lost)' }}
        >
          <LogOut size={18} />
          <span style={{ fontSize: '10px', marginTop: '2px' }}>Sair</span>
        </button>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      </main>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--gray-100);
          color: var(--gray-800);
        }
        .sidebar {
          width: 240px;
          background-color: #0a1424; /* Deep Luxury Navy Blue */
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 100;
        }
        .sidebar-logo h1 {
          color: var(--white);
        }
        .sidebar-logo h1 span {
          color: var(--primary);
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          color: #94a3b8 !important; /* Sleek readable silver */
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        }
        .sidebar-nav-item svg {
          color: #94a3b8 !important;
          transition: all 0.2s ease;
        }
        .sidebar-nav-item:hover {
          color: var(--white) !important;
          background-color: rgba(255, 255, 255, 0.04);
        }
        .sidebar-nav-item:hover svg {
          color: var(--primary) !important;
        }
        .sidebar-nav-item.active {
          color: var(--white) !important;
          background-color: var(--primary-light); /* Golden glow */
          border-left: 3px solid var(--primary);
          font-weight: 500;
        }
        .sidebar-nav-item.active svg {
          color: var(--primary) !important;
        }
        .main-content {
          flex: 1;
          margin-left: 240px;
          padding: 32px;
          min-height: 100vh;
          overflow-y: auto;
          background-color: var(--gray-100);
        }
        .mobile-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(64px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background-color: #0a1424;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 999;
          justify-content: space-around;
          align-items: center;
          padding-left: 8px;
          padding-right: 8px;
        }
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          color: #94a3b8;
          padding: 6px;
          cursor: pointer;
          flex: 1;
        }
        .mobile-nav-item svg {
          color: #94a3b8;
          transition: all 0.2s ease;
        }
        .mobile-nav-item.active {
          color: var(--primary);
        }
        .mobile-nav-item.active svg {
          color: var(--primary);
        }
        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
          .main-content {
            margin-left: 0;
            padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
          }
          .mobile-nav {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
