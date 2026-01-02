import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      availability, 
      totalPendingHours, 
      pendingLessonsCount, 
      hoursPerWeek, 
      weeksToComplete,
      sessionDurationMinutes 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const daysPerWeek = availability?.length || 0;
    const sessionsPerWeek = availability?.reduce((sum: number, day: any) => sum + (day.slots?.length || 0), 0) || 0;

    const prompt = `Você é um assistente de planejamento educacional para a plataforma Offe Orunmila Learning, uma escola de estudos tradicionais africanos.

Analise os dados do estudante e forneça uma dica motivacional e prática em português brasileiro:

- Disponibilidade semanal: ${daysPerWeek} dias por semana, ${sessionsPerWeek} sessões
- Tempo total de estudo necessário: ${totalPendingHours?.toFixed(1) || 0} horas
- Lições pendentes: ${pendingLessonsCount || 0}
- Horas de estudo por semana: ${hoursPerWeek?.toFixed(1) || 0}
- Duração média das sessões: ${sessionDurationMinutes || 45} minutos
- Semanas estimadas para conclusão: ${weeksToComplete || 0}

Responda APENAS com uma dica prática e motivacional em 2-3 frases curtas. Seja específico sobre o plano de estudos e use um tom encorajador mas direto. Não use emojis excessivos.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // Fallback message if AI fails
      const fallbackInsight = `Com ${hoursPerWeek?.toFixed(1) || 0} horas de estudo por semana distribuídas em ${daysPerWeek} dias, você completará o curso em aproximadamente ${weeksToComplete} semanas. Mantenha a constância nos estudos!`;
      
      return new Response(JSON.stringify({ insights: fallbackInsight }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || 
      `Continue firme nos estudos! Com sua dedicação atual de ${hoursPerWeek?.toFixed(1)} horas por semana, você está no caminho certo.`;

    console.log('Study plan calculation completed successfully');

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-study-plan function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: 'Continue dedicando tempo aos seus estudos. A constância é a chave para o aprendizado!'
    }), {
      status: 200, // Return 200 with fallback message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
