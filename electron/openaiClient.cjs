const fetch = globalThis.fetch ?? require('node-fetch');

async function callChatModel({ apiKey, model, messages }) {
  if (!apiKey) throw new Error('API key required');
  const payload = { model, messages };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(`OpenAI error: ${res.status} ${text || res.statusText}`);
  }

  const j = await res.json();
  let text = '';
  if (j && j.choices && j.choices[0]) {
    if (j.choices[0].message && typeof j.choices[0].message.content === 'string') {
      text = j.choices[0].message.content;
    } else if (typeof j.choices[0].text === 'string') {
      text = j.choices[0].text;
    }
  }

  return (text || '').trim();
}

module.exports = { callChatModel };
