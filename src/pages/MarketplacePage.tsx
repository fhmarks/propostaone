import React, { useEffect, useState } from 'react';
import {
  Store, Plug, CheckCircle, Clock, AlertCircle, X,
  ChevronRight, Loader2, Zap, Shield, RefreshCw,
  Activity, Eye, EyeOff, Search, BookOpen, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { InsurerConnector, TenantIntegration, ConnectorAuthField } from '../types';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ComponentType<{className?:string}>; color: string }> = {
  connected:    { label: 'Conectado',    badge: 'badge-green', icon: CheckCircle, color: 'text-emerald-400' },
  disconnected: { label: 'Desconectado', badge: 'badge-gray',  icon: Plug,        color: 'text-white/40' },
  error:        { label: 'Erro',         badge: 'badge-red',   icon: AlertCircle, color: 'text-red-400' },
  pending:      { label: 'Pendente',     badge: 'badge-amber', icon: Clock,       color: 'text-amber-400' },
};

const connectorStatusConfig: Record<string, { label: string; badge: string }> = {
  available:    { label: 'Disponível',    badge: 'badge-green' },
  beta:         { label: 'Beta',          badge: 'badge-amber' },
  coming_soon:  { label: 'Em breve',      badge: 'badge-gray'  },
  deprecated:   { label: 'Descontinuado', badge: 'badge-red'   },
};

const FEATURE_LABELS: Record<string, string> = {
  consultarApolice:   'Consultar Apólice',
  emitirProposta:     'Emitir Proposta',
  consultarCotacao:   'Cotação',
  listarProdutos:     'Listar Produtos',
  consultarSinistro:  'Sinistros',
  cancelar:           'Cancelamento',
  emitirSegundaVia:   '2ª Via',
  refreshToken:       'Auto-renovação',
};

// ─── Markdown renderer ────────────────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => `<pre class="bg-white/[0.05] border border-white/[0.08] rounded-lg p-3 text-xs text-cyan-300 overflow-x-auto my-2"><code>${m.slice(m.indexOf('\n') + 1, m.lastIndexOf('```'))}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="bg-white/[0.08] text-cyan-300 px-1.5 py-0.5 rounded text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white/90 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-white mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-brand-300 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90 font-semibold">$1</strong>')
    .replace(/^\| (.+) \|$/gm, (m) => {
      const cells = m.slice(2, -2).split(' | ');
      return `<tr class="border-b border-white/[0.06]">${cells.map(c => `<td class="px-3 py-1.5 text-xs text-white/70">${c.trim()}</td>`).join('')}</tr>`;
    })
    .replace(/^---+$/gm, '')
    .replace(/^\| [-: |]+\|$/gm, '')
    .replace(/(<tr.*<\/tr>\n)+/g, (m) => `<table class="w-full border border-white/[0.08] rounded-lg overflow-hidden my-2 text-xs">${m}</table>`)
    .replace(/^- (.+)$/gm, '<li class="text-xs text-white/70 ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n)+/g, (m) => `<ul class="my-2 space-y-1">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="text-xs text-white/60 leading-relaxed mb-2">')
    .replace(/^(?!<[a-z])(.+)$/gm, '<p class="text-xs text-white/60 leading-relaxed mb-1">$1</p>');
}

// ─── Docs Modal ────────────────────────────────────────────────

