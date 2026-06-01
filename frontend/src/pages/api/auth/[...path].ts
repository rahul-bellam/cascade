import type { NextApiRequest, NextApiResponse } from 'next';

const TARGET = process.env.AUTH_SERVICE_URL || 'http://localhost:8097';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = ([] as string[]).concat((req.query.path as string[]) || []);
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const url = `${TARGET}/auth/${parts.join('/')}${qs}`;
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e: any) {
    res.status(502).json({ error: 'auth service unreachable', detail: String(e), target: url });
  }
}
