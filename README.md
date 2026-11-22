# Controle Financeiro

App web (PWA) para controle de contas e cartões: resumo do mês, lançamentos, relatórios,
projeções de recorrentes/assinaturas, importação de faturas (CSV, OFX, PDF) e chat com IA.

Publicado pelo GitHub Pages a partir da pasta `web/` (workflow `.github/workflows/pages.yml`).
Backend: Supabase (auth + Postgres no schema `financeiro`, com RLS por usuário).

## Estrutura

```
web/
  index.html            marcação, tema inicial e atualização automática
  css/app.css           estilos
  js/main.js            login, navegação, seletor de mês
  js/estado.js          dados carregados + preferências do navegador
  js/dados.js           todo acesso ao Supabase
  js/operacoes.js       gravações (salvar, excluir, projeções, importação, auto-categorizar)
  js/ui.js              peças de interface compartilhadas
  js/dominio/           regras puras: competência, lançamento, recorrência, agregados, importação, texto
  js/telas/             uma tela por arquivo (resumo, lançamentos, relatórios, projeções, ajustes, …)
supabase/
  migrations/           schema do banco
  functions/            Edge Functions: importar-fatura (lê PDF com IA) e chat-financeiro
```

## Desenvolvimento

Sem build: sirva a pasta `web/` (ex.: `python3 -m http.server -d web`) e abra no navegador.
Todo import/arquivo local leva `?v=__BUILD__`; o deploy troca pelo commit (o workflow falha se faltar).

As Edge Functions precisam do segredo `ANTHROPIC_API_KEY` no projeto Supabase.
