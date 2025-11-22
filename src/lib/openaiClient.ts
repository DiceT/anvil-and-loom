export async function callChatModelRenderer(apiKey: string, model: string, messages: any[], options?: Record<string, any>): Promise<string> {
  if (!apiKey) throw new Error('API key required');
  const payload: any = { model, messages, ...(options || {}) };

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
  const text = j?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.text ?? '';
  return (text || '').trim();
}
