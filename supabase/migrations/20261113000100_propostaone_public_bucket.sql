/*
# PropostaOne — bucket público de arquivos do site

Arquivos estáticos do site (vídeo de fundo, imagens) servidos pelo Supabase Storage,
que entrega em partes (HTTP 206), exigência do Safari/iPhone para tocar vídeo.
O Cloudflare Workers Static Assets responde sempre 200 (arquivo inteiro).

Arquivo atual: site/PropostaOne_fundo.mp4 (cópia em media/PropostaOne_fundo.mp4).
Upload: pelo painel do Supabase (Storage → propostaone-public) ou com a service_role.
Não há política de INSERT para anon/authenticated: só leitura pública.
*/
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('propostaone-public', 'propostaone-public', true, 52428800,
        ARRAY['video/mp4','video/webm','image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;
