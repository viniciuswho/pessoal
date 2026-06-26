import { toggleHabit } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'método não permitido' });
    return;
  }
  try {
    // Vercel normalmente já entrega req.body parseado; cobrimos string por garantia.
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { pid, hid, iso } = body;
    if (!pid || !hid || !iso) {
      res.status(400).json({ error: 'pid, hid e iso são obrigatórios' });
      return;
    }
    const data = await toggleHabit(pid, hid, iso);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
}
