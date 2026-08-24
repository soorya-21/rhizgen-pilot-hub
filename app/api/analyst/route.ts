import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, question } = await req.json();

    // 1. Fetch live trial datasets
    const { data: farmers } = await supabase.from('farmers').select('*').order('farmer_code', { ascending: true });
    const { data: blocks } = await supabase.from('treatment_blocks').select('*');
    const { data: harvest } = await supabase.from('harvest_records').select('*');
    const { data: disease } = await supabase.from('disease_records').select('*');
    const { data: costs } = await supabase.from('cost_records').select('*');
    const { data: surveys } = await supabase.from('farmer_surveys').select('*');

    const MARKET_PRICE_PER_KG = 60;

    // 2. Build Dossiers
    const farmerDossiers = (farmers || []).map((f) => {
      const fBlocks = (blocks || []).filter((b) => b.farmer_id === f.id);
      const tcBlock = fBlocks.find((b) => b.treatment === 'TC_SEEDLING');
      const convBlock = fBlocks.find((b) => b.treatment === 'CONVENTIONAL_RHIZOME');

      const tcHarvest = (harvest || []).find((h) => h.block_id === tcBlock?.id);
      const convHarvest = (harvest || []).find((h) => h.block_id === convBlock?.id);

      const tcCost = (costs || []).filter((c) => c.block_id === tcBlock?.id).reduce((sum, c) => sum + Number(c.amount_inr || 0), 0);
      const convCost = (costs || []).filter((c) => c.block_id === convBlock?.id).reduce((sum, c) => sum + Number(c.amount_inr || 0), 0);

      const fDiseases = (disease || []).filter((d) => fBlocks.some((b) => b.id === d.block_id) && d.disease_observed);
      const fSurvey = (surveys || []).find((s) => s.farmer_id === f.id);

      const tcYieldAc = tcHarvest?.yield_per_acre_kg ? Number(tcHarvest.yield_per_acre_kg).toFixed(0) : 'N/A';
      const convYieldAc = convHarvest?.yield_per_acre_kg ? Number(convHarvest.yield_per_acre_kg).toFixed(0) : 'N/A';
      const tcNet = tcHarvest ? ((Number(tcHarvest.marketable_yield_kg) * MARKET_PRICE_PER_KG) - tcCost) : 0;
      const convNet = convHarvest ? ((Number(convHarvest.marketable_yield_kg) * MARKET_PRICE_PER_KG) - convCost) : 0;

      return `[FARMER: ${f.farmer_code} | ${f.farmer_name} | ${f.village}]
Soil: ${f.soil_type || 'Sandy Loam'} | Irrigation: ${f.irrigation_type || 'Drip'}
- TC: Yield = ${tcYieldAc} kg/ac, Cost = ₹${tcCost.toLocaleString()}, Net Profit = ₹${tcNet.toLocaleString()}
- Conv: Yield = ${convYieldAc} kg/ac, Cost = ₹${convCost.toLocaleString()}, Net Profit = ₹${convNet.toLocaleString()}
- Disease: ${fDiseases.length > 0 ? fDiseases.map((d) => `${d.suspected_disease} (Sev ${d.severity_rating}/5)`).join(', ') : 'None'}
- Survey: Sat ${fSurvey ? `${fSurvey.overall_satisfaction}/5` : 'Pending'}, Repurchase ${fSurvey?.repurchase_intent ? 'Yes' : 'Pending'}`;
    }).join('\n\n');

    // 3. Trial-Wide Aggregates
    const tcHarvestList = (harvest || []).filter((h) => (blocks || []).find((b) => b.id === h.block_id)?.treatment === 'TC_SEEDLING');
    const convHarvestList = (harvest || []).filter((h) => (blocks || []).find((b) => b.id === h.block_id)?.treatment === 'CONVENTIONAL_RHIZOME');

    const tcAvgYield = tcHarvestList.length > 0 
      ? tcHarvestList.reduce((acc, r) => acc + Number(r.yield_per_acre_kg || 0), 0) / tcHarvestList.length 
      : 0;

    const convAvgYield = convHarvestList.length > 0 
      ? convHarvestList.reduce((acc, r) => acc + Number(r.yield_per_acre_kg || 0), 0) / convHarvestList.length 
      : 0;

    const yieldAdvantagePct = convAvgYield > 0 
      ? (((tcAvgYield - convAvgYield) / convAvgYield) * 100).toFixed(1) 
      : '0.0';

    const systemContext = `You are the GingerTrial AI Principal Scientist & Agronomic Economist.
Access to Hassan Pilot Dataset (Rio de Janeiro variety, 10 farmers, baseline ₹60/kg).

TRIAL METRICS:
- TC Mean Yield: ${tcAvgYield.toFixed(1)} kg/acre | Conv Mean Yield: ${convAvgYield.toFixed(1)} kg/acre (+${yieldAdvantagePct}%)
- Recorded Disease Incidents: ${(disease || []).filter(d => d.disease_observed).length}

FARMER DOSSIERS:
${farmerDossiers}

CONVERSATIONAL RULES:
1. Provide precise numbers and currency (₹) / yield (kg/ac).
2. Proactively diagnose anomalies if relevant (e.g. outlier yields or cost disparities).
3. End responses with a relevant follow-up question or investigative prompt.`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response('GEMINI_API_KEY is missing.', { status: 500 });
    }

    // Build chat history turns
    const contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemContext}\n\nStart of conversation.` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I am ready to analyze all trial records, yield data, and farmer economics.' }],
      });
      for (const msg of messages) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemContext}\n\nUser Question: ${question}` }],
      });
    }

    // Direct SSE Stream from Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!geminiRes.body) {
      return new Response('Failed to establish stream', { status: 500 });
    }

    // Transform SSE payload into a continuous text stream
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (chunkText) {
                    controller.enqueue(encoder.encode(chunkText));
                  }
                } catch {
                  // Ignore partial chunks
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return new Response(error.message || 'Internal Error', { status: 500 });
  }
}