# Versão Expo Snack (sem instalar nada)

Este `App.js` é uma versão **single-file** do app, feita para rodar no
[Expo Snack](https://snack.expo.dev) — que funciona 100% no navegador e, no
celular, precisa apenas do app **Expo Go**. Nenhuma instalação no PC.

## Passo a passo

1. No celular, instale o **Expo Go** (Play Store / App Store).
2. No computador, abra **https://snack.expo.dev**.
3. Apague o conteúdo do arquivo `App.js` do Snack e **cole todo o conteúdo**
   deste `snack/App.js`.
4. O Snack instala sozinho as dependências (`@supabase/supabase-js`,
   `@react-native-async-storage/async-storage`) ao detectar os imports.
5. Clique na aba **"My Device"** → um QR Code aparece. Escaneie com o
   **Expo Go**. O app abre no seu celular.

## Login

O app já está conectado ao seu Supabase. A conta de login (e-mail e senha
inicial) foi entregue separadamente, fora do código, por segurança. Troque a
senha após o primeiro acesso.

As categorias e os cartões/contas da sua planilha já estão cadastrados, então
você pode lançar entradas e saídas imediatamente com os menus prontos.

## Observação sobre o histórico

Os 2.073 lançamentos históricos da planilha **não** foram carregados por aqui
(o ambiente na nuvem não conseguiu enviar esse volume ao banco). Eles são
importados automaticamente pelo **app completo** (pasta raiz do projeto) na
primeira execução, pelo botão *Importar*. Depois disso, todo o histórico
aparece também neste app do Snack, pois ambos usam o mesmo Supabase.

## Diferença para o app completo

- **App completo** (raiz do repo): Expo Router, telas separadas, importação
  automática da planilha, relatórios detalhados. Ideal para build final nas
  lojas (EAS).
- **Este Snack**: versão enxuta (Resumo + Lançamentos) num único arquivo, para
  rodar sem instalar nada. Mesmo banco, mesmos dados.
