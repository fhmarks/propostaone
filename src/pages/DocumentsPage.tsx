import React, { useEffect, useState } from 'react';
import {
  FolderOpen, Upload, File, FileText, Image, FileArchive,
  Plus, Search, Trash2, Download, MoreVertical, Folder, X,
  ChevronRight, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Document } from '../types';

function getFileIcon(mime?: string) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return Image;
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('zip') || mime.includes('rar')) return FileArchive;
  return File;
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { tenant } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    supabase.from('propostaone_documents').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setDocuments((data ?? []) as Document[]); setLoading(false); });
  }, []);

  const filtered = documents.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  const categories = [
    { label: 'Todos', count: documents.length, active: true },
    { label: 'Apólices', count: documents.filter(d => d.policy_id).length },
    { label: 'Clientes', count: documents.filter(d => d.client_id && !d.policy_id).length },
    { label: 'Outros', count: documents.filter(d => !d.client_id && !d.policy_id).length },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">{documents.length} arquivo{documents.length !== 1 ? 's' : ''} armazenados</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="btn-primary cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
            <input
              type="file"
              className="hidden"
              multiple
              onChange={async e => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0 || !tenant) return;
                setUploading(true);
                for (const file of files) {
                  const path = `${tenant.id}/${Date.now()}_${file.name}`;
                  const { error: uploadErr } = await supabase.storage.from('propostaone-documents').upload(path, file);
                  if (!uploadErr) {
                    await supabase.from('propostaone_documents').insert({
                      name: file.name,
                      file_path: path,
                      file_size: file.size,
                      mime_type: file.type,
                    });
                  }
                }
                const { data } = await supabase.from('propostaone_documents').select('*').order('created_at', { ascending: false }).limit(50);
                setDocuments((data ?? []) as Document[]);
                setUploading(false);
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-2">
          <div className="glass-card p-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Categorias</div>
            {categories.map(cat => (
              <button key={cat.label} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${cat.active ? 'bg-brand-600/20 text-brand-300 border border-brand-500/20' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'}`}>
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  {cat.label}
                </span>
                <span className="text-xs text-white/30">{cat.count}</span>
              </button>
            ))}
          </div>

          <div className="glass-card p-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">Armazenamento</div>
            <div className="space-y-2">
              <div className="text-xs text-white/50 text-center">
                {formatSize(documents.reduce((s, d) => s + (d.file_size ?? 0), 0))} usados
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: '8%' }} />
              </div>
              <div className="text-[10px] text-white/30 text-center">de 5 GB disponíveis</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input className="input-glass pl-9" placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="glass-card p-1 flex gap-1">
              {(['grid','list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
                  {v === 'grid' ? 'Grade' : 'Lista'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-white/15 mb-4" />
              <div className="text-white/50 font-medium text-lg">Nenhum documento</div>
              <div className="text-white/30 text-sm mt-1">Faça upload de arquivos para começar</div>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(doc => {
                const Icon = getFileIcon(doc.mime_type);
                return (
                  <div key={doc.id} className="glass-card-hover p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-400" />
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm font-medium text-white/90 line-clamp-2 leading-tight">{doc.name}</div>
                    <div className="text-xs text-white/40 mt-2 flex items-center justify-between">
                      <span>{formatSize(doc.file_size)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tipo</th>
                    <th>Tamanho</th>
                    <th>Upload em</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const Icon = getFileIcon(doc.mime_type);
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-brand-400" />
                            </div>
                            <span className="text-sm text-white/90">{doc.name}</span>
                          </div>
                        </td>
                        <td><div className="text-xs text-white/50">{doc.mime_type ?? 'Desconhecido'}</div></td>
                        <td><div className="text-xs text-white/60">{formatSize(doc.file_size)}</div></td>
                        <td><div className="text-xs text-white/40">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</div></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
