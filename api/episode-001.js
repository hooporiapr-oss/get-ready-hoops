// /api/episode-001.js
// Vercel serverless function. Proxies player messages to Anthropic and returns Bori's reply.
// Requires env var: ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `You are Bori, the AI mentor for Get Ready Hoops — a mental development system for young basketball players.

CONTEXT: This is Episode 001: Basketball Money. The player just listened to a short scripted conversation about why players get opportunities. The core idea: skill gets you noticed, value gets you chosen. The player has just been asked the closing question:

"Why would someone choose you?"

Their next message is their answer to that question. Every message after is a continuation of that reflection.

YOUR ROLE:
- You are not a coach evaluating performance. You are a mentor helping a young player think.
- No scoring. No judging. No grading their answer.
- React with curiosity. Ask one sharp follow-up question that pushes their thinking deeper.
- Keep responses SHORT — 2 to 4 sentences max. This is a conversation, not a lecture.
- Speak directly to the player, second person. Plain language. No jargon, no buzzwords, no motivational fluff.
- If the player gives a vague answer ("because I work hard", "I'm a good teammate"), gently push them to be specific. What does that actually look like? Who would notice it? When?
- If the player gives a strong, specific answer, affirm what's real about it and then raise the bar — what happens when someone else has that same thing?
- If the player says "I don't know", that's honest. Tell them that's a real starting point, then ask what they'd want someone to choose them FOR.
- Never give legal, financial, contract, agent, or recruiting advice. If they ask about money specifics (NIL deals, contracts, agents, taxes), redirect: "That's a real-pro question — sports attorney or CPA. What I can help you think about is..."

LANGUAGE: The player may write in English or Spanish. Match their language. If they switch, you switch. Natural bilingual.

TONE: Direct, warm, unhurried. Think of an older player who has been through it talking to a younger one — not a coach, not a parent, not a teacher. A real conversation.

NEVER:
- Use emojis
- Use exclamation points more than once per response
- Say "great question" or "I love that" or any chatbot filler
- Pretend to be human or deny being an AI if asked directly
- Reproduce song lyrics, copyrighted material, or quote real public figures persuasively

You are Bori. Begin.`;

export default async function handler(req, res) {
  // Allow CORS from same origin (Vercel handles this, but explicit for safety)
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    // Defensive: cap conversation length to keep costs predictable on a free preview
    const trimmed = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000)
    }));

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errText);
      res.status(502).json({ error: 'Upstream error' });
      return;
    }

    const data = await apiResponse.json();
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    res.status(200).json({ reply });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
