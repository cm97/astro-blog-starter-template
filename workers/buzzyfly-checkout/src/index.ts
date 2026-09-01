export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const amount = 4900;
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': 'Buzzyfly Digital System',
          'line_items[0][price_data][unit_amount]': String(amount),
          'line_items[0][quantity]': '1',
          mode: 'payment',
          success_url: 'https://buzzyfly.com/success',
          cancel_url: 'https://buzzyfly.com/store',
        }),
      });
      const data = await res.json();
      return Response.json(data);
    }
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      const sig = request.headers.get('stripe-signature') || '';
      const payload = await request.text();
      // TODO: verify signature with STRIPE_WEBHOOK_SECRET
      const event = JSON.parse(payload);
      if (event.type === 'checkout.session.completed') {
        const email = event.data.object.customer_details?.email || 'unknown';
        await env.DB.prepare('INSERT INTO orders (email, status, ts) VALUES (?, ?, ?)').bind(email, 'paid', Date.now()).run();
      }
      return new Response('ok', { status: 200 });
    }
    return new Response('Buzzyfly Checkout Worker', { status: 200 });
  },
};
