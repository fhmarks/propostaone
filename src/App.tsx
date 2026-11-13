import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import type { AppPage } from './components/layout/Sidebar';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CRMPage from './pages/CRMPage';
import PipelinePage from './pages/PipelinePage';
import AgendaPage from './pages/AgendaPage';
import PoliciesPage from './pages/PoliciesPage';
import FinancialPage from './pages/FinancialPage';
import DocumentsPage from './pages/DocumentsPage';
import CommunicationPage from './pages/CommunicationPage';
import AutomationsPage from './pages/AutomationsPage';
import ReportsPage from './pages/ReportsPage';
import MarketplacePage from './pages/MarketplacePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import SuperAdminPanel from './pages/SuperAdminPanel';
import LandingPage from './pages/LandingPage';
import { Shield } from 'lucide-react';

type PublicView = 'landing' | 'login' | 'register';

function AppContent() {
  const { session, loading, profile } = useAuth();
  const [publicView, setPublicView] = useState<PublicView>('landing');
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');

  // Show loading while auth + profile are resolving.
  // AuthContext sets loading=true synchronously before any profile fetch so this
  // screen covers the window where session is truthy but profile is still null.
  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/25 flex items-center justify-center animate-pulse-soft">
            <Shield className="w-8 h-8 text-brand-400" />
          </div>
          <div className="text-white/50 text-sm">Carregando CorretoraOne...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    if (publicView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setPublicView('login')} />;
    }
    if (publicView === 'login') {
      return <LoginPage onSwitchToRegister={() => setPublicView('register')} />;
    }
    return (
      <LandingPage
        onLogin={() => setPublicView('login')}
        onRegister={() => setPublicView('register')}
      />
    );
  }

  // Super admin always goes straight to the platform panel
  if (profile?.is_super_admin) return <SuperAdminPanel />;

  const pages: Record<AppPage, React.ReactNode> = {
    dashboard:     <DashboardPage />,
    crm:           <CRMPage />,
    pipeline:      <PipelinePage />,
    agenda:        <AgendaPage />,
    policies:      <PoliciesPage />,
    financial:     <FinancialPage />,
    documents:     <DocumentsPage />,
    communication: <CommunicationPage />,
    automations:   <AutomationsPage />,
    reports:       <ReportsPage />,
    marketplace:   <MarketplacePage />,
    settings:      <SettingsPage />,
    admin:         <AdminPage />,
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {pages[currentPage]}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
