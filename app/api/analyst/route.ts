import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return new Response('GEMINI_API_KEY is not configured in environment variables.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const body = await req.json();

    let promptQuery = '';
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      const lastMsg = body.messages[body.messages.length - 1];
      promptQuery = typeof lastMsg === 'string' ? lastMsg : (lastMsg.content || lastMsg.text || '');
    } else {
      promptQuery = body.message || '';
    }

    const systemInstruction = `You are a concise Agronomic Field Analyst for the Hassan District Ginger Cultivation Study. Provide direct, high-impact agronomic and financial insights. Strictly keep answers under 3-4 bullet points or 150 words. Avoid formal letter intros or memorandums.`;

    // Direct REST call supporting both AQ. and AIza keys
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\n${
                  body.trialContext ? `Summary Data: ${JSON.stringify(body.trialContext).slice(0, 1500)}\n\n` : ''
                }User Query: ${promptQuery}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 350,
          temperature: 0.2,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini REST API Error:', data);
      return new Response(data?.error?.message || 'API call failed', {
        status: res.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return new Response(replyText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Analyst Handler Error:', error);
    return new Response(error?.message || 'Failed to process inquiry', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}