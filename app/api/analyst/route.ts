import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured.' },
        { status: 500 }
      );
    }

    const { message, trialContext } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are the Lead Agronomic Economist and Field Trial Analyst for the Hassan District Ginger Cultivation Study (Tissue Culture vs Conventional Rhizomes).
Analyze trial metrics, yields, disease resistance, and farmer economics with accurate, concise agronomic reasoning.

${trialContext ? `Live Hassan Trial Dataset:\n${JSON.stringify(trialContext, null, 2)}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\nOfficer Inquiry: ${message}`,
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error('Gemini Analyst Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}