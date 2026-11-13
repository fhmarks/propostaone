import React, { useState, useCallback } from 'react';
import {
  X, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff,
  Building2, Users, DollarSign, Home, MoreHorizontal,
  Shield, Loader2, Search, AlertCircle, Check,
  Car, Heart, Activity, Briefcase, Leaf, Truck, Plane, Gift,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  cnae_fiscal_descricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  email: string;
  ddd_telefone_1: string;
  descricao_porte: string;
  capital_social: number;
  opcao_simples: boolean;
  opcao_mei: boolean;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const fnHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Apikey': SUPABASE_ANON_KEY,
};

const STEP_LABELS = ['CNPJ', 'Empresa', 'Acesso', 'Negócio'];

const BUSINESS_TYPES = [
  { id: 'corretora_seguros', label: 'Corretora de Seguros', Icon: Shield },
  { id: 'assessoria',        label: 'Assessoria / Consultoria', Icon: Users },
  { id: 'financeira',        label: 'Financeira / Crédito', Icon: DollarSign },
  { id: 'imobiliaria',       label: 'Imobiliária', Icon: Home },
  { id: 'outro',             label: 'Outro', Icon: MoreHorizontal },
];

interface InsuranceBranch {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorActive: string;
  colorIcon: string;
  subs: { id: string; label: string }[];
}

