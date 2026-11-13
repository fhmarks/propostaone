# PropostaOne

Site e plataforma do PropostaOne. Base vinda do projeto CorretoraOne (Bolt), em adaptação.

## Stack

- React 18 + TypeScript + Vite + Tailwind (ícones: lucide-react)
- Supabase (banco **compartilhado com o Garantia de Receita**)
- Hospedagem: Cloudflare Pages

## Banco de dados

O banco é o mesmo do Garantia de Receita, então **tudo do PropostaOne usa o prefixo `propostaone_`**:

- tabelas: `propostaone_tenants`, `propostaone_profiles`, `propostaone_clients`…
- funções: `propostaone_get_tenant_id()`, `propostaone_is_super_admin()`…
- índices: `idx_propostaone_…`
- storage: bucket `propostaone-documents` (privado, pasta por tenant)
- edge functions: `propostaone-register`, `propostaone-provisional-register`, `propostaone-cnpj-lookup`

Schema completo: `supabase/migrations/20261113000000_propostaone_init.sql`.

Ao criar tabela nova, use sempre o prefixo, e no front use `supabase.from('propostaone_…')`.

> O login (auth.users) também é compartilhado: um usuário do Garantia de Receita
> consegue autenticar, mas só entra na plataforma se tiver registro em `propostaone_profiles`.

## Rodar local

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## Deploy — Cloudflare Pages

| Configuração        | Valor            |
|---------------------|------------------|
| Framework preset    | Vite (ou None)   |
| Build command       | `npm run build`  |
| Output directory    | `dist`           |
| Node version        | 20 (`.nvmrc`)    |

Variáveis de ambiente (Settings → Environment variables), em Production e Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O arquivo `public/_redirects` faz o fallback de SPA (`/* → /index.html`).
