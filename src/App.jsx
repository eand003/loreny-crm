import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Leads from './components/Leads';
import Commissions from './components/Commissions';
import Visits from './components/Visits';
import WhatsAppTemplates from './components/WhatsAppTemplates';

function App() {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const [preselectedLeadForVisit, setPreselectedLeadForVisit] = useState(null);
  const [visitsSubTab, setVisitsSubTab] = useState('visits');

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoadingSession(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoadingSession(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleQuickAction = (action) => {
    if (action === 'add-lead') {
      setActiveQuickAction('add-lead');
      setCurrentTab('leads');
    } else if (action === 'add-visit') {
      setCurrentTab('visits');
      setPreselectedLeadForVisit({ triggerOpen: true });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentTab('dashboard');
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onQuickAction={handleQuickAction} 
            setCurrentTab={setCurrentTab} 
            setVisitsSubTab={setVisitsSubTab}
          />
        );
      case 'leads':
        return (
          <Leads 
            user={user} 
            activeQuickAction={activeQuickAction} 
            onClearQuickAction={() => setActiveQuickAction(null)} 
            setCurrentTab={setCurrentTab} 
            setPreselectedLeadForVisit={setPreselectedLeadForVisit} 
          />
        );
      case 'visits':
        return (
          <Visits 
            user={user} 
            preselectedLeadForVisit={preselectedLeadForVisit} 
            onClearPreselectedLead={() => setPreselectedLeadForVisit(null)} 
            activeSubTab={visitsSubTab}
            setActiveSubTab={setVisitsSubTab}
          />
        );
      case 'whatsapp_templates':
        return (
          <WhatsAppTemplates 
            user={user} 
          />
        );
      case 'commissions':
        return (
          <Commissions 
            user={user} 
          />
        );
      default:
        return (
          <Dashboard 
            user={user} 
            onQuickAction={handleQuickAction} 
            setCurrentTab={setCurrentTab} 
          />
        );
    }
  };

  return (
    <AuthGuard user={user} setUser={setUser} loadingSession={loadingSession}>
      <Layout 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout}
      >
        {renderActiveTab()}
      </Layout>
    </AuthGuard>
  );
}

export default App;