const INSURANCE_BRANCHES: InsuranceBranch[] = [
  {
    id: 'auto', label: 'Automóvel', Icon: Car,
    colorActive: 'bg-blue-500/15 border-blue-500/35 text-blue-200',
    colorIcon: 'text-blue-400',
    subs: [
      { id: 'auto_individual', label: 'Auto Individual' },
      { id: 'auto_frota',      label: 'Frotas' },
      { id: 'auto_moto',       label: 'Motocicletas' },
      { id: 'auto_caminhao',   label: 'Caminhões' },
    ],
  },
  {
    id: 'vida', label: 'Vida', Icon: Heart,
    colorActive: 'bg-rose-500/15 border-rose-500/35 text-rose-200',
    colorIcon: 'text-rose-400',
    subs: [
      { id: 'vida_individual', label: 'Vida Individual' },
      { id: 'vida_grupo',      label: 'Vida em Grupo' },
      { id: 'vida_ap',         label: 'Acidentes Pessoais' },
      { id: 'vida_prev',       label: 'Previdência Privada' },
    ],
  },
  {
    id: 'saude', label: 'Saúde', Icon: Activity,
    colorActive: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200',
    colorIcon: 'text-emerald-400',
    subs: [
      { id: 'saude_plano',          label: 'Planos de Saúde' },
      { id: 'saude_odonto',         label: 'Odontológico' },
      { id: 'saude_internacional',  label: 'Saúde Internacional' },
    ],
  },
  {
    id: 'residencial', label: 'Residencial', Icon: Home,
    colorActive: 'bg-amber-500/15 border-amber-500/35 text-amber-200',
    colorIcon: 'text-amber-400',
    subs: [
      { id: 'res_casa',      label: 'Casa Própria' },
      { id: 'res_aluguel',   label: 'Aluguel / Fiança' },
      { id: 'res_cond',      label: 'Condomínio' },
    ],
  },
  {
    id: 'empresarial', label: 'Empresarial', Icon: Briefcase,
    colorActive: 'bg-cyan-500/15 border-cyan-500/35 text-cyan-200',
    colorIcon: 'text-cyan-400',
    subs: [
      { id: 'emp_patrimonial',   label: 'Patrimonial' },
      { id: 'emp_rc_geral',      label: 'RC Geral' },
      { id: 'emp_dno',           label: 'D&O / Diretores' },
      { id: 'emp_rc_prof',       label: 'RC Profissional' },
      { id: 'emp_garantia',      label: 'Garantia' },
      { id: 'emp_cyber',         label: 'Cyber / Digital' },
    ],
  },
  {
    id: 'rural', label: 'Rural', Icon: Leaf,
    colorActive: 'bg-lime-500/15 border-lime-500/35 text-lime-200',
    colorIcon: 'text-lime-400',
    subs: [
      { id: 'rural_agricola',    label: 'Agrícola' },
      { id: 'rural_benfeit',     label: 'Benfeitorias' },
      { id: 'rural_pecuario',    label: 'Pecuário' },
    ],
  },
  {
    id: 'transporte', label: 'Transportes', Icon: Truck,
    colorActive: 'bg-violet-500/15 border-violet-500/35 text-violet-200',
    colorIcon: 'text-violet-400',
    subs: [
      { id: 'trans_nac',   label: 'Carga Nacional' },
      { id: 'trans_int',   label: 'Carga Internacional' },
      { id: 'trans_mar',   label: 'Marítimo' },
      { id: 'trans_aer',   label: 'Aéreo' },
    ],
  },
  {
    id: 'viagem', label: 'Viagem', Icon: Plane,
    colorActive: 'bg-sky-500/15 border-sky-500/35 text-sky-200',
    colorIcon: 'text-sky-400',
    subs: [
      { id: 'viagem_nac',  label: 'Viagem Nacional' },
      { id: 'viagem_int',  label: 'Internacional' },
      { id: 'viagem_grp',  label: 'Grupos / Turismo' },
    ],
  },
  {
    id: 'beneficios', label: 'Benefícios', Icon: Gift,
    colorActive: 'bg-pink-500/15 border-pink-500/35 text-pink-200',
    colorIcon: 'text-pink-400',
    subs: [
      { id: 'benef_corp',   label: 'Benefícios Corp.' },
      { id: 'benef_cap',    label: 'Capitalização' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function pwdStrength(pwd: string) {
  return [
    { label: '8 ou mais caracteres', ok: pwd.length >= 8 },
    { label: 'Letra maiúscula',       ok: /[A-Z]/.test(pwd) },
    { label: 'Número',                ok: /\d/.test(pwd) },
    { label: 'Caractere especial',    ok: /[^A-Za-z0-9]/.test(pwd) },
  ];
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const done   = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600/30 border-2 border-brand-500 text-brand-300' : 'bg-white/[0.06] border border-white/[0.12] text-white/30'}`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : idx}
              </div>
              <span className={`text-[9px] font-medium uppercase tracking-wide hidden sm:block ${active ? 'text-brand-300' : done ? 'text-white/50' : 'text-white/25'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px transition-all ${done ? 'bg-brand-500' : 'bg-white/[0.08]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [step, setStep] = useState(1);

  // Step 1
  const [cnpjRaw, setCnpjRaw] = useState('');
  const [cnpjData, setCnpjData] = useState<CnpjData | null>(null);
  const [provisionalTenantId, setProvisionalTenantId] = useState<string | null>(null);

  // Step 2
  const [displayName, setDisplayName] = useState('');

  // Step 3
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 4
  const [businessType, setBusinessType] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSubbranches, setSelectedSubbranches] = useState<string[]>([]);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setStep(1);
    setCnpjRaw('');
    setCnpjData(null);
    setProvisionalTenantId(null);
    setDisplayName('');
    setFullName('');
    setEmail('');
    setWhatsapp('');
    setPassword('');
    setConfirmPassword('');
    setBusinessType('');
    setSelectedBranches([]);
    setSelectedSubbranches([]);
    setAcceptTerms(false);
    setError('');
    setLoading(false);
  }, []);

  function handleClose() {
    reset();
    onClose();
  }

  function toggleBranch(id: string) {
    setSelectedBranches(prev => {
      if (prev.includes(id)) {
        // Also remove any sub-branches for this branch
        const branch = INSURANCE_BRANCHES.find(b => b.id === id);
        if (branch) {
          const subIds = branch.subs.map(s => s.id);
          setSelectedSubbranches(p => p.filter(s => !subIds.includes(s)));
        }
        return prev.filter(b => b !== id);
      }
      return [...prev, id];
    });
  }

  function toggleSubbranch(id: string) {
    setSelectedSubbranches(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  }

  // ── STEP 1: CNPJ lookup ────────────────────────────────────────────────────

  async function handleCnpjLookup() {
    const raw = cnpjRaw.replace(/\D/g, '');
    if (raw.length !== 14) {
      setError('Digite um CNPJ completo com 14 dígitos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/propostaone-cnpj-lookup?cnpj=${raw}`,
        { headers: fnHeaders },
      );
      const json = await res.json() as { success: boolean; data?: CnpjData; error?: string };

      if (!json.success || !json.data) {
        setError(json.error ?? 'CNPJ não encontrado. Verifique e tente novamente.');
        return;
      }

      setCnpjData(json.data);
      setDisplayName(json.data.nome_fantasia || json.data.razao_social);

      fetch(`${SUPABASE_URL}/functions/v1/propostaone-provisional-register`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({
          cnpj: json.data.cnpj,
          razaoSocial: json.data.razao_social,
          nomeFantasia: json.data.nome_fantasia,
          cnaeDescricao: json.data.cnae_fiscal_descricao,
          porte: json.data.descricao_porte,
          capitalSocial: json.data.capital_social,
          opcaoSimples: json.data.opcao_simples,
          opcaoMei: json.data.opcao_mei,
          email: json.data.email,
          phone: json.data.ddd_telefone_1,
          addressStreet: json.data.logradouro,
          addressNumber: json.data.numero,
          addressComplement: json.data.complemento,
          addressNeighborhood: json.data.bairro,
          addressCity: json.data.municipio,
          addressState: json.data.uf,
          addressZipcode: json.data.cep,
        }),
      })
        .then(r => r.json())
        .then((r: { tenantId?: string }) => { if (r.tenantId) setProvisionalTenantId(r.tenantId); })
        .catch(() => {});

      setStep(2);
    } catch {
      setError('Erro ao consultar CNPJ. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  // ── STEP 4: Final register ─────────────────────────────────────────────────

  async function handleFinalRegister() {
    if (!businessType) {
      setError('Selecione o tipo de negócio para continuar.');
      return;
    }
    setError('');
    setLoading(true);

    const utmData = (() => {
      try {
        const params = new URLSearchParams(window.location.search);
        return {
          utm_source:   params.get('utm_source')   || localStorage.getItem('utm_source')   || undefined,
          utm_medium:   params.get('utm_medium')   || localStorage.getItem('utm_medium')   || undefined,
          utm_campaign: params.get('utm_campaign') || localStorage.getItem('utm_campaign') || undefined,
          gclid:        params.get('gclid')        || localStorage.getItem('gclid')        || undefined,
        };
      } catch { return {}; }
    })();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/propostaone-register`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({
          cnpj: cnpjData!.cnpj,
          razao_social: cnpjData!.razao_social,
          nome_fantasia: cnpjData!.nome_fantasia,
          display_name: displayName,
          cnae_descricao: cnpjData!.cnae_fiscal_descricao,
          logradouro: cnpjData!.logradouro,
          numero: cnpjData!.numero,
          complemento: cnpjData!.complemento,
          bairro: cnpjData!.bairro,
          municipio: cnpjData!.municipio,
          uf: cnpjData!.uf,
          cep: cnpjData!.cep,
          email_receita: cnpjData!.email,
          phone_receita: cnpjData!.ddd_telefone_1,
          fullName,
          contactEmail: email,
          whatsapp: whatsapp.replace(/\D/g, ''),
          password,
          business_type: businessType,
          business_subtype: selectedBranches[0] || undefined,
          insurance_branches: selectedBranches.length > 0 ? selectedBranches : undefined,
          insurance_subbranches: selectedSubbranches.length > 0 ? selectedSubbranches : undefined,
          existingTenantId: provisionalTenantId || undefined,
          ...utmData,
        }),
      });

      const json = await res.json() as { success: boolean; error?: string; code?: string };

      if (!json.success) {
        if (json.code === 'EMAIL_EXISTS') {
          setError('Este e-mail já está cadastrado. Use outro ou faça login.');
        } else if (json.code === 'CNPJ_EXISTS') {
          setError('Este CNPJ já possui uma conta. Faça login ou use outro CNPJ.');
        } else {
          setError(json.error ?? 'Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      await supabase.auth.signInWithPassword({ email, password });
      setStep(5);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const pwdHints  = pwdStrength(password);
  const pwdScore  = pwdHints.filter(h => h.ok).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg my-auto animate-slide-up">
        <div className="glass-panel p-8 relative">
          {step < 5 && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-400" />
            </div>
            <span className="text-sm font-bold text-white">
              Corretora<span className="text-brand-400">One</span>
            </span>
            <span className="text-xs text-white/30 ml-auto">Criar conta grátis</span>
          </div>

          {step <= 4 && <ProgressBar step={step} />}

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm leading-snug">{error}</p>
            </div>
          )}

          {/* ── STEP 1: CNPJ ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Consulte seu CNPJ</h2>
              <p className="text-white/50 text-sm mb-6">
                Vamos buscar os dados da sua empresa automaticamente na Receita Federal.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5 font-medium">CNPJ da Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      className="input-glass pl-9 font-mono tracking-widest"
                      placeholder="00.000.000/0000-00"
                      value={cnpjRaw}
                      onChange={e => setCnpjRaw(formatCnpj(e.target.value))}
                      onKeyDown={e => e.key === 'Enter' && handleCnpjLookup()}
                      maxLength={18}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleCnpjLookup}
                  disabled={loading || cnpjRaw.replace(/\D/g, '').length !== 14}
                  className="btn-primary w-full justify-center"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Consultando Receita Federal...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Consultar CNPJ</>
                  )}
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
                <p className="text-white/40 text-sm">
                  Já tem cadastro?{' '}
                  <button
                    onClick={() => { handleClose(); onSwitchToLogin(); }}
                    className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Confirm company ───────────────────────────────────── */}
          {step === 2 && cnpjData && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Confirme os dados</h2>
              <p className="text-white/50 text-sm mb-5">
                Encontramos sua empresa. Como quer que ela apareça no sistema?
              </p>

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 mb-5 space-y-2.5">
                <InfoRow label="Razão Social" value={cnpjData.razao_social} />
                <InfoRow label="CNPJ" value={formatCnpj(cnpjData.cnpj)} mono />
                {cnpjData.cnae_fiscal_descricao && <InfoRow label="Atividade" value={cnpjData.cnae_fiscal_descricao} />}
                {cnpjData.descricao_porte && <InfoRow label="Porte" value={cnpjData.descricao_porte} />}
                {cnpjData.municipio && <InfoRow label="Cidade" value={`${cnpjData.municipio} / ${cnpjData.uf}`} />}
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5 font-medium">
                  Nome da empresa no sistema
                </label>
                <input
                  className="input-glass"
                  placeholder="Ex: Corretora Silva Seguros"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <p className="text-xs text-white/30 mt-1.5">Este é o nome que aparecerá em relatórios e no sistema.</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(1); setError(''); }} className="btn-glass flex-1 justify-center">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => {
                    if (displayName.trim().length < 2) { setError('Nome deve ter pelo menos 2 caracteres.'); return; }
                    setError(''); setStep(3);
                  }}
                  className="btn-primary flex-1 justify-center"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: User details ──────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Criar acesso</h2>
              <p className="text-white/50 text-sm mb-5">
                Dados do administrador principal da corretora.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5 font-medium">Nome completo</label>
                  <input
                    className="input-glass"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5 font-medium">E-mail</label>
                    <input
                      type="email"
                      className="input-glass"
                      placeholder="voce@email.com.br"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5 font-medium">WhatsApp</label>
                    <input
                      type="tel"
                      className="input-glass"
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={e => setWhatsapp(formatPhone(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5 font-medium">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-glass pr-10"
                      placeholder="Crie uma senha segura"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3].map(i => (
                          <div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all ${i < pwdScore
                              ? pwdScore <= 1 ? 'bg-red-500' : pwdScore === 2 ? 'bg-amber-500' : pwdScore === 3 ? 'bg-yellow-400' : 'bg-emerald-500'
                              : 'bg-white/[0.08]'}`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {pwdHints.map(h => (
                          <div key={h.label} className={`flex items-center gap-1 text-[10px] ${h.ok ? 'text-emerald-400' : 'text-white/30'}`}>
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${h.ok ? 'bg-emerald-500' : 'bg-white/[0.08]'}`} />
                            {h.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5 font-medium">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className={`input-glass pr-10 ${confirmPassword && confirmPassword !== password ? 'border-red-500/40' : ''}`}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-red-400 text-xs mt-1">As senhas não coincidem.</p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setAcceptTerms(!acceptTerms)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
                      ${acceptTerms ? 'bg-brand-600 border-brand-500' : 'bg-white/[0.05] border-white/[0.15]'}`}
                  >
                    {acceptTerms && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-xs text-white/50 leading-relaxed">
                    Concordo com os{' '}
                    <span className="text-brand-400">Termos de Uso</span> e{' '}
                    <span className="text-brand-400">Política de Privacidade</span>.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(2); setError(''); }} className="btn-glass flex-1 justify-center">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => {
                    if (!fullName.trim()) { setError('Informe seu nome completo.'); return; }
                    if (!email.trim() || !email.includes('@')) { setError('Informe um e-mail válido.'); return; }
                    if (pwdScore < 3) { setError('A senha não atende aos critérios mínimos.'); return; }
                    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
                    if (!acceptTerms) { setError('Aceite os Termos de Uso para continuar.'); return; }
                    setError(''); setStep(4);
                  }}
                  className="btn-primary flex-1 justify-center"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
                <p className="text-white/40 text-sm">
                  Já tem cadastro?{' '}
                  <button
                    onClick={() => { handleClose(); onSwitchToLogin(); }}
                    className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Business type + Insurance branches ────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Tipo de negócio</h2>
              <p className="text-white/50 text-sm mb-5">
                Selecione o perfil da sua empresa e os ramos em que atua.
              </p>

              {/* Business type — compact horizontal row */}
              <div className="mb-5">
                <p className="text-xs text-white/40 font-medium mb-2.5">Perfil da empresa</p>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map(({ id, label, Icon }) => {
                    const active = businessType === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { setBusinessType(id); if (id !== 'corretora_seguros' && id !== 'assessoria') { setSelectedBranches([]); setSelectedSubbranches([]); } }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all
                          ${active
                            ? 'bg-brand-600/25 border-brand-500/50 text-brand-200'
                            : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80'
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Insurance branches — shown for all types */}
              {businessType && (
                <>
                  <div className="border-t border-white/[0.06] pt-4 mb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white/70">Ramos de atuação</p>
                      {selectedBranches.length > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-300">
                          {selectedBranches.length} selecionado{selectedBranches.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      Marque todos os ramos que sua empresa opera
                    </p>
                  </div>

                  {/* Branch grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {INSURANCE_BRANCHES.map(branch => {
                      const active = selectedBranches.includes(branch.id);
                      const Icon   = branch.Icon;
                      return (
                        <button
                          key={branch.id}
                          onClick={() => toggleBranch(branch.id)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all
                            ${active
                              ? `${branch.colorActive} shadow-sm`
                              : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-white/20 hover:bg-white/[0.05]'
                            }`}
                        >
                          {active && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          <Icon className={`w-5 h-5 ${active ? branch.colorIcon : 'text-white/40'}`} />
                          <span className="text-[10px] font-medium leading-tight">{branch.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-branches for selected branches */}
                  {selectedBranches.length > 0 && (
                    <div className="space-y-3 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        Especialidades (opcional)
                      </p>
                      {selectedBranches.map(branchId => {
                        const branch = INSURANCE_BRANCHES.find(b => b.id === branchId);
                        if (!branch) return null;
                        return (
                          <div key={branchId}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <branch.Icon className={`w-3 h-3 ${branch.colorIcon}`} />
                              <span className="text-[10px] font-semibold text-white/60">{branch.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {branch.subs.map(sub => {
                                const subActive = selectedSubbranches.includes(sub.id);
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => toggleSubbranch(sub.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border
                                      ${subActive
                                        ? `${branch.colorActive}`
                                        : 'bg-white/[0.04] border-white/[0.08] text-white/45 hover:text-white/70'
                                      }`}
                                  >
                                    {subActive && <span className="mr-1">✓</span>}
                                    {sub.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(3); setError(''); }} className="btn-glass flex-1 justify-center">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={handleFinalRegister}
                  disabled={loading || !businessType}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                  ) : (
                    <>Concluir Cadastro <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Success ───────────────────────────────────────────── */}
          {step === 5 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Conta criada!</h2>
              <p className="text-white/60 text-sm mb-1">
                Bem-vindo à <span className="text-brand-400 font-semibold">CorretoraOne</span>,{' '}
                <span className="text-white/90">{fullName.split(' ')[0]}</span>.
              </p>
              <p className="text-white/40 text-xs mb-8">
                Sua corretora <strong className="text-white/60">{displayName}</strong> está pronta para começar.
              </p>

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 mb-6 text-left space-y-3">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Resumo</p>
                <InfoRow label="E-mail" value={email} />
                <InfoRow label="Empresa" value={displayName} />
                <InfoRow label="Plano" value="Gratuito" />
                {selectedBranches.length > 0 && (
                  <InfoRow
                    label="Ramos"
                    value={selectedBranches
                      .map(id => INSURANCE_BRANCHES.find(b => b.id === id)?.label ?? id)
                      .join(', ')}
                  />
                )}
              </div>

              <button onClick={onClose} className="btn-primary w-full justify-center">
                Acessar o CorretoraOne
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-white/30 text-xs mt-3">
                Você pode alterar sua senha a qualquer momento nas configurações.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-component ──────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-white/40 flex-shrink-0">{label}</span>
      <span className={`text-xs text-white/80 text-right ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
