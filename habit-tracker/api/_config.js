// Configuração compartilhada do backend.
// IMPORTANTE: os `id` dos hábitos abaixo precisam ser IDÊNTICOS aos do public/index.html.

export const PEOPLE = ['vini', 'laura'];

export const HABITS = [
  { id: 'acordar', name: 'Acordar <7h' },
  { id: 'deus', name: 'Intimidade com Deus' },
  { id: 'fisica', name: 'Atividade Física' },
  { id: 'estudo', name: 'Estudo' },
  { id: 'leitura', name: 'Leitura' },
  { id: 'social', name: 'Redes Sociais' },
];

export const HABIT_IDS = HABITS.map((h) => h.id);

// "Hoje" no fuso de São Paulo, no formato YYYY-MM-DD.
// A Vercel roda em UTC; sem isso, marcar de madrugada cairia no dia errado.
export function todaySP() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

// Mapeia o user id do Telegram -> pessoa (vini | laura). Desconhecido -> null.
export function personFromTelegramId(telegramUserId) {
  const id = String(telegramUserId);
  if (id === String(process.env.TELEGRAM_VINI_ID)) return 'vini';
  if (id === String(process.env.TELEGRAM_LAURA_ID)) return 'laura';
  return null;
}
