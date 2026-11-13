import React, { useState } from 'react';
import { Shield, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    tenantName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { error: err } = await signUp(form.email, form.password, form.name, form.tenantName);
    if (err) {
      setError(err.message === 'User already registered'
        ? 'Este email já está cadastrado. Faça login.'
        : 'Erro ao criar conta. Tente novamente.');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-app-bg">
        <div className="relative w-full max-w-md text-center animate-slide-up">
          <div className="glass-panel p-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/25 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Conta criada!</h2>
            <p className="text-white/50 text-sm mb-6">
              Verifique seu email para confirmar a conta e depois faça login para acessar o sistema.
            </p>
            <button onClick={onSwitchToLogin} className="btn-primary w-full justify-center">
              Ir para o Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-app-bg">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/25 shadow-glass-glow mb-4">
            <Shield className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Corretora<span className="text-gradient">One</span>
          </h1>
          <p className="text-white/50 mt-1 text-sm">Crie sua conta e comece grátis</p>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Nova conta</h2>
          <p className="text-white/50 text-sm mb-6">Preencha os dados da sua corretora</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">Nome da Corretora</label>
              <input
                type="text"
                value={form.tenantName}
                onChange={e => update('tenantName', e.target.value)}
                placeholder="Ex: Corretora Silva & Associados"
                className="input-glass"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">Seu Nome Completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="João da Silva"
                className="input-glass"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="seu@email.com.br"
                className="input-glass"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/60 mb-1.5 font-medium">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="••••••••"
                    className="input-glass pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5 font-medium">Confirmar</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className="input-glass"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <button onClick={onSwitchToLogin} className="text-white/50 hover:text-white/80 text-sm transition-colors flex items-center gap-1.5 mx-auto">
              <ArrowLeft className="w-3.5 h-3.5" />
              Já tenho conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
