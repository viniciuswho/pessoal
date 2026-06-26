import { getData, toggleHabit } from './_store.js';
import { HABITS, todaySP, personFromTelegramId } from './_config.js';

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

// Monta o teclado: um botão por hábito, com ✅ se já feito hoje.
function buildKeyboard(personData, iso) {
  return {
    inline_keyboard: HABITS.map((h) => {
      const done = !!personData[`${h.id}__${iso}`];
      return [
        {
          text: `${done ? '✅' : '⬜️'} ${h.name}`,
          callback_data: `t|${h.id}`,
        },
      ];
    }),
  };
}

function headerText(person, iso) {
  const nome = person === 'vini' ? 'Vinícius' : 'Laura';
  const [y, m, d] = iso.split('-');
  return `📅 *${d}/${m}* — hábitos de ${nome}\nToque para marcar ✅ ou desmarcar ⬜️`;
}

export default async function handler(req, res) {
  // Só aceitamos POST do Telegram.
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
    const iso = todaySP();

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
          text: 'Manda /hoje pra marcar os hábitos de hoje. 💪',
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

      const [action, hid] = (cq.data || '').split('|');
      if (action === 't' && hid) {
        const data = await toggleHabit(person, hid, iso);
        const nowDone = !!data[person][`${hid}__${iso}`];
        const habit = HABITS.find((h) => h.id === hid);

        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: `${habit ? habit.name : hid}: ${nowDone ? 'marcado ✅' : 'desmarcado ⬜️'}`,
        });
        // Atualiza os botões da mensagem para refletir o novo estado.
        await tg('editMessageReplyMarkup', {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          reply_markup: buildKeyboard(data[person], iso),
        });
      } else {
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
      }
      res.status(200).json({ ok: true });
      return;
    }

    // Qualquer outro tipo de update: ignora silenciosamente.
    res.status(200).json({ ok: true });
  } catch (e) {
    // Sempre 200 pro Telegram não ficar reenviando; logamos o erro.
    console.error('Erro no webhook do Telegram:', e);
    res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
