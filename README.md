# Huga Buga Hotel · Frontend

Site do Huga Buga Hotel (reserva de cavernas, experiências, O Banquete, área do hóspede e painel da equipe), feito a partir do design do Figma e consumindo a API do `Backend-Huga-Buga` (`/api/v1`).

**Stack:** React 19 · Vite · TypeScript · React Router 7 · TanStack Query 5 · i18next (PT, EN, ES) · Vitest + Testing Library.

## Como rodar

Pré-requisitos: Node 20.19+ (ou 22+) e o backend rodando em `http://localhost:8080` (veja o README do `Backend-Huga-Buga`).

```bash
npm install
cp .env.example .env      # ajuste VITE_API_URL se a API estiver em outro endereço
npm run dev               # http://localhost:5173
```

O backend já libera o CORS de `http://localhost:5173` por padrão (`CORS_ORIGENS`).

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run typecheck` | Só a checagem de tipos |
| `npm test` | Testes (Vitest), uma vez |
| `npm run test:watch` | Testes em modo observação |

### Contas de teste (carga `V2__dados_iniciais.sql` do backend)

| Papel | E-mail / senha |
| --- | --- |
| Visitante | `marina.souza@example.com` / `Uga!Buga2026` |
| Admin | `admin@hugabuga.example` / `Admin!Buga2026` |

## Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080/api/v1` | URL base da API, **com** o `/api/v1` |

Variáveis `VITE_*` entram no bundle na hora do build: para produção, gere o build já com a URL certa.

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | Home (busca, cavernas, aventuras, Banquete, relatos) |
| `/cavernas` | Lista com filtros, ordenação, aviso de feriado e "lotado" |
| `/cavernas/:slug` | Detalhe, calendário com preço por dia e cotação |
| `/experiencias` | Atividades por categoria e agenda da tribo |
| `/banquete` | Cardápio e reserva de mesa (hóspede ou visitante) |
| `/a-tribo` | Sobre, perguntas frequentes, regras e contato |
| `/buscar-reserva` | Encontrar reserva feita sem conta (código + e-mail) |
| `/reserva/:codigo/quem-vem` → `/extras` → `/pagamento` | Checkout em 3 pegadas, com a "fogueira" de 15 min |
| `/reserva/:codigo` | Voucher (QR, PDF, .ics, check-in online) |
| `/entrar`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha` | Conta |
| `/minhas-reservas` | Próximas, passadas e canceladas; cancelar, alterar datas, avaliar |
| `/perfil`, `/perfil/:secao` | Dados, membros da tribo, favoritas, notificações, idioma, senha |
| `/admin/*` | Painel da equipe (só `ADMIN`) |

## Como as coisas funcionam

- **Dinheiro** chega e sai da API sempre em centavos; `lib/format.ts` (`brl`) formata.
- **Regras de negócio** (idades, adultos extras, Pix −5%, parcelas, prazos) estão espelhadas em `lib/regras.ts` só para dar retorno imediato na tela. Quem decide o valor é sempre a API (o front manda `precoEsperadoCentavos` e trata o `409 PRECO_ALTERADO`).
- **Sessão:** access token + refresh token. Com "lembrar de mim" ficam no `localStorage`; sem, no `sessionStorage`. Um 401 dispara um único refresh compartilhado; se falhar, a sessão é limpa e aparece o modal "A fogueira apagou".
- **Reserva sem conta:** o e-mail do responsável é guardado por código (`hb.reservas.email`) e enviado no header `X-Responsavel-Email`.
- **Erros** da API viram `ApiError` (`codigo`, `campos`, `ref`); falha de rede vira o estado "o mamute tropeçou no cabo".
- **Idioma:** PT, EN e ES completos (`src/i18n`). A escolha fica no navegador e, logado, é sincronizada com `/me/preferencias`. Um teste garante que EN e ES têm as mesmas chaves e variáveis do PT.
- **Chat do Bugão:** texto (`/chat`) e áudio gravado no navegador (`/chat/audio`). O microfone exige HTTPS (ou `localhost`).
- **Imagens:** os espaços de foto são placeholders iguais aos do Figma (`ImageSlot`, com as máscaras "lascadas"). Quando houver fotos reais, basta passar `src`.

## Estrutura

```
src/
  api/          cliente HTTP, endpoints e tipos dos DTOs
  components/   ui (botões, campos, modais, estados), layout (nav, tab bar, rodapé),
                busca, cavernas, reserva (passos, fogueira, resumo), chat
  context/      autenticação e busca da tribo
  hooks/        idioma, contagem regressiva, favoritos, media query…
  i18n/         pt.ts (fonte), en.ts, es.ts
  lib/          formatação e regras
  pages/        uma pasta por área
  styles/       tokens do design (cores, cantos lascados, sombras) e estilos
```

## Testes

`npm test` roda 42 testes em: regras de negócio, formatação, busca pela URL, cliente da API (erros, header do responsável, refresh do token), paridade das traduções e o componente `Counter`.

## Pendências conhecidas

- **Entrar com Google/Apple:** os botões estão no layout do Figma, mas ainda mostram "em breve" até o backend ter os endpoints.
- **Ícones:** a fonte `material-symbols` completa tem ~5 MB. Antes de publicar, vale gerar um subconjunto só com os ícones usados (ou trocar por SVGs).
- Removidos do escopo, conforme combinado: ossos (pontos), tour 360° e cartões salvos.

## Publicação (CloudFront + S3)

Por enquanto o projeto roda só local. Quando for para a AWS:

1. `VITE_API_URL=https://<api>/api/v1 npm run build`
2. Envie o `dist/` para um bucket S3 privado, com o CloudFront na frente (Origin Access Control).
3. Como é uma SPA, configure no CloudFront respostas de erro **403 e 404 → `/index.html` com status 200**, para que links como `/cavernas/toca-do-mamute` funcionem ao recarregar.
4. Cache: `index.html` com `Cache-Control: no-cache`; `assets/*` (nomes com hash) com `max-age=31536000, immutable`.
5. Adicione o domínio do CloudFront em `CORS_ORIGENS` no backend.
