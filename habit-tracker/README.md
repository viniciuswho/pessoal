# Habit Tracker do casal 🔥

Site de hábitos do casal (Laura vs Vinícius) hospedado na **Vercel**, com dados num **Upstash Redis** compartilhado e um **bot do Telegram** para marcar hábitos do dia com um toque. Site e Telegram leem/escrevem o mesmo banco — sempre sincronizados.

## Como funciona

- `public/index.html` — o painel (HTML/CSS/JS puro). Lê de `GET /api/data` e marca via `POST /api/toggle`.
- `api/data.js` — devolve todos os dados.
- `api/toggle.js` — alterna um hábito de uma pessoa numa data.
- `api/telegram.js` — webhook do Telegram (botões `/hoje`).
- `api/_store.js` — acesso ao Redis (1 chave `habitos:data`).
- `api/_config.js` — lista de hábitos, "hoje" no fuso de SP e mapa Telegram→pessoa.

## Setup (uma vez)

### 1. Criar o bot no Telegram
1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome e @usuário.
2. Guarde o **token** (algo como `8123456789:AAExxxxxxxx`). Esse é o `TELEGRAM_BOT_TOKEN`.

### 2. Descobrir os IDs do Telegram
1. Você e a Laura falam com **@userinfobot** (ou **@RawDataBot**).
2. Ele responde o `Id` numérico de cada um. São o `TELEGRAM_VINI_ID` e o `TELEGRAM_LAURA_ID`.

### 3. Criar o banco (Upstash Redis na Vercel)
1. No projeto da Vercel → aba **Storage** → **Create Database** → **Upstash for Redis** (grátis).
2. Conecte ao projeto. A Vercel injeta sozinha as variáveis (`KV_REST_API_URL` / `KV_REST_API_TOKEN` ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).

### 4. Variáveis de ambiente (Vercel → Settings → Environment Variables)
| Variável | Valor |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token do BotFather |
| `TELEGRAM_VINI_ID` | ID numérico do Vinícius |
| `TELEGRAM_LAURA_ID` | ID numérico da Laura |
| `TELEGRAM_WEBHOOK_SECRET` | uma string aleatória (ex.: gere com `openssl rand -hex 16`) |

> As variáveis do Redis entram automaticamente no passo 3.

### 5. Deploy (GitHub + Vercel)
1. Suba este repositório no GitHub.
2. Na Vercel → **Add New Project** → importe o repositório → **Deploy**.
3. Anote a URL final, ex.: `https://habit-tracker-xyz.vercel.app`.

### 6. Registrar o webhook do Telegram
Depois do deploy, rode uma vez (troque `<TOKEN>`, `<URL>` e `<SECRET>`):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>/api/telegram&secret_token=<SECRET>"
```

Resposta esperada: `{"ok":true,"result":true,"description":"Webhook was set"}`.

## Uso

- **Site:** abra a URL. Aba Laura/Vinícius → clique nas células para marcar. Aba Competição → placar e gráficos.
- **Telegram:** mande **/hoje** pro bot → toque nos hábitos para marcar ✅. Aparece na hora no site.

## Rodar localmente

```bash
npm install
npx vercel dev
```

Precisa das variáveis de ambiente locais (Redis + Telegram). Rode `npx vercel link` e `npx vercel env pull .env` para puxar as da Vercel.

## Configuração do desafio

Datas e hábitos ficam no topo de `public/index.html` (`START`, `END`, `HABITS`) e em `api/_config.js`. **Os `id` dos hábitos precisam ser idênticos nos dois arquivos.**
