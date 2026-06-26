import { getData } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'método não permitido' });
    return;
  }
  try {
    const data = await getData();
    // Sem cache: o site precisa do estado mais recente do Redis.
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'falha ao ler dados', detail: String(e.message || e) });
  }
}
