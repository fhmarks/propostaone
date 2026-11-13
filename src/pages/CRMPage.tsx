import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Filter, Users, Building2, UserPlus,
  Phone, Mail, MapPin, Tag, MoreVertical, Edit3,
  Trash2, X, ChevronDown, Loader2, Star, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Client, Lead } from '../types';

type Tab = 'clients' | 'leads' | 'companies';

const statusBadge = (s: string) => {
  const map: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', prospect: 'badge-blue', new: 'badge-blue', contacted: 'badge-amber', qualified: 'badge-cyan', unqualified: 'badge-red', converted: 'badge-green' };
  const labels: Record<string, string> = { active: 'Ativo', inactive: 'Inativo', prospect: 'Prospecto', new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado', unqualified: 'Não qualificado', converted: 'Convertido' };
  return <span className={map[s] ?? 'badge-gray'}>{labels[s] ?? s}</span>;
};

const avatarInitials = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
const avatarColor = (name: string) => {
  const colors = ['bg-brand-600/30 text-brand-300', 'bg-emerald-600/30 text-emerald-300', 'bg-amber-600/30 text-amber-300', 'bg-cyan-600/30 text-cyan-300', 'bg-violet-600/30 text-violet-300'];
  return colors[name.charCodeAt(0) % colors.length];
};

interface ClientFormProps {
  client?: Client;
  onClose: () => void;
  onSaved: () => void;
}

function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const [form, setForm] = useState({
    full_name: client?.full_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    cpf_cnpj: client?.cpf_cnpj ?? '',
    city: client?.city ?? '',
    state: client?.state ?? '',
    status: client?.status ?? 'active',
    type: client?.type ?? 'individual',
    origin: client?.origin ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.full_name.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true);
    const { error: err } = client
      ? await supabase.from('propostaone_clients').update(form).eq('id', client.id)
      : await supabase.from('propostaone_clients').insert(form);
    if (err) setError(err.message);
    else { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Nome Completo *</label>
              <input className="input-glass" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="João da Silva" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">CPF / CNPJ</label>
              <input className="input-glass" value={form.cpf_cnpj} onChange={e => setForm(p => ({ ...p, cpf_cnpj: e.target.value }))} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Tipo</label>
              <select className="input-glass" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'individual' | 'company' }))}>
                <option value="individual">Pessoa Física</option>
                <option value="company">Pessoa Jurídica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Email</label>
              <input type="email" className="input-glass" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Telefone</label>
              <input className="input-glass" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Cidade</label>
              <input className="input-glass" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="São Paulo" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Estado</label>
              <select className="input-glass" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                <option value="">Selecione</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Status</label>
              <select className="input-glass" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Client['status'] }))}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="prospect">Prospecto</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Origem</label>
              <input className="input-glass" value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} placeholder="Indicação, redes sociais, site..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-glass flex-1 justify-center">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | undefined>();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (tab === 'clients') {
      let q = supabase.from('propostaone_clients').select('*').order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) q = q.ilike('full_name', `%${search}%`);
      const { data } = await q;
      setClients((data ?? []) as Client[]);
    } else if (tab === 'leads') {
      let q = supabase.from('propostaone_leads').select('*').order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) q = q.ilike('full_name', `%${search}%`);
      const { data } = await q;
      setLeads((data ?? []) as Lead[]);
    }
    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [tab, search]);

  async function deleteClient(id: string) {
    if (!confirm('Excluir este cliente?')) return;
    await supabase.from('propostaone_clients').delete().eq('id', id);
    fetchData();
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Gestão de clientes, leads e empresas</p>
        </div>
        <button onClick={() => { setEditClient(undefined); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo {tab === 'clients' ? 'Cliente' : tab === 'leads' ? 'Lead' : 'Empresa'}
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        {([['clients','Clientes', Users],['leads','Leads', UserPlus],['companies','Empresas', Building2]] as [Tab,string,React.ComponentType<{className?:string}>][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${tab === id ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input-glass pl-9"
            placeholder={`Buscar ${tab === 'clients' ? 'clientes' : tab === 'leads' ? 'leads' : 'empresas'}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-glass">
          <Filter className="w-4 h-4" />
          Filtrar
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        ) : tab === 'clients' ? (
          clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50 font-medium">Nenhum cliente encontrado</div>
              <div className="text-white/30 text-sm mt-1">Adicione seu primeiro cliente para começar</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(c.full_name)}`}>
                          {avatarInitials(c.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-white/90 text-sm">{c.full_name}</div>
                          {c.cpf_cnpj && <div className="text-xs text-white/40">{c.cpf_cnpj}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {c.email && <div className="text-xs text-white/60 flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</div>}
                        {c.phone && <div className="text-xs text-white/60 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>}
                      </div>
                    </td>
                    <td>
                      {c.city && (
                        <div className="text-xs text-white/60 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{c.city}{c.state ? `, ${c.state}` : ''}
                        </div>
                      )}
                    </td>
                    <td>{statusBadge(c.status)}</td>
                    <td>
                      <div className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditClient(c); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteClient(c.id)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tab === 'leads' ? (
          leads.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50 font-medium">Nenhum lead encontrado</div>
              <div className="text-white/30 text-sm mt-1">Adicione leads para acompanhar sua prospecção</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contato</th>
                  <th>Interesse</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Criado</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(l.full_name)}`}>
                          {avatarInitials(l.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-white/90 text-sm">{l.full_name}</div>
                          {l.company && <div className="text-xs text-white/40">{l.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {l.email && <div className="text-xs text-white/60 flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</div>}
                        {l.phone && <div className="text-xs text-white/60 flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</div>}
                      </div>
                    </td>
                    <td><div className="text-xs text-white/60">{l.interest ?? '-'}</div></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-sm text-white/80">{l.score ?? 0}</span>
                      </div>
                    </td>
                    <td>{statusBadge(l.status)}</td>
                    <td><div className="text-xs text-white/40">{new Date(l.created_at).toLocaleDateString('pt-BR')}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <div className="text-white/50 font-medium">Nenhuma empresa cadastrada</div>
            <div className="text-white/30 text-sm mt-1">Cadastre empresas para organizar seus clientes B2B</div>
          </div>
        )}

        {/* Pagination */}
        {((tab === 'clients' && clients.length === PAGE_SIZE) || (tab === 'leads' && leads.length === PAGE_SIZE) || page > 0) && (
          <div className="border-t border-white/[0.05] px-4 py-3 flex justify-between items-center">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-glass text-xs disabled:opacity-30">Anterior</button>
            <span className="text-xs text-white/40">Página {page + 1}</span>
            <button disabled={(tab === 'clients' ? clients.length : leads.length) < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="btn-glass text-xs disabled:opacity-30">Próxima</button>
          </div>
        )}
      </div>

      {showForm && (
        <ClientForm
          client={editClient}
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