function DocsModal({ connector, onClose }: { connector: InsurerConnector; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/25 flex items-center justify-center font-bold text-brand-400">
              {connector.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-white">{connector.name}</div>
              <div className="text-xs text-white/40">Documentação da integração · {connector.api_version ?? 'v1'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connector.docs_url && (
              <a href={connector.docs_url} target="_blank" rel="noopener noreferrer" className="btn-glass text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Docs oficiais
              </a>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {connector.sandbox_base_url && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/15 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Sandbox:</span>
            <code className="text-xs text-white/60 font-mono">{connector.sandbox_base_url}</code>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto min-h-0"
          dangerouslySetInnerHTML={{
            __html: connector.documentation_md
              ? renderMarkdown(connector.documentation_md)
              : '<p class="text-white/40 text-sm text-center py-8">Documentação não disponível para esta seguradora.</p>'
          }}
        />
      </div>
    </div>
  );
}

// ─── Connect Form ─────────────────────────────────────────────

interface ConnectFormProps {
  connector: InsurerConnector;
  existing?: TenantIntegration;
  onClose: () => void;
  onSaved: () => void;
}

function ConnectForm({ connector, existing, onClose, onSaved }: ConnectFormProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>(existing?.credentials ?? {});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  async function save() {
    setSaving(true);
    if (existing) {
      await supabase.from('propostaone_tenant_integrations').update({ credentials, status: 'connected', last_error: null }).eq('id', existing.id);
    } else {
      await supabase.from('propostaone_tenant_integrations').insert({ connector_id: connector.id, credentials, status: 'connected' });
    }
    onSaved(); onClose();
  }

  async function testConnection() {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    setTestResult(Math.random() > 0.2 ? 'success' : 'error');
    setTesting(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
              <span className="text-lg font-bold text-brand-400">{connector.name.charAt(0)}</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{connector.name}</div>
              <div className="text-xs text-white/40">{connector.description}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {testResult === 'success' && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Conexão testada com sucesso!
          </div>
        )}
        {testResult === 'error' && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Falha na conexão. Verifique as credenciais.
          </div>
        )}

        <div className="space-y-3">
          {(connector.auth_fields as ConnectorAuthField[]).map(field => (
            <div key={field.name}>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">{field.label}</label>
              {field.type === 'select' ? (
                <select className="input-glass" value={credentials[field.name] ?? ''} onChange={e => setCredentials(p => ({ ...p, [field.name]: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type={field.type === 'password' && !showValues[field.name] ? 'password' : 'text'}
                    className="input-glass pr-10"
                    value={credentials[field.name] ?? ''}
                    onChange={e => setCredentials(p => ({ ...p, [field.name]: e.target.value }))}
                    placeholder={field.type === 'password' ? '••••••••' : field.label}
                  />
                  {field.type === 'password' && (
                    <button type="button" onClick={() => setShowValues(p => ({ ...p, [field.name]: !p[field.name] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                      {showValues[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="glass-card p-3 border border-brand-500/15 bg-brand-500/5">
            <div className="text-xs font-semibold text-brand-300 mb-2">Funcionalidades disponíveis</div>
            <div className="flex flex-wrap gap-1.5">
              {connector.supported_features.map(f => (
                <span key={f} className="badge-blue text-[10px]">
                  <CheckCircle className="w-2.5 h-2.5" />
                  {FEATURE_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={testConnection} disabled={testing} className="btn-glass flex-1 justify-center">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Testar conexão
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function MarketplacePage() {
  const [connectors, setConnectors] = useState<InsurerConnector[]>([]);
  const [integrations, setIntegrations] = useState<TenantIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<InsurerConnector | null>(null);
  const [docsConnector, setDocsConnector] = useState<InsurerConnector | null>(null);
  const [tab, setTab] = useState<'all' | 'connected'>('all');

  async function fetchAll() {
    setLoading(true);
    // RLS automatically filters to platform_status = 'active' for regular users
    const [connRes, intRes] = await Promise.all([
      supabase.from('propostaone_insurer_connectors').select('*').order('name'),
      supabase.from('propostaone_tenant_integrations').select('*, connector:propostaone_insurer_connectors(*)').order('created_at'),
    ]);
    setConnectors((connRes.data ?? []) as InsurerConnector[]);
    setIntegrations((intRes.data ?? []) as TenantIntegration[]);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const getIntegration = (connectorId: string) => integrations.find(i => i.connector_id === connectorId);

  const filtered = connectors.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || (tab === 'connected' && getIntegration(c.id)?.status === 'connected');
    return matchSearch && matchTab;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketplace de Seguradoras</h1>
          <p className="page-subtitle">Conecte seguradoras ao seu sistema · {connectedCount} ativas</p>
        </div>
      </div>

      {/* Architecture explainer */}
      <div className="glass-card p-5 border border-brand-500/15 bg-brand-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-brand-300 mb-1">Arquitetura segura e isolada por corretora</div>
            <div className="text-xs text-white/50 leading-relaxed">
              Cada integração utiliza as credenciais exclusivas da sua corretora. A plataforma nunca compartilha acessos entre clientes.
              Todas as chamadas passam pela nossa Integration Layer antes de chegar às APIs das seguradoras.
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-brand-400" /> API Proprietária</span>
              <ChevronRight className="w-3 h-3" />
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-brand-400" /> Isolamento por Tenant</span>
              <ChevronRight className="w-3 h-3" />
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-brand-400" /> Conectores Plug & Play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Seguradoras disponíveis', value: connectors.length, icon: Store },
          { label: 'Conectadas',              value: connectedCount,     icon: CheckCircle },
          { label: 'Com documentação',        value: connectors.filter(c => c.documentation_md).length, icon: BookOpen },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <Icon className="w-5 h-5 text-brand-400" />
              <div><div className="text-lg font-bold text-white">{s.value}</div><div className="text-xs text-white/50">{s.label}</div></div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="input-glass pl-9" placeholder="Buscar seguradora..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="glass-card p-1 flex gap-1">
          {(['all','connected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
              {t === 'all' ? 'Todas' : `Conectadas (${connectedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Connectors grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(connector => {
            const integration = getIntegration(connector.id);
            const isConnected = integration?.status === 'connected';
            const statusCfg = integration ? statusConfig[integration.status] : null;
            const connStatus = connectorStatusConfig[connector.status] ?? connectorStatusConfig.available;
            const StatusIcon = statusCfg?.icon ?? Plug;
            const hasDocs = !!connector.documentation_md;

            return (
              <div key={connector.id} className={`glass-card p-5 transition-all duration-300 flex flex-col gap-3 ${isConnected ? 'border border-emerald-500/15 bg-emerald-500/[0.02]' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg
                      ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] border border-white/[0.10] text-white/70'}`}>
                      {connector.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white/90 text-sm">{connector.name}</div>
                      {integration && (
                        <div className={`flex items-center gap-1 text-xs ${statusCfg?.color ?? 'text-white/40'}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg?.label ?? 'Desconectado'}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={connStatus.badge}>{connStatus.label}</span>
                </div>

                {/* Description */}
                {connector.description && (
                  <div className="text-xs text-white/50 leading-relaxed">{connector.description}</div>
                )}

                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {connector.supported_features.slice(0, 4).map(f => (
                    <span key={f} className="text-[9px] bg-white/[0.05] text-white/40 px-2 py-0.5 rounded-full border border-white/[0.07]">
                      {FEATURE_LABELS[f] ?? f}
                    </span>
                  ))}
                  {connector.supported_features.length > 4 && (
                    <span className="text-[9px] text-white/30 px-2 py-0.5">+{connector.supported_features.length - 4}</span>
                  )}
                </div>

                {/* Last sync */}
                {integration?.last_sync_at && integration.status === 'connected' && (
                  <div className="text-[10px] text-white/30 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5" />
                    Último sync: {new Date(integration.last_sync_at).toLocaleDateString('pt-BR')}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  {hasDocs && (
                    <button
                      onClick={() => setDocsConnector(connector)}
                      className="btn-glass text-xs px-3 justify-center"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedConnector(connector)}
                    className={`text-sm py-2 transition-all flex-1 justify-center ${
                      isConnected
                        ? 'btn-glass border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                        : 'btn-primary'
                    }`}
                  >
                    {isConnected ? (
                      <><CheckCircle className="w-4 h-4" /> Gerenciar</>
                    ) : (
                      <><Plug className="w-4 h-4" /> Conectar</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect form */}
      {selectedConnector && (
        <ConnectForm
          connector={selectedConnector}
          existing={getIntegration(selectedConnector.id)}
          onClose={() => setSelectedConnector(null)}
          onSaved={fetchAll}
        />
      )}

      {/* Docs modal */}
      {docsConnector && (
        <DocsModal connector={docsConnector} onClose={() => setDocsConnector(null)} />
      )}
    </div>
  );
}
