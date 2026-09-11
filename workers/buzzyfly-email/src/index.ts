export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const email = body.email;
      if (!email) return new Response('Missing email', { status: 400 });
      await env.DB.prepare('INSERT INTO subscribers (email, ts) VALUES (?, ?)').bind(email, Date.now()).run();
      // Send the free weekly reset checklist via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Buzzyfly <hello@buzzyfly.com>',
          to: email,
          subject: 'Your 20-minute weekly reset checklist',
          html: '<p>Here is your free checklist. The full system is at buzzyfly.com/store.</p>',
        }),
      });
      return new Response('subscribed', { status: 200 });
    }
    return new Response('Buzzyfly Email Worker', { status: 200 });
  },
};
