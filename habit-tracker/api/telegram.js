import { getData, toggleHabit } from './_store.js';
import {
  HABITS,
  todaySP,
  personFromTelegramId,
  START,
  addDays,
  maxEditableDate,
} from './_config.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

// Chamada genérica à API do Telegram.
async function tg(method, payload) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const ddmm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

// Monta o teclado: um botão por hábito (✅ se feito) + linha de navegação de datas.
function buildKeyboard(personData, iso) {
  const rows = HABITS.map((h) => {
    const done = !!personData[`${h.id}__${iso}`];
    return [
      {
        text: `${done ? '✅' : '⬜️'} ${h.name}`,
        callback_data: `t|${h.id}|${iso}`,
      },
    ];
  });

  // Linha de navegação: ◀️ dia anterior · (data) · próximo dia ▶️
  const max = maxEditableDate();
  const nav = [];
  if (iso > START) nav.push({ text: '◀️', callback_data: `d|${addDays(iso, -1)}` });
  nav.push({ text: `📅 ${ddmm(iso)}`, callback_data: 'noop' });
  if (iso < max) nav.push({ text: '▶️', callback_data: `d|${addDays(iso, 1)}` });
  rows.push(nav);

  return { inline_keyboard: rows };
}

function headerText(person, iso) {
  const nome = person === 'vini' ? 'Vinícius' : 'Laura';
  const hoje = iso === todaySP() ? ' (hoje)' : '';
  return `📅 *${ddmm(iso)}*${hoje} — hábitos de ${nome}\nToque pra marcar ✅/⬜️ · use ◀️ ▶️ pra mudar o dia`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'método não permitido' });
    return;
  }

  // Valida o segredo configurado no setWebhook.
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'não autorizado' });
    return;
  }

  try {
    const update =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // --- Mensagem de texto (/hoje, /start) ---
    if (update.message) {
      const msg = update.message;
      const person = personFromTelegramId(msg.from?.id);
      const text = (msg.text || '').trim().toLowerCase();

      if (!person) {
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text:
            'Oi! Não reconheci seu usuário no desafio. 😅\n' +
            `Seu ID do Telegram é: ${msg.from?.id}\n` +
            'Passa esse número pro Vinícius cadastrar.',
        });
        res.status(200).json({ ok: true });
        return;
      }

      if (text.startsWith('/start') || text.startsWith('/hoje') || text === 'hoje') {
        const iso = todaySP();
        const data = await getData();
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: headerText(person, iso),
          parse_mode: 'Markdown',
          reply_markup: buildKeyboard(data[person], iso),
        });
      } else {
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: 'Manda /hoje pra marcar os hábitos. Use ◀️ ▶️ pra preencher dias anteriores. 💪',
        });
      }
      res.status(200).json({ ok: true });
      return;
    }

    // --- Toque num botão (callback_query) ---
    if (update.callback_query) {
      const cq = update.callback_query;
      const person = personFromTelegramId(cq.from?.id);

      if (!person) {
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Usuário não cadastrado no desafio.',
        });
        res.status(200).json({ ok: true });
        return;
      }

      const parts = (cq.data || '').split('|');
      const action = parts[0];
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;

      if (action === 'noop') {
        // Botão central da data: não faz nada.
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
      } else if (action === 'd') {
        // Navegar para outra data: re-renderiza a mensagem.
        const iso = parts[1];
        const data = await getData();
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: headerText(person, iso),
          parse_mode: 'Markdown',
          reply_markup: buildKeyboard(data[person], iso),
        });
      } else if (action === 't') {
        // Marcar/desmarcar um hábito numa data.
        const hid = parts[1];
        const iso = parts[2];
        // Não deixa marcar fora da janela (botão antigo / data futura).
        if (iso < START || iso > maxEditableDate()) {
          await tg('answerCallbackQuery', {
            callback_query_id: cq.id,
            text: 'Essa data está fora do desafio.',
          });
          res.status(200).json({ ok: true });
          return;
        }
        const data = await toggleHabit(person, hid, iso);
        const nowDone = !!data[person][`${hid}__${iso}`];
        const habit = HABITS.find((h) => h.id === hid);
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: `${habit ? habit.name : hid} · ${ddmm(iso)}: ${nowDone ? 'marcado ✅' : 'desmarcado ⬜️'}`,
        });
        await tg('editMessageReplyMarkup', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: buildKeyboard(data[person], iso),
        });
      } else {
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro no webhook do Telegram:', e);
    res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
