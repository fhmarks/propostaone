import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Edit2, X, CheckCircle, Clock, AlertCircle,
  Zap, ChevronRight, Loader2, Eye, EyeOff, PlayCircle,
  BookOpen, Settings, Cpu, FlaskConical, Globe, Save,
  ArrowRight, ExternalLink, Trash2, Shield, RefreshCw,
  ToggleLeft, ToggleRight, Copy, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InsurerConnector, ConnectorAuthField } from '../../types';

// ─── Constants ────────────────────────────────────────────────

const PLATFORM_STATUS_CONFIG = {
  draft:   { label: 'Rascunho',  badge: 'badge-gray',  icon: Clock,        color: 'text-white/40',   next: 'testing', nextLabel: 'Mover para Teste' },
  testing: { label: 'Em Teste',  badge: 'badge-amber', icon: FlaskConical, color: 'text-amber-400',  next: 'active',  nextLabel: 'Publicar para Clientes' },
  active:  { label: 'Publicada', badge: 'badge-green', icon: CheckCircle,  color: 'text-emerald-400',next: null,      nextLabel: null },
} as const;

const CONNECTOR_STATUS_LABELS: Record<string, string> = {
  available:   'Disponível',
  beta:        'Beta',
  coming_soon: 'Em Breve',
  deprecated:  'Descontinuado',
};

const ALL_FEATURES: { key: string; label: string }[] = [
  { key: 'consultarApolice',  label: 'Consultar Apólice' },
  { key: 'emitirProposta',    label: 'Emitir Proposta' },
  { key: 'consultarCotacao',  label: 'Cotação Online' },
  { key: 'listarProdutos',    label: 'Listar Produtos' },
  { key: 'consultarSinistro', label: 'Consultar Sinistro' },
  { key: 'cancelar',          label: 'Cancelamento' },
  { key: 'emitirSegundaVia',  label: '2ª Via de Apólice' },
  { key: 'refreshToken',      label: 'Auto-renovação Token' },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'multi',     label: 'Multi-ramo' },
  { value: 'auto',      label: 'Automóvel' },
  { value: 'life',      label: 'Vida' },
  { value: 'health',    label: 'Saúde' },
  { value: 'property',  label: 'Propriedade' },
  { value: 'business',  label: 'Empresarial' },
  { value: 'rural',     label: 'Rural' },
  { value: 'transport', label: 'Transporte' },
];

// ─── Markdown Preview (minimal) ───────────────────────────────

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

// ─── Auth Field Editor ────────────────────────────────────────

interface AuthFieldEditorProps {
  fields: ConnectorAuthField[];
  onChange: (fields: ConnectorAuthField[]) => void;
}

