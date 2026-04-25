// /api/checkout.js
// Vercel Edge function. Creates a Stripe Checkout Session and returns its URL.
// Required env: STRIPE_SECRET_KEY

export const config = {
  runtime: 'edge'
};

// Maps tier slug → Stripe Price ID. These three live in your Stripe dashboard.
const PRICES = {
  lvl2:   'price_1TQ3BcIC7qSWxSMT3WY8iRaH', // Get Ready Hoops — Level 2: Separation — $29
  lvl3:   'price_1TQ3DQIC7qSWxSMTOdat5OrZ', // Get Ready Hoops — Level 3: Mastery — $39
  bundle: 'price_1TQ3EtIC7qSWxSMTyYle2eVY'  // Get Ready Hoops — Levels 2 + 3 Bundle — $49
};

// What each tier unlocks. We pass this to Stripe as metadata so the webhook
// (when we build it) knows what to grant.
const UNLOCKS = {
  lvl2:   'level2',
  lvl3:   'level3',
  bundle: 'level2,level3'
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonError(500, 'Server not configured');
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const { tier, lang } = body || {};
  const priceId = PRICES[tier];
  if (!priceId) {
    return jsonError(400, 'Unknown tier');
  }

  // Build the origin (e.g. https://getreadyhoops.com) from the incoming request
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  // Stripe expects form-encoded params, not JSON
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', `${origin}/access.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/unlock.html`);
  params.append('automatic_tax[enabled]', 'false');
  params.append('billing_address_collection', 'auto');
  params.append('allow_promotion_codes', 'true');
  params.append('locale', lang === 'es' ? 'es' : 'en');
  params.append('metadata[tier]', tier);
  params.append('metadata[unlocks]', UNLOCKS[tier]);

  let stripeRes;
  try {
    stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
  } catch {
    return jsonError(502, 'Stripe connection failed');
  }

  if (!stripeRes.ok) {
    const errText = await stripeRes.text();
    console.error('Stripe error:', stripeRes.status, errText);
    return jsonError(502, 'Stripe error');
  }

  const session = await stripeRes.json();

  if (!session.url) {
    return jsonError(502, 'No session URL');
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
