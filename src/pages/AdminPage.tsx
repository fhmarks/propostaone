import React, { useEffect, useState } from 'react';
import {
  Building2, Users, Shield, Activity, AlertTriangle,
  Search, Filter, ChevronDown, GitBranch, Clock, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../types';

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

const MOCK_LOGS: AuditLog[] = [
  { id: '1', actor: 'Admin', action: 'Apólice criada',     resource: '#APL-001234', timestamp: new Date().toISOString(), status: 'success' },
  { id: '2', actor: 'Admin', action: 'Usuário convidado',  resource: 'joao@email.com', timestamp: new Date(Date.now()-3600000).toISOString(), status: 'success' },
  { id: '3', actor: 'Admin', action: 'Login realizado',    resource: 'admin@corretora.com', timestamp: new Date(Date.now()-7200000).toISOString(), status: 'success' },
  { id: '4', actor: 'Admin', action: 'Integração ativada', resource: 'Porto Seguro', timestamp: new Date(Date.now()-86400000).toISOString(), status: 'success' },
  { id: '5', actor: 'Sistema', action: 'Backup automático', resource: 'DB snapshot', timestamp: new Date(Date.now()-172800000).toISOString(), status: 'success' },
];

export default function AdminPage() {
  const { tenant, profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'teams' | 'audit'>('overview');

  useEffect(() => {
    supabase.from('propostaone_profiles').select('*').order('created_at').then(({ data }) => {
      setUsers((data ?? []) as Profile[]);
      setLoading(false);
    });
  }, []);

  const roleLabels: Record<string, string> = { owner: 'Proprietário', admin: 'Admin', manager: 'Gerente', agent: 'Corretor', viewer: 'Visualizador' };
  const roleBadges: Record<string, string> = { owner: 'badge-amber', admin: 'badge-red', manager: 'badge-blue', agent: 'badge-green', viewer: 'badge-gray' };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Administração</h1>
          <p className="page-subtitle">Usuários, equipes, permissões e auditoria</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Usuários ativos', value: users.filter(u => u.active).length, icon: Users, color: 'brand' },
          { label: 'Plano atual', value: tenant?.plan ?? 'starter', icon: Shield, color: 'amber' },
          { label: 'Última atividade', value: 'Agora', icon: Activity, color: 'green' },
          { label: 'Status do sistema', value: 'Online', icon: Activity, color: 'green' },
        ].map((s, i) => {
          const Icon = s.icon;
          const c = s.color === 'brand' ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' : s.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
          return (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${c}`}><Icon className="w-5 h-5" /></div>
              <div><div className="text-base font-bold text-white capitalize">{s.value}</div><div className="text-xs text-white/50">{s.label}</div></div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        {([['overview','Visão Geral'],['users','Usuários'],['teams','Equipes'],['audit','Auditoria']] as [typeof tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tenant info */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Dados da Corretora
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Nome', value: tenant?.name },
                { label: 'CNPJ', value: tenant?.cnpj ?? 'Não informado' },
                { label: 'Email', value: tenant?.email ?? 'Não informado' },
                { label: 'Plano', value: tenant?.plan ?? 'starter' },
                { label: 'Status', value: tenant?.status ?? 'active' },
                { label: 'Desde', value: tenant ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : '-' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-white/50">{item.label}</span>
                  <span className="text-xs font-medium text-white/80 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Status do Sistema
            </h3>
            <div className="space-y-3">
              {[
                { service: 'API Supabase', status: 'online' },
                { service: 'Storage', status: 'online' },
                { service: 'Autenticação', status: 'online' },
                { service: 'Integration Layer', status: 'online' },
                { service: 'Automações', status: 'online' },
              ].map(item => (
                <div key={item.service} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-white/60">{item.service}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                    <span className="text-xs text-emerald-400 capitalize">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Email</th>
                  <th>Cargo</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                          <span className="text-brand-300 text-xs font-bold">{u.full_name?.charAt(0) ?? 'U'}</span>
                        </div>
                        <div className="text-sm font-medium text-white/90">{u.full_name || 'Sem nome'}</div>
                      </div>
                    </td>
                    <td><div className="text-xs text-white/60">{u.email ?? '-'}</div></td>
                    <td><div className="text-xs text-white/60">{u.job_title ?? '-'}</div></td>
                    <td><span className={roleBadges[u.role] ?? 'badge-gray'}>{roleLabels[u.role] ?? u.role}</span></td>
                    <td><span className={u.active ? 'badge-green' : 'badge-gray'}>{u.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td><div className="text-xs text-white/40">{new Date(u.created_at).toLocaleDateString('pt-BR')}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'teams' && (
        <div className="glass-card p-12 text-center">
          <GitBranch className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <div className="text-white/50">Nenhuma equipe criada</div>
          <div className="text-white/30 text-sm mt-1">Configure equipes para organizar seus corretores</div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input className="input-glass pl-9" placeholder="Buscar no log..." />
            </div>
            <button className="btn-glass">
              <Filter className="w-4 h-4" />
              Filtrar
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Recurso</th>
                  <th>Usuário</th>
                  <th>Data/Hora</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LOGS.map(log => (
                  <tr key={log.id}>
                    <td><div className="text-sm text-white/80">{log.action}</div></td>
                    <td><div className="text-xs text-white/60 font-mono">{log.resource}</div></td>
                    <td><div className="text-xs text-white/60">{log.actor}</div></td>
                    <td>
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td>
                      <span className={log.status === 'success' ? 'badge-green' : log.status === 'warning' ? 'badge-amber' : 'badge-red'}>
                        {log.status === 'success' ? 'Sucesso' : log.status === 'warning' ? 'Aviso' : 'Erro'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
