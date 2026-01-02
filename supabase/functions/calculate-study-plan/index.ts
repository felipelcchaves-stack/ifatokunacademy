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
      firstExposureHours,
      reviewHours,
      pendingLessonsCount,
      pendingExercisesCount,
      hoursPerWeek, 
      weeksToComplete,
      sessionDurationMinutes,
      exercisesByType,
      itemsInSpacedRepetition,
      memorizationHours,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const daysPerWeek = availability?.length || 0;
    const sessionsPerWeek = availability?.reduce((sum: number, day: any) => sum + (day.slots?.length || 0), 0) || 0;

    // Criar resumo dos tipos de exercícios
    let exerciseTypeSummary = '';
    if (exercisesByType && typeof exercisesByType === 'object') {
      const types = Object.entries(exercisesByType)
        .map(([type, data]: [string, any]) => `${type}: ${data.count} exercícios (~${data.hours?.toFixed(1) || 0}h)`)
        .join(', ');
      exerciseTypeSummary = types;
    }

    const prompt = `Você é um assistente de planejamento educacional especializado para a plataforma Offe Orunmila Learning, uma escola de estudos tradicionais africanos focada em memorização de textos sagrados, Odus e rituais.

Analise os dados REAIS do estudante e forneça uma análise honesta e útil:

📊 DADOS DO ESTUDANTE:
- Disponibilidade semanal: ${daysPerWeek} dias, ${sessionsPerWeek} sessões
- Horas efetivas de estudo/semana: ${hoursPerWeek?.toFixed(1) || 0}h (considerando fadiga cognitiva)
- Duração média das sessões: ${sessionDurationMinutes || 45} minutos

📚 CARGA DE ESTUDOS:
- TEMPO TOTAL ESTIMADO: ${totalPendingHours?.toFixed(0) || 0} horas
  • Primeira exposição: ${firstExposureHours?.toFixed(0) || 0}h
  • Revisões para memorização: ${reviewHours?.toFixed(0) || 0}h
- Lições pendentes: ${pendingLessonsCount || 0}
- Exercícios pendentes: ${pendingExercisesCount || 0}
- Itens em repetição espaçada: ${itemsInSpacedRepetition || 0}
- Horas de memorização: ${memorizationHours?.toFixed(0) || 0}h

📈 DISTRIBUIÇÃO POR TIPO:
${exerciseTypeSummary || 'Dados não disponíveis'}

⏰ ESTIMATIVA:
- Semanas para conclusão: ${weeksToComplete || 0} semanas

INSTRUÇÕES:
1. Se o tempo estimado for alto (>100h), explique que isso é REALISTA para memorização de conteúdo sagrado
2. Se houver muitas horas de revisão, enfatize a importância da repetição espaçada
3. Dê uma dica prática e específica para o ritmo de estudos deste aluno
4. Use um tom encorajador mas HONESTO - não minimize a carga de trabalho
5. Mencione a importância da constância para a memorização

Responda em 3-4 frases curtas e diretas em português brasileiro.`;

    console.log('Calling AI gateway with enhanced study plan data');

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
      
      // Fallback message mais detalhado
      const fallbackInsight = `Seu plano inclui ${totalPendingHours?.toFixed(0) || 0} horas de estudo: ${firstExposureHours?.toFixed(0) || 0}h de conteúdo novo e ${reviewHours?.toFixed(0) || 0}h de revisões para memorização. Com ${hoursPerWeek?.toFixed(1) || 0} horas/semana, você completará em ${weeksToComplete} semanas. A repetição é essencial para fixar o conhecimento sagrado!`;
      
      return new Response(JSON.stringify({ insights: fallbackInsight }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || 
      `Seu plano de ${totalPendingHours?.toFixed(0)} horas inclui tempo para memorização e revisões. Continue firme!`;

    console.log('Study plan calculation completed successfully with detailed analysis');

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-study-plan function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: 'Continue dedicando tempo aos seus estudos. A constância e a repetição são fundamentais para a memorização!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
