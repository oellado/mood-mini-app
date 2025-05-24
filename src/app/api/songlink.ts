import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await axios.get('https://api.song.link/v1-alpha.1/links', {
      params: { url },
      headers: { 'User-Agent': 'mood-mini-app-proxy' }
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      return res.status(500).json({ error: `Error: ${error.message}. Please try again.` });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred. Please try again.' });
    }
  }
}
