# Controle Financeiro 📱💰

App **Android + iOS** (Expo / React Native) para controle de **contas e cartões**,
construído a partir da sua planilha `01_Contas.xlsx`.

Backend em **Supabase** (autenticação + banco Postgres com Row Level Security),
então seus dados sincronizam entre celular, tablet e web.

## Funcionalidades

- **Login / cadastro** por e-mail e senha (Supabase Auth).
- **Resumo** por competência: saldo do mês, entradas, saídas, gasto por cartão/conta e maiores categorias.
- **Lançamentos**: lista com busca, filtro por competência, criar/editar/excluir.
- **Relatórios**: evolução mensal (entradas x saídas) e gasto por categoria com percentuais.
- **Cartões e Contas**: cadastro com tipo (cartão/conta/dinheiro) e dia de vencimento; total gasto no mês.
- **Importação inicial**: na primeira vez, importa os 2.073 lançamentos da planilha automaticamente.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 18+ e o app **Expo Go** no celular
(Play Store / App Store).

```bash
npm install
npm start
```

Escaneie o QR Code que aparece no terminal com o app **Expo Go** (Android) ou
com a **câmera** (iOS). O app abre no seu celular — sem precisar de Mac ou Xcode.

Para builds nas lojas, use [EAS Build](https://docs.expo.dev/build/introduction/):
`npx eas build -p android` / `-p ios`.

## Configuração do Supabase

As credenciais públicas já estão em `app.json` (`extra.supabaseUrl` / `supabaseAnonKey`).
O schema fica em `supabase/migrations/`.

Tudo vive num schema dedicado **`financeiro`** (fora do `public`), exposto na API
do PostgREST. O cliente Supabase já aponta para ele via `db: { schema: 'financeiro' }`.
Tabelas (todas com RLS por usuário):

- `financeiro.lancamentos` — lançamentos (descrição, valor, tipo, categoria, forma de pagamento, competência, parcelas…).
- `financeiro.formas_pagamento` — cartões / contas / dinheiro, com dia de vencimento.
- `financeiro.categorias` — categorias.

> Autenticação por e-mail: se a confirmação de e-mail estiver ativada no seu projeto
> Supabase, confirme o link enviado antes do primeiro login. Para testes, é possível
> desativar em *Authentication → Providers → Email → Confirm email*.

## Estrutura

```
app/                 telas (Expo Router)
  login.tsx
  (tabs)/            Resumo, Lançamentos, Relatórios, Cartões
  lancamento/[id].tsx  criar/editar lançamento
lib/                 supabase, auth, api (queries), tema, formatação, seed.json
components/          componentes reutilizáveis
supabase/migrations/ schema SQL
```
