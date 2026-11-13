import React, { useState } from 'react';
import {
  LayoutDashboard, Users, GitBranch, Calendar, FileText,
  DollarSign, FolderOpen, MessageSquare, Zap, BarChart3,
  Store, Settings, ChevronLeft, ChevronRight, Shield,
  Building2, LogOut, Bell, UserCircle, ChevronsUpDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type AppPage =
  | 'dashboard' | 'crm' | 'pipeline' | 'agenda' | 'policies'
  | 'financial' | 'documents' | 'communication' | 'automations'
  | 'reports' | 'marketplace' | 'settings' | 'admin';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  group?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'principal' },
  { id: 'crm', label: 'CRM', icon: Users, group: 'comercial' },
  { id: 'pipeline', label: 'Funil Comercial', icon: GitBranch, group: 'comercial' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, group: 'comercial' },
  { id: 'policies', label: 'Apólices', icon: FileText, group: 'operacional' },
  { id: 'financial', label: 'Financeiro', icon: DollarSign, group: 'operacional' },
  { id: 'documents', label: 'Documentos', icon: FolderOpen, group: 'operacional' },
  { id: 'communication', label: 'Comunicação', icon: MessageSquare, group: 'operacional' },
  { id: 'automations', label: 'Automações', icon: Zap, group: 'gestao' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, group: 'gestao' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, group: 'gestao' },
  { id: 'settings', label: 'Configurações', icon: Settings, group: 'sistema' },
  { id: 'admin', label: 'Administração', icon: Building2, group: 'sistema' },
];

const groups: { id: string; label: string }[] = [
  { id: 'principal', label: 'Principal' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'sistema', label: 'Sistema' },
];

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, tenant, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <aside
      className={`relative flex flex-col h-screen transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
        bg-sidebar-bg border-r border-white/[0.06] backdrop-blur-2xl z-20 flex-shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-brand-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-white text-sm leading-tight">
              Corretora<span className="text-brand-400">One</span>
            </div>
            <div className="text-white/30 text-[10px] truncate">{tenant?.name ?? 'Sua Corretora'}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
        {groups.map(group => {
          const items = navItems.filter(i => i.group === group.id);
          return (
            <div key={group.id} className="mb-3">
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-widest">
                  {group.label}
                </div>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full text-left ${isActive ? 'nav-item-active' : 'nav-item'} ${collapsed ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] font-bold bg-brand-500/30 text-brand-300 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex-shrink-0 p-2 border-t border-white/[0.06]">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-4 h-4 text-brand-400" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-medium text-white/80 truncate">{profile?.full_name ?? 'Usuário'}</div>
                  <div className="text-[10px] text-white/30 capitalize">{profile?.role ?? 'agent'}</div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              </>
            )}
          </button>

          {showUserMenu && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-1 glass-card border border-white/[0.10] rounded-xl overflow-hidden shadow-glass-lg z-50">
              <div className="p-3 border-b border-white/[0.06]">
                <div className="text-xs font-semibold text-white/80">{profile?.full_name}</div>
                <div className="text-[10px] text-white/30">{profile?.email}</div>
              </div>
              <button
                onClick={() => { signOut(); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-800 border border-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-colors shadow-glass-sm z-30"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
