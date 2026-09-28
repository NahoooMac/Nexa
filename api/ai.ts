type Model = 'gpt-5.4-mini' | 'gpt-5.4-nano';

const MODELS: Record<'deep' | 'quick', Model> = {
  deep: 'gpt-5.4-mini',
  quick: 'gpt-5.4-nano',
};

function send(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function compact(value: any, depth = 0): any {
  if (depth > 4) return undefined;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => compact(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 60).map(([k, v]) => [k, compact(v, depth + 1)]));
  }
  if (typeof value === 'string') return value.slice(0, 500);
  return value;
}

function buildPrompt(mode: 'deep' | 'quick', question: string, data: any) {
  const focus = mode === 'deep'
    ? 'Give useful, personalized financial and productivity reasoning. Identify patterns, tradeoffs, and concrete next actions.'
    : 'Give a short, practical scan. Identify the most important anomaly, category change, or next action. Do not over-explain.';

  return `You are Nexa, a personal productivity and money intelligence assistant.
${focus}
Never invent numbers. Use only the supplied data.
Do not shame the user about spending. Do not make investment, lending, tax, or other regulated financial recommendations.
Use the user's currency from the data.
Separate observed facts from suggestions.
Keep the response concise and actionable. This is not a chat assistant. Write a self-contained insight or report that can be displayed in Nexa after a button click. For weekly or monthly reports, use clear sections and end with practical priorities.

User question:
${question || 'Analyze my current situation and tell me the most useful things I should know.'}

Nexa data:
${JSON.stringify(compact(data))}
`;
}

async function callOpenAI(model: Model, prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'You are Nexa, a concise personal productivity and financial analytics assistant.' },
        { role: 'user', content: prompt },
      ],
      max_output_tokens: model === 'gpt-5.4-nano' ? 500 : 900,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const result: any = await response.json();
  return result.output_text || result.output?.flatMap((item: any) => item.content || []).map((c: any) => c.text || '').join('') || '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const body = await readBody(req);
    const mode = body.mode === 'quick' ? 'quick' : 'deep';
    const question = typeof body.question === 'string' ? body.question.slice(0, 1000) : 'Generate the requested Nexa analysis.';
    const data = compact(body.data || {});

    if (!data || typeof data !== 'object') return send(res, 400, { error: 'AI data is required' });

    const text = await callOpenAI(MODELS[mode], buildPrompt(mode, question, data));
    return send(res, 200, { model: MODELS[mode], text });
  } catch (error: any) {
    return send(res, 500, { error: error?.message || 'AI request failed' });
  }
}
