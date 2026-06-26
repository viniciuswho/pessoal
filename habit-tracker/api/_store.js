import { Redis } from '@upstash/redis';
import { PEOPLE, HABIT_IDS } from './_config.js';

// A integração Upstash da Vercel injeta as variáveis automaticamente.
// Dependendo da integração elas vêm como KV_REST_API_* ou UPSTASH_REDIS_REST_*.
// Suportamos as duas para não depender de qual o usuário conectou.
const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = new Redis({ url, token });

const DATA_KEY = 'habitos:data';

function emptyData() {
  return { vini: {}, laura: {} };
}

// Garante o formato { vini:{}, laura:{} } mesmo se o blob vier nulo/incompleto.
function normalize(raw) {
  const base = emptyData();
  if (raw && typeof raw === 'object') {
    for (const pid of PEOPLE) {
      if (raw[pid] && typeof raw[pid] === 'object') base[pid] = raw[pid];
    }
  }
  return base;
}

export async function getData() {
  // O cliente do Upstash já desserializa JSON automaticamente.
  const raw = await redis.get(DATA_KEY);
  return normalize(raw);
}

export async function setData(data) {
  await redis.set(DATA_KEY, data);
  return data;
}

// Alterna um hábito de uma pessoa numa data e persiste. Devolve o DATA novo.
export async function toggleHabit(pid, hid, iso) {
  if (!PEOPLE.includes(pid)) throw new Error('pessoa inválida');
  if (!HABIT_IDS.includes(hid)) throw new Error('hábito inválido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('data inválida');

  const data = await getData();
  const key = `${hid}__${iso}`;
  if (data[pid][key]) {
    delete data[pid][key];
  } else {
    data[pid][key] = true;
  }
  await setData(data);
  return data;
}

// Define explicitamente (usado pelo Telegram para refletir o estado do botão).
export async function isDone(pid, hid, iso) {
  const data = await getData();
  return !!data[pid][`${hid}__${iso}`];
}