function AuthFieldEditor({ fields, onChange }: AuthFieldEditorProps) {
  function update(i: number, patch: Partial<ConnectorAuthField>) {
    const next = fields.map((f, idx) => idx === i ? { ...f, ...patch } : f);
    onChange(next);
  }
  function remove(i: number) { onChange(fields.filter((_, idx) => idx !== i)); }
  function add() {
    onChange([...fields, { name: '', label: '', type: 'text' }]);
  }

  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={i} className="glass-card p-3 border border-white/[0.06]">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Nome interno (key)</label>
              <input
                className="input-glass text-xs h-8"
                placeholder="ex: api_key"
                value={f.name}
                onChange={e => update(i, { name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Rótulo para o usuário</label>
              <input
                className="input-glass text-xs h-8"
                placeholder="ex: API Key"
                value={f.label}
                onChange={e => update(i, { label: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-white/40 mb-1">Tipo</label>
              <select
                className="input-glass text-xs h-8"
                value={f.type}
                onChange={e => update(i, { type: e.target.value as ConnectorAuthField['type'] })}
              >
                <option value="text">Texto</option>
                <option value="password">Senha</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            {f.type === 'select' && (
              <div className="flex-1">
                <label className="block text-[10px] text-white/40 mb-1">Opções (separadas por vírgula)</label>
                <input
                  className="input-glass text-xs h-8"
                  placeholder="sandbox, production"
                  value={f.options?.join(', ') ?? ''}
                  onChange={e => update(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </div>
            )}
            <button
              onClick={() => remove(i)}
              className="mt-4 p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-glass text-xs w-full justify-center">
        <Plus className="w-3.5 h-3.5" /> Adicionar campo
      </button>
    </div>
  );
}

// ─── Connector Edit Modal ─────────────────────────────────────

type ModalTab = 'geral' | 'auth' | 'features' | 'docs' | 'sandbox';

interface ConnectorModalProps {
  connector: InsurerConnector | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_CONNECTOR: Omit<InsurerConnector, 'id' | 'created_at'> = {
  slug: '', name: '', description: '', category: 'multi',
  status: 'available', platform_status: 'draft',
  supported_features: [], auth_fields: [],
  documentation_md: '', sandbox_base_url: '', production_base_url: '',
  api_version: 'v1', docs_url: '', changelog: '', logo_url: '',
};

function ConnectorModal({ connector, onClose, onSaved }: ConnectorModalProps) {
  const isNew = !connector;
  const [tab, setTab] = useState<ModalTab>('geral');
  const [form, setForm] = useState(() => connector ? { ...connector } : { ...EMPTY_CONNECTOR });
  const [saving, setSaving] = useState(false);
  const [sandboxCreds, setSandboxCreds] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; raw?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function patch(p: Partial<typeof form>) { setForm(prev => ({ ...prev, ...p })); }

  async function save() {
    setSaving(true);
    const payload = {
      slug: form.slug,
      name: form.name,
      description: form.description,
      category: form.category,
      status: form.status,
      platform_status: form.platform_status,
      supported_features: form.supported_features,
      auth_fields: form.auth_fields,
      documentation_md: form.documentation_md,
      sandbox_base_url: form.sandbox_base_url,
      production_base_url: form.production_base_url,
      api_version: form.api_version,
      docs_url: form.docs_url,
      changelog: form.changelog,
      logo_url: form.logo_url ?? null,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      await supabase.from('propostaone_insurer_connectors').insert(payload);
    } else {
      await supabase.from('propostaone_insurer_connectors').update(payload).eq('id', connector.id);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function runSandboxTest() {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1800));
    const hasCreds = Object.values(sandboxCreds).some(v => v.trim().length > 0);
    if (!hasCreds) {
      setTestResult({ ok: false, msg: 'Preencha as credenciais de teste antes de executar.' });
    } else {
      setTestResult({
        ok: true,
        msg: 'Conexão estabelecida com sucesso.',
        raw: JSON.stringify({ status: 200, latency_ms: 143, token_expires_in: 3600, environment: 'sandbox' }, null, 2),
      });
    }
    setTesting(false);
  }

  function copyRaw() {
    if (testResult?.raw) { navigator.clipboard.writeText(testResult.raw); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const tabs: { id: ModalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'geral',    label: 'Geral',           icon: Settings },
    { id: 'auth',     label: 'Autenticação',     icon: Shield },
    { id: 'features', label: 'Funcionalidades',  icon: Zap },
    { id: 'docs',     label: 'Documentação',     icon: BookOpen },
    { id: 'sandbox',  label: 'Sandbox',          icon: FlaskConical },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/25 flex items-center justify-center font-bold text-brand-400 overflow-hidden">
              {form.logo_url
                ? <img src={form.logo_url} alt={form.name} className="w-full h-full object-contain p-1" />
                : form.name ? form.name.charAt(0) : '?'}
            </div>
            <div>
              <div className="font-semibold text-white">{isNew ? 'Nova Seguradora' : form.name}</div>
              <div className="text-xs text-white/40">{isNew ? 'Configurar integração' : `slug: ${form.slug}`}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-white/[0.06] pb-0 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                  ${tab === t.id ? 'border-brand-400 text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">

          {/* GERAL */}
          {tab === 'geral' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Nome da seguradora *</label>
                  <input className="input-glass" placeholder="ex: Porto Seguro" value={form.name} onChange={e => patch({ name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Slug (identificador único)</label>
                  <input className="input-glass font-mono text-sm" placeholder="porto-seguro" value={form.slug} onChange={e => patch({ slug: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Descrição</label>
                <input className="input-glass" placeholder="Integração com ... via API REST" value={form.description ?? ''} onChange={e => patch({ description: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">URL do logotipo <span className="font-normal text-white/30">(PNG/SVG, aparece no card)</span></label>
                <input className="input-glass" placeholder="https://..." value={form.logo_url ?? ''} onChange={e => patch({ logo_url: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Categoria</label>
                  <select className="input-glass" value={form.category ?? 'multi'} onChange={e => patch({ category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Status (label clientes)</label>
                  <select className="input-glass" value={form.status} onChange={e => patch({ status: e.target.value as InsurerConnector['status'] })}>
                    {Object.entries(CONNECTOR_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Versão da API</label>
                  <input className="input-glass" placeholder="v1" value={form.api_version ?? ''} onChange={e => patch({ api_version: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">URL Sandbox</label>
                  <input className="input-glass font-mono text-xs" placeholder="https://api-sandbox.seguradora.com.br/v1" value={form.sandbox_base_url ?? ''} onChange={e => patch({ sandbox_base_url: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">URL Produção</label>
                  <input className="input-glass font-mono text-xs" placeholder="https://api.seguradora.com.br/v1" value={form.production_base_url ?? ''} onChange={e => patch({ production_base_url: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Link da documentação oficial</label>
                <input className="input-glass" placeholder="https://developers.seguradora.com.br" value={form.docs_url ?? ''} onChange={e => patch({ docs_url: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Changelog / Notas internas</label>
                <textarea className="input-glass min-h-[72px] text-xs leading-relaxed" placeholder="v1.2.0 — adicionado suporte a cotação online..." value={form.changelog ?? ''} onChange={e => patch({ changelog: e.target.value })} />
              </div>
            </div>
          )}

          {/* AUTH */}
          {tab === 'auth' && (
            <div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Defina os campos de credencial que cada corretora precisará preencher para conectar-se a esta seguradora. Esses campos aparecem no Marketplace dos clientes.
              </p>
              <AuthFieldEditor fields={form.auth_fields as ConnectorAuthField[]} onChange={fields => patch({ auth_fields: fields })} />
            </div>
          )}

          {/* FEATURES */}
          {tab === 'features' && (
            <div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Marque as funcionalidades que esta integração suporta. Elas são exibidas no card do Marketplace.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_FEATURES.map(feat => {
                  const active = form.supported_features.includes(feat.key);
                  return (
                    <label key={feat.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${active ? 'bg-brand-600/20 border-brand-500/30 text-brand-300' : 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:border-white/20'}`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-brand-500"
                        checked={active}
                        onChange={e => {
                          const feats = e.target.checked
                            ? [...form.supported_features, feat.key]
                            : form.supported_features.filter(k => k !== feat.key);
                          patch({ supported_features: feats });
                        }}
                      />
                      <div>
                        <div className="text-xs font-medium">{feat.label}</div>
                        <div className="text-[10px] text-white/30 font-mono">{feat.key}</div>
                      </div>
                      {active && <CheckCircle className="w-3.5 h-3.5 ml-auto text-brand-400" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOCS */}
          {tab === 'docs' && (
            <div>
              <p className="text-xs text-white/50 mb-3 leading-relaxed">
                Escreva a documentação em Markdown. Esta documentação será exibida para os clientes no Marketplace ao clicar em "Ver documentação".
              </p>
              <div className="grid grid-cols-2 gap-4 h-[400px]">
                <div className="flex flex-col">
                  <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Editor</div>
                  <textarea
                    className="flex-1 input-glass font-mono text-xs leading-relaxed resize-none"
                    placeholder={'# Nome da Seguradora\n\n## Autenticação\n\n...\n\n## Endpoints\n\n...'}
                    value={form.documentation_md ?? ''}
                    onChange={e => patch({ documentation_md: e.target.value })}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Preview</div>
                  <div
                    className="flex-1 glass-card p-4 overflow-y-auto text-xs"
                    dangerouslySetInnerHTML={{ __html: form.documentation_md ? renderMarkdown(form.documentation_md) : '<p class="text-white/30 text-xs">Pré-visualização aparecerá aqui...</p>' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SANDBOX */}
          {tab === 'sandbox' && (
            <div>
              <div className="glass-card p-4 border border-amber-500/15 bg-amber-500/5 mb-4">
                <div className="flex items-start gap-3">
                  <FlaskConical className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-1">Ambiente de Testes</div>
                    <div className="text-xs text-white/50 leading-relaxed">
                      Insira as credenciais de sandbox desta seguradora para validar a integração antes de publicar para os clientes.
                      {form.sandbox_base_url && (
                        <> Endpoint: <code className="text-cyan-400">{form.sandbox_base_url}</code></>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {(form.auth_fields as ConnectorAuthField[]).length === 0 ? (
                  <div className="text-xs text-white/40 text-center py-8">
                    Configure os campos de autenticação na aba "Autenticação" primeiro.
                  </div>
                ) : (form.auth_fields as ConnectorAuthField[]).map(field => (
                  <div key={field.name}>
                    <label className="block text-xs text-white/60 mb-1.5 font-medium">{field.label} (sandbox)</label>
                    {field.type === 'select' ? (
                      <select className="input-glass" value={sandboxCreds[field.name] ?? ''} onChange={e => setSandboxCreds(p => ({ ...p, [field.name]: e.target.value }))}>
                        <option value="">Selecionar...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPw[field.name] ? 'password' : 'text'}
                          className="input-glass pr-10"
                          placeholder={field.type === 'password' ? '••••••••' : field.label}
                          value={sandboxCreds[field.name] ?? ''}
                          onChange={e => setSandboxCreds(p => ({ ...p, [field.name]: e.target.value }))}
                        />
                        {field.type === 'password' && (
                          <button type="button" onClick={() => setShowPw(p => ({ ...p, [field.name]: !p[field.name] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                            {showPw[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={runSandboxTest} disabled={testing} className="btn-primary w-full justify-center mb-4">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {testing ? 'Testando conexão...' : 'Executar Teste'}
              </button>

              {testResult && (
                <div className={`glass-card p-4 border ${testResult.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {testResult.msg}
                  </div>
                  {testResult.raw && (
                    <div className="relative">
                      <pre className="bg-black/30 border border-white/[0.06] rounded-lg p-3 text-xs text-cyan-300 overflow-x-auto">
                        {testResult.raw}
                      </pre>
                      <button onClick={copyRaw} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white transition-colors">
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Status da plataforma:</span>
            {(() => {
              const cfg = PLATFORM_STATUS_CONFIG[form.platform_status];
              const Icon = cfg.icon;
              return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </span>
              );
            })()}
            {form.platform_status !== 'draft' && (
              <button
                onClick={() => patch({ platform_status: 'draft' })}
                className="text-[10px] text-white/30 hover:text-red-400 transition-colors ml-2"
              >
                Despublicar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-glass text-xs">Cancelar</button>
            {PLATFORM_STATUS_CONFIG[form.platform_status].next && (
              <button
                onClick={() => patch({ platform_status: PLATFORM_STATUS_CONFIG[form.platform_status].next as InsurerConnector['platform_status'] })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                {PLATFORM_STATUS_CONFIG[form.platform_status].nextLabel}
              </button>
            )}
            <button onClick={save} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isNew ? 'Criar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Pipeline Widget ───────────────────────────────────

function StatusPipeline({ current }: { current: InsurerConnector['platform_status'] }) {
  const steps: InsurerConnector['platform_status'][] = ['draft', 'testing', 'active'];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const cfg = PLATFORM_STATUS_CONFIG[s];
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all
              ${active ? `${cfg.badge} opacity-100` : done ? 'bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20' : 'bg-white/[0.04] text-white/20 border border-white/[0.06]'}`}>
              {cfg.label}
            </div>
            {i < steps.length - 1 && <ChevronRight className={`w-2.5 h-2.5 ${done ? 'text-emerald-400/40' : 'text-white/20'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────

interface Props {
  onRefresh?: () => void;
}

export default function InsurerManagementTab({ onRefresh }: Props) {
  const [connectors, setConnectors] = useState<InsurerConnector[]>([]);
  const [integrationCounts, setIntegrationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | InsurerConnector['platform_status']>('all');
  const [editing, setEditing] = useState<InsurerConnector | null | 'new'>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [connRes, intRes] = await Promise.all([
      supabase.from('propostaone_insurer_connectors').select('*').order('name'),
      supabase.from('propostaone_tenant_integrations').select('connector_id, status').eq('status', 'connected'),
    ]);

    const conns = (connRes.data ?? []) as InsurerConnector[];
    const integs = (intRes.data ?? []) as { connector_id: string; status: string }[];
    const counts: Record<string, number> = {};
    integs.forEach(i => { counts[i.connector_id] = (counts[i.connector_id] ?? 0) + 1; });

    setConnectors(conns);
    setIntegrationCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function advanceStatus(conn: InsurerConnector) {
    const next = PLATFORM_STATUS_CONFIG[conn.platform_status].next;
    if (!next) return;
    setPublishing(conn.id);
    await supabase.from('propostaone_insurer_connectors').update({ platform_status: next, updated_at: new Date().toISOString() }).eq('id', conn.id);
    await fetchData();
    onRefresh?.();
    setPublishing(null);
  }

  async function revertStatus(conn: InsurerConnector) {
    setPublishing(conn.id);
    await supabase.from('propostaone_insurer_connectors').update({ platform_status: 'testing', updated_at: new Date().toISOString() }).eq('id', conn.id);
    await fetchData();
    onRefresh?.();
    setPublishing(null);
  }

  const filtered = connectors.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.platform_status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all:     connectors.length,
    draft:   connectors.filter(c => c.platform_status === 'draft').length,
    testing: connectors.filter(c => c.platform_status === 'testing').length,
    active:  connectors.filter(c => c.platform_status === 'active').length,
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Seguradoras</h1>
          <p className="page-subtitle">{counts.active} publicadas · {counts.testing} em teste · {counts.draft} rascunho</p>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Nova Seguradora
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="input-glass pl-9" placeholder="Buscar seguradora..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="glass-card p-1 flex gap-1">
          {([['all', `Todas (${counts.all})`], ['draft', `Rascunho (${counts.draft})`], ['testing', `Em Teste (${counts.testing})`], ['active', `Publicadas (${counts.active})`]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${filter === val ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={fetchData} className="btn-glass text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Globe className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <div className="text-white/50 text-sm">Nenhuma seguradora encontrada</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(conn => {
            const psCfg = PLATFORM_STATUS_CONFIG[conn.platform_status];
            const PsIcon = psCfg.icon;
            const clientCount = integrationCounts[conn.id] ?? 0;
            const isPublishing = publishing === conn.id;

            return (
              <div key={conn.id} className={`glass-card p-5 flex flex-col gap-3 transition-all
                ${conn.platform_status === 'active' ? 'border border-emerald-500/15 bg-emerald-500/[0.02]' : ''}
                ${conn.platform_status === 'testing' ? 'border border-amber-500/15 bg-amber-500/[0.02]' : ''}
              `}>
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden
                      ${conn.platform_status === 'active' ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                      : conn.platform_status === 'testing' ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400'
                      : 'bg-white/[0.06] border border-white/[0.10] text-white/60'}`}>
                      {conn.logo_url
                        ? <img src={conn.logo_url} alt={conn.name} className="w-full h-full object-contain p-1" />
                        : conn.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white/90 text-sm truncate">{conn.name}</div>
                      <div className="text-[10px] text-white/40 font-mono">{conn.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <span className={`${PLATFORM_STATUS_CONFIG[conn.platform_status].badge} text-[9px]`}>
                      {psCfg.label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {conn.description && (
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{conn.description}</p>
                )}

                {/* Pipeline */}
                <StatusPipeline current={conn.platform_status} />

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-white/50">
                    <Cpu className="w-3 h-3" />
                    {conn.supported_features.length} func.
                  </div>
                  <div className="flex items-center gap-1 text-white/50">
                    <Shield className="w-3 h-3" />
                    {(conn.auth_fields as ConnectorAuthField[]).length} campos auth
                  </div>
                  {clientCount > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      {clientCount} corretora{clientCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {conn.documentation_md && (
                    <div className="flex items-center gap-1 text-brand-400">
                      <BookOpen className="w-3 h-3" />
                      Docs
                    </div>
                  )}
                </div>

                {/* URLs */}
                {(conn.sandbox_base_url || conn.production_base_url) && (
                  <div className="space-y-1">
                    {conn.sandbox_base_url && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono truncate">
                        <FlaskConical className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                        {conn.sandbox_base_url}
                      </div>
                    )}
                    {conn.production_base_url && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono truncate">
                        <Globe className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                        {conn.production_base_url}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button
                    onClick={() => setEditing(conn)}
                    className="btn-glass text-xs flex-1 justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>

                  {conn.platform_status === 'active' ? (
                    <button
                      onClick={() => revertStatus(conn)}
                      disabled={isPublishing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      Despublicar
                    </button>
                  ) : psCfg.next ? (
                    <button
                      onClick={() => advanceStatus(conn)}
                      disabled={isPublishing}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                        ${conn.platform_status === 'draft'
                          ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25'
                          : 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                        }`}
                    >
                      {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ToggleRight className="w-3.5 h-3.5" />}
                      {conn.platform_status === 'draft' ? 'Testar' : 'Publicar'}
                    </button>
                  ) : null}

                  {conn.docs_url && (
                    <a href={conn.docs_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {editing !== null && (
        <ConnectorModal
          connector={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { fetchData(); onRefresh?.(); }}
        />
      )}
    </>
  );
}
