import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return new Response('GEMINI_API_KEY is not configured in environment variables.', { status: 500 });
    }

    const body = await req.json();
    
    let promptQuery = '';
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      const lastMsg = body.messages[body.messages.length - 1];
      promptQuery = typeof lastMsg === 'string' ? lastMsg : (lastMsg.content || lastMsg.text || '');
    } else {
      promptQuery = body.message || '';
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a concise Agronomic Field Analyst for the Hassan District Ginger Cultivation Study.
Provide direct, punchy, high-impact agronomic and financial insights.
Strictly keep answers under 3-4 bullet points or 150 words. Avoid formal letter intros or memorandums.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `${systemPrompt}\n\n${body.trialContext ? `Summary Data: ${JSON.stringify(body.trialContext).slice(0, 1500)}\n\n` : ''}User Query: ${promptQuery}`,
      config: {
        maxOutputTokens: 350,
        temperature: 0.2,
      },
    });

    return new Response(response.text || 'No response generated.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Gemini Analyst Error:', error);
    return new Response(error?.message || 'Failed to process inquiry', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}