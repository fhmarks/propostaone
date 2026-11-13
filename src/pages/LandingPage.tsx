import React, { useEffect, useRef, useState } from 'react';
import {
  Shield, ArrowRight, ChevronDown,
  Users, Kanban, Calendar, FileText,
  DollarSign, Zap, MessageSquare, FolderOpen,
  BarChart3, Store, CheckCircle2,
  Building2, TrendingUp, Lock, Globe,
} from 'lucide-react';
import RegisterModal from '../components/RegisterModal';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const features = [
  {
    icon: Users,
    title: 'CRM Completo',
    description: 'Gerencie clientes, leads e empresas em um único lugar. Histórico completo, segmentação e acompanhamento de cada contato.',
    color: 'brand',
    stats: '360° do cliente',
  },
  {
    icon: Kanban,
    title: 'Pipeline de Vendas',
    description: 'Visualize suas oportunidades em um kanban intuitivo. Mova negócios entre etapas e nunca perca um fechamento.',
    color: 'cyan',
    stats: 'Mais vendas fechadas',
  },
  {
    icon: FileText,
    title: 'Gestão de Apólices',
    description: 'Controle todas as apólices, renovações e endossos. Alertas automáticos antes do vencimento.',
    color: 'emerald',
    stats: 'Zero apólice perdida',
  },
  {
    icon: Calendar,
    title: 'Agenda & Tarefas',
    description: 'Calendário integrado com visitas, chamadas e renovações. Nunca esqueça um compromisso importante.',
    color: 'amber',
    stats: 'Agenda organizada',
  },
  {
    icon: DollarSign,
    title: 'Financeiro & Comissões',
    description: 'Acompanhe comissões, receitas e despesas. Relatórios financeiros em tempo real para sua corretora.',
    color: 'green',
    stats: 'Comissões no controle',
  },
  {
    icon: Zap,
    title: 'Automações',
    description: 'Envie mensagens de aniversário, alertas de renovação e follow-ups automáticos. Trabalhe enquanto o sistema cuida das rotinas.',
    color: 'purple',
    stats: 'Automação inteligente',
  },
  {
    icon: MessageSquare,
    title: 'Comunicação',
    description: 'Templates prontos para WhatsApp, e-mail e SMS. Histórico de todas as interações com cada cliente.',
    color: 'rose',
    stats: 'Multicanal integrado',
  },
  {
    icon: FolderOpen,
    title: 'Gestão de Documentos',
    description: 'Armazene apólices, contratos e documentos com organização por cliente. Acesso de qualquer lugar.',
    color: 'orange',
    stats: 'Documentos seguros',
  },
  {
    icon: Store,
    title: 'Marketplace de Seguradoras',
    description: 'Conecte-se diretamente com Porto Seguro, Tokio Marine, Allianz e mais de 12 seguradoras integradas.',
    color: 'cyan',
    stats: '+12 seguradoras',
  },
  {
    icon: BarChart3,
    title: 'Relatórios & Análises',
    description: 'Painéis com produção por categoria, ranking de corretores e tendências. Tome decisões baseadas em dados.',
    color: 'brand',
    stats: 'Decisões com dados',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  brand:   { bg: 'bg-brand-500/10',   border: 'border-brand-500/20',   text: 'text-brand-300',   icon: 'text-brand-400' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-300',    icon: 'text-cyan-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: 'text-emerald-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-300',   icon: 'text-amber-400' },
  green:   { bg: 'bg-green-500/10',   border: 'border-green-500/20',   text: 'text-green-300',   icon: 'text-green-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-300',  icon: 'text-purple-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-300',    icon: 'text-rose-400' },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-300',  icon: 'text-orange-400' },
};

const plans = [
  { name: 'Gratuito', price: 'R$ 0', period: '/mês', features: ['Até 50 clientes', '10 apólices', '1 usuário', 'Suporte por email'], cta: 'Comece Grátis', highlight: false },
  { name: 'Starter', price: 'R$ 99', period: '/mês', features: ['Até 500 clientes', '200 apólices', '3 usuários', 'Automações básicas', 'Suporte prioritário'], cta: 'Começar Agora', highlight: true },
  { name: 'Professional', price: 'R$ 249', period: '/mês', features: ['Clientes ilimitados', 'Apólices ilimitadas', '10 usuários', 'Marketplace completo', 'API própria', 'SLA garantido'], cta: 'Começar Agora', highlight: false },
];

export default function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setVisible(prev => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.15 }
    );
    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={onLogin}
      />

      {/* ── NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#030712]/90 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-400" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Proposta<span className="text-brand-400">One</span>
            </span>
          </div>
          <button
            onClick={onLogin}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white/80 border border-white/[0.12] hover:border-white/25 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
          >
            Login
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">

        {/* ─── VIDEO LAYER ──────────────────────────────────────────────────
            LINE A → opacity-70  = brilho do vídeo (0=escuro / 100=puro)
            LINE B → gradiente vertical (topo e rodapé)
            LINE C → gradiente lateral esquerdo (legibilidade do texto)
        ──────────────────────────────────────────────────────────────────── */}
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-70"
            src="/CorretoraOne_fundo.mp4"
          />
          {/* LINE B — vertical fade: topo e rodapé */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/70 via-transparent to-[#030712]" />
          {/* LINE C — lateral: escurece a esquerda para o texto respirar */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/30 via-[#030712]/25 to-transparent" />
        </div>


        {/* Thin accent line — top left */}
        <div className="absolute top-0 left-0 w-[1px] h-40 bg-gradient-to-b from-transparent via-brand-500/50 to-transparent" />

        {/* ── CONTENT ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-7">
            <div className="h-px w-8 bg-brand-500/60" />
            <span className="text-[11px] tracking-[0.28em] text-white/80 uppercase font-medium">
              +1 &nbsp;·&nbsp; Plataforma do Grupo MultiOne
            </span>
          </div>

          {/* Headline — contraste peso fino × ultra-bold */}
          <div className="mb-7 leading-none">
             <p className="text-[clamp(52px,9vw,60px)] font-black text-white tracking-tight leading-[0.9] -mt-1">
              Proposta<span className="text-brand-400">One</span>
            </p>
            <p className="text-[clamp(52px,9vw,120px)] font-extralight text-white/75 tracking-tight leading-none">
              Feito para
            </p>
            <p className="text-[clamp(52px,9vw,120px)] font-black text-white tracking-tight leading-[0.9] -mt-1">
              EMPRESAS.
            </p>
          </div>

          {/* Brand divider */}
          <div className="flex items-center gap-3 mb-7">
            <div className="h-[3px] w-12 bg-brand-500 rounded-full" />
            <div className="h-[1px] w-6 bg-brand-500/30 rounded-full" />
          </div>

          {/* Bottom row: subtext + stats + CTAs */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">

            {/* Left: subtext */}
            <div className="max-w-lg">
            
              <p className="text-xl sm:text-3xl font-semibold text-white leading-snug">
                Atendemos Corretoras.
              </p>
                <p className="text-xl sm:text-3xl font-light text-white/55 leading-snug mb-1">
                Que Atendem Seus Clientes.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base transition-all duration-200 shadow-[0_0_32px_rgba(37,99,235,0.45)] hover:shadow-[0_0_48px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Comece Grátis
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={onLogin}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.14] text-white/55 hover:text-white hover:border-white/30 font-medium text-base transition-all duration-200"
                >
                  Já tenho conta
                </button>
              </div>
            </div>

            {/* Right: stats vertical stack */}
            <div className="flex lg:flex-col gap-6 lg:gap-4 lg:items-end">
              {[
                { n: '+12', label: 'seguradoras integradas' },
                { n: '100%', label: 'foco em corretoras' },
                { n: '24/7', label: 'disponibilidade' },
              ].map(({ n, label }, i) => (
                <div key={label} className="flex lg:flex-row-reverse items-center gap-3">
                  <span className="text-2xl font-black text-brand-400 tabular-nums">{n}</span>
                  <span className="text-xs text-white/35 leading-tight">{label}</span>
                  {i < 2 && <div className="hidden lg:block w-px h-4 bg-white/10 ml-1" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25 animate-bounce">
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── PITCH ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/20 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Tudo o que sua corretora precisa,<br />
            <span className="text-brand-400">em um só lugar.</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Chega de planilhas, sistemas fragmentados e pós-its. A PropostaOne reúne CRM, apólices, financeiro, comunicação e automações numa plataforma criada do zero para o mercado de seguros brasileiro.
          </p>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { n: '+12', label: 'Seguradoras integradas' },
              { n: '100%', label: 'Focada em corretoras' },
              { n: '0 h', label: 'Para configurar' },
              { n: '24/7', label: 'Disponibilidade' },
            ].map(({ n, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-3xl font-black text-brand-400">{n}</span>
                <span className="text-xs text-white/50 text-center leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Funcionalidades</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Feito para empresas.<br />Do jeito que precisa ser.</h2>
            <p className="text-white/50 max-w-xl mx-auto">Cada módulo foi pensado para a realidade do dia a dia de uma corretora de seguro no Brasil.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const c = colorMap[f.color] ?? colorMap['brand'];
              const Icon = f.icon;
              const isVisible = visible.has(i);
              return (
                <div
                  key={f.title}
                  data-idx={i}
                  ref={el => { cardRefs.current[i] = el; }}
                  className={`group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05] transition-all duration-500 cursor-default ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${(i % 3) * 60}ms` }}
                >
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${c.bg} border ${c.border} mb-4`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
                  <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${c.text}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {f.stats}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY CORRETORAONE ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/30 via-transparent to-brand-950/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Por que a PropostaOne?</p>
              <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
                Construída para quem<br />vive de seguros.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Sistemas genéricos de CRM não entenderam o mercado de seguros. Aqui, cada campo, cada fluxo, cada relatório foi desenhado pensando em você, corretor.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Building2, text: 'Multi-corretora com isolamento total de dados' },
                  { icon: Lock,      text: 'Dados seguros com criptografia e backup automático' },
                  { icon: Globe,     text: 'Acesso de qualquer dispositivo, em qualquer lugar' },
                  { icon: TrendingUp, text: 'Escala com sua corretora — do free ao enterprise' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-400" />
                    </div>
                    <span className="text-white/70 text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-brand-600/5 rounded-3xl blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                {[
                  { label: 'Renovações em dia', value: '98%', color: 'emerald' },
                  { label: 'Comissões rastreadas', value: '100%', color: 'brand' },
                  { label: 'Tempo médio setup', value: '< 1h', color: 'amber' },
                  { label: 'Suporte em português', value: 'Sempre', color: 'cyan' },
                ].map(({ label, value, color }) => {
                  const c = colorMap[color] ?? colorMap['brand'];
                  return (
                    <div key={label} className={`p-6 rounded-2xl ${c.bg} border ${c.border}`}>
                      <div className={`text-3xl font-black ${c.text} mb-1`}>{value}</div>
                      <div className="text-sm text-white/50">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Planos</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Simples assim.</h2>
            <p className="text-white/50">Comece grátis e escale conforme sua corretora cresce.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-7 border transition-all duration-200 ${
                  plan.highlight
                    ? 'bg-brand-600/10 border-brand-500/40 shadow-[0_0_40px_rgba(37,99,235,0.2)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-600 text-white text-xs font-bold tracking-wide">
                    Mais popular
                  </div>
                )}
                <div className="mb-5">
                  <div className="text-sm font-semibold text-white/60 mb-1">{plan.name}</div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-white/40 mb-1">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                      : 'bg-white/[0.07] hover:bg-white/[0.12] text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            Sua corretora merece<br />
            <span className="text-brand-400">o melhor.</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">
            Junte-se às corretoras que escolheram ser <strong className="text-white font-bold">One</strong>.
          </p>
          <button
            onClick={onRegister}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xl transition-all duration-200 shadow-[0_0_50px_rgba(37,99,235,0.4)] hover:shadow-[0_0_70px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Comece Grátis Agora
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-sm text-white/30">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center">
              <Shield className="w-3 h-3 text-brand-400" />
            </div>
            <span className="text-sm font-bold">Proposta<span className="text-brand-400">One</span></span>
          </div>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} PropostaOne. Plataforma exclusiva para corretoras de seguro.
          </p>
          <button
            onClick={onLogin}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Área de acesso
          </button>
        </div>
      </footer>
    </div>
  );
}
