import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const systemPrompt = `You are the Lead Agronomic Economist and Field Trial Analyst for the Hassan District Ginger Cultivation Study (Tissue Culture vs Conventional Rhizomes).
Analyze trial metrics, yields, disease resistance, and farmer economics with accurate, concise agronomic reasoning.

${trialContext ? `Live Hassan Trial Dataset:\n${JSON.stringify(trialContext, null, 2)}` : ''}`;

    const prompt = `${systemPrompt}\n\nOfficer Inquiry: ${message}`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Gemini Analyst Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}