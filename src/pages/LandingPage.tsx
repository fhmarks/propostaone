import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ChevronDown,
  Mail, MessageCircle, FileDown, Eye, Tags, LayoutTemplate,
  Palette, Users, User, Kanban, Zap, Contact, BarChart3,
  Briefcase, ShoppingBag, FileCheck2, CheckCircle2,
  Building2, TrendingUp, Lock, Globe,
} from 'lucide-react';
import RegisterModal from '../components/RegisterModal';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const features = [
  {
    icon: Mail,
    title: 'Envio por E-mail',
    description: 'Envie a proposta direto da plataforma, com link exclusivo para o cliente visualizar, baixar e responder sem precisar de anexo.',
    color: 'brand',
    stats: 'Link exclusivo e rastreável',
  },
  {
    icon: MessageCircle,
    title: 'Envio pelo WhatsApp',
    description: 'Mande a proposta no WhatsApp do cliente em um clique. Ele abre no celular, lê com calma e aceita na hora.',
    color: 'emerald',
    stats: 'Direto no celular do cliente',
  },
  {
    icon: FileDown,
    title: 'Proposta em PDF',
    description: 'Gere um PDF profissional com a sua marca para baixar, imprimir, anexar ou levar à reunião. Sempre com o layout impecável.',
    color: 'rose',
    stats: 'PDF com a sua marca',
  },
  {
    icon: Eye,
    title: 'Leitura e Aceite',
    description: 'Saiba quando o cliente abriu a proposta, quantas vezes voltou nela e quando aceitou ou recusou. Aceite online, sem papel.',
    color: 'cyan',
    stats: 'Aberta, lida e aceita',
  },
  {
    icon: Tags,
    title: 'Organização de Preços',
    description: 'Catálogo de produtos e serviços com tabelas de preço, descontos, condições de pagamento e validade. Todo mundo vendendo com o preço certo.',
    color: 'green',
    stats: 'Preços sempre atualizados',
  },
  {
    icon: LayoutTemplate,
    title: 'Modelos de Proposta',
    description: 'Crie modelos diferentes por produto, segmento ou tipo de cliente. Escolha o modelo, ajuste os itens e a proposta fica pronta em minutos.',
    color: 'amber',
    stats: 'Proposta pronta em minutos',
  },
  {
    icon: Palette,
    title: 'Padrões de Cores',
    description: 'Defina a identidade visual de cada modelo: cores, logotipo, capa e estilo. Uma marca, várias linhas de produto, cada uma com o seu visual.',
    color: 'purple',
    stats: 'Sua marca em cada proposta',
  },
  {
    icon: Users,
    title: 'Trabalho em Equipe',
    description: 'Vendedores, gestores e permissões por usuário. Acompanhe a produção do time e aprove descontos antes de a proposta sair.',
    color: 'brand',
    stats: 'Individual ou em equipe',
  },
  {
    icon: Kanban,
    title: 'Funil de Propostas',
    description: 'Veja cada proposta na etapa certa: rascunho, enviada, visualizada, em negociação, aceita ou recusada. Nenhuma venda esquecida.',
    color: 'cyan',
    stats: 'Todas as etapas à vista',
  },
  {
    icon: Zap,
    title: 'Follow-up Automático',
    description: 'Lembretes quando o cliente ainda não abriu, quando a proposta está perto de vencer ou quando é hora de voltar a falar com ele.',
    color: 'orange',
    stats: 'Ninguém fica sem retorno',
  },
  {
    icon: Contact,
    title: 'Clientes PF e PJ',
    description: 'Cadastro de pessoas físicas e empresas, com preenchimento automático por CNPJ e todo o histórico de propostas de cada cliente.',
    color: 'emerald',
    stats: 'Histórico completo',
  },
  {
    icon: BarChart3,
    title: 'Relatórios de Vendas',
    description: 'Taxa de conversão, ticket médio, ranking de vendedores, tempo até o aceite e motivos de recusa. Decida com base em dados.',
    color: 'brand',
    stats: 'Decisões com dados',
  },
];

const audiences = [
  {
    icon: Briefcase,
    title: 'B2B',
    description: 'Venda para outras empresas com propostas detalhadas, várias aprovações e negociações mais longas.',
  },
  {
    icon: ShoppingBag,
    title: 'B2C',
    description: 'Atenda o consumidor final com propostas rápidas, claras e fáceis de aceitar pelo celular.',
  },
  {
    icon: User,
    title: 'Individual',
    description: 'Profissional autônomo ou consultor? Tenha a organização de uma grande empresa trabalhando sozinho.',
  },
  {
    icon: Users,
    title: 'Equipe',
    description: 'Times de vendas com metas, permissões, aprovação de descontos e visão de cada vendedor.',
  },
];

const steps = [
  { n: '01', title: 'Cadastre preços', description: 'Monte seu catálogo de produtos e serviços com valores, descontos e condições.' },
  { n: '02', title: 'Escolha o modelo', description: 'Use um modelo pronto, com as cores e a identidade da sua marca.' },
  { n: '03', title: 'Envie como quiser', description: 'Por e-mail, pelo WhatsApp ou em PDF, direto da plataforma.' },
  { n: '04', title: 'Acompanhe o aceite', description: 'Saiba quando foi aberta, lida e aceita, e faça o follow-up na hora certa.' },
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
  { name: 'Gratuito', price: 'R$ 0', period: '/mês', features: ['1 usuário', 'Até 4 propostas', 'Envio por e-mail, WhatsApp e PDF'], cta: 'Comece Grátis', highlight: false },
  { name: 'Light', price: 'R$ 250', period: '/mês', features: ['Até 5 usuários', 'Propostas ilimitadas', 'Envio por e-mail, WhatsApp e PDF'], cta: 'Começar Agora', highlight: true },
  { name: 'Pro', price: 'R$ 499', period: '/mês', features: ['Até 60 usuários', 'Propostas ilimitadas', 'Criação de equipes', 'Envio por e-mail, WhatsApp e PDF'], cta: 'Começar Agora', highlight: false },
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
              <FileCheck2 className="w-4 h-4 text-brand-400" />
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
            src="https://hietkwvenincumawzfls.supabase.co/storage/v1/object/public/propostaone-public/site/PropostaOne_fundo.mp4"
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
            <p className="text-[clamp(34px,6vw,84px)] font-extralight text-white/75 tracking-tight leading-none mb-1">
              Feito perfeitamente para
            </p>
            <p className="text-[clamp(52px,9vw,120px)] font-black text-white tracking-tight leading-[0.9] -mt-1">
              SUA EMPRESA.
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
                Propostas que vendem.
              </p>
                <p className="text-xl sm:text-3xl font-light text-white/55 leading-snug mb-1">
                Do envio ao aceite, em um só lugar.
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
            <div className="flex flex-wrap lg:flex-nowrap lg:flex-col gap-x-6 gap-y-3 lg:gap-4 lg:items-end">
              {[
                { n: '3', label: 'canais: e-mail, WhatsApp e PDF' },
                { n: 'B2B + B2C', label: 'venda para qualquer negócio' },
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
            Tudo o que sua empresa precisa para vender,<br />
            <span className="text-brand-400">em um só lugar.</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Chega de proposta no Word, tabela de preço desatualizada e PDF perdido no e-mail. A PropostaOne organiza seus produtos e preços, monta propostas profissionais em minutos, envia por e-mail, WhatsApp ou PDF e mostra quando o cliente abriu, leu e aceitou.
          </p>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { n: '3', label: 'Canais de envio: e-mail, WhatsApp e PDF' },
              { n: '100%', label: 'Das propostas rastreadas' },
              { n: 'B2B + B2C', label: 'Para qualquer tipo de venda' },
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

      {/* ── COMO FUNCIONA ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Como funciona</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Da tabela de preços<br />ao aceite do cliente.</h2>
            <p className="text-white/50 max-w-xl mx-auto">Quatro passos para trocar o improviso por um processo de vendas organizado.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(s => (
              <div key={s.n} className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                <div className="text-3xl font-black text-brand-400 mb-3 tabular-nums">{s.n}</div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.description}</p>
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
            <p className="text-white/50 max-w-xl mx-auto">Da criação ao aceite, cada etapa da proposta foi pensada para quem precisa vender mais, com organização.</p>
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

      {/* ── PARA QUEM ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Para quem</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Venda para<br /><span className="text-brand-400">qualquer tipo de negócio.</span></h2>
            <p className="text-white/50 max-w-xl mx-auto">Para empresas que vendem para empresas, para o consumidor final, sozinhas ou em equipe.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {audiences.map(({ icon: Icon, title, description }) => (
              <div key={title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05] transition-all duration-300">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUE PROPOSTAONE ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/30 via-transparent to-brand-950/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-semibold mb-3">Por que a PropostaOne?</p>
              <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
                Construída para quem<br />vive de vender.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Proposta não é só um documento: é o momento da decisão. A PropostaOne dá à sua empresa o controle de cada etapa, do preço certo ao aceite do cliente, sem depender de Word, planilha ou PDF solto.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Building2,  text: 'Para pessoa física e jurídica, no B2B e no B2C' },
                  { icon: Lock,       text: 'Dados seguros com criptografia e backup automático' },
                  { icon: Globe,      text: 'Acesso de qualquer dispositivo, em qualquer lugar' },
                  { icon: TrendingUp, text: 'Cresce com você: do vendedor individual ao time completo' },
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
                  { label: 'Envio por e-mail, WhatsApp e PDF', value: '3 canais', color: 'emerald' },
                  { label: 'Saiba quando foi aberta, lida e aceita', value: 'Tempo real', color: 'brand' },
                  { label: 'Para o cliente aceitar a proposta', value: '1 clique', color: 'amber' },
                  { label: 'Modelos e cores da sua marca', value: 'Sua cara', color: 'cyan' },
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
            <p className="text-white/50">Comece grátis e escale conforme suas vendas crescem.</p>
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

          <p className="mt-10 text-center text-sm text-white/50">
            Mais de 60 usuários? <span className="text-white font-semibold">Fale com a gente sobre um projeto especial</span> para a sua empresa.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            Sua próxima venda<br />
            <span className="text-brand-400">começa aqui.</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">
            Junte-se às empresas que escolheram ser <strong className="text-white font-bold">One</strong>.
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
              <FileCheck2 className="w-3 h-3 text-brand-400" />
            </div>
            <span className="text-sm font-bold">Proposta<span className="text-brand-400">One</span></span>
          </div>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} PropostaOne. Propostas comerciais para empresas que vendem.
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
