import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Counsel {
  text: string;
  ranking?: number;
  feedback?: string;
  isRelevant?: boolean;
  category?: string;
}

interface ValidatedCounsel extends Counsel {
  ranking: number;
  feedback: string;
  isRelevant: boolean;
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar que o chamador está autenticado (antes o auth era opcional aqui)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { originalText, counsels, exerciseId, lessonId, moduleId } = await req.json();

    console.log("Validating interpretation:", {
      textLength: originalText?.length,
      counselsCount: counsels?.length,
      exerciseId,
    });

    if (!originalText || !counsels || !Array.isArray(counsels) || counsels.length === 0) {
      return new Response(
        JSON.stringify({ error: "originalText and counsels array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt for AI validation
    const counselTexts = counsels.map((c: Counsel, i: number) => `${i + 1}. "${c.text}"`).join("\n");
    
    const systemPrompt = `Você é um mestre de sabedoria tradicional Yorubá e Ifá. Sua tarefa é avaliar conselhos/interpretações que um estudante extraiu de um texto sagrado.

Para cada conselho, você deve:
1. Determinar se o conselho é RELEVANTE ao texto original (faz sentido semântico)
2. Atribuir um ranking de 1 a 5 estrelas baseado na profundidade da interpretação
3. Fornecer um feedback construtivo curto (1-2 frases)
4. Categorizar o tipo de conselho

Critérios de ranking:
- 5 estrelas: Excelente - Captura profundamente a essência do texto
- 4 estrelas: Muito Bom - Conexão clara e direta com o texto
- 3 estrelas: Bom - Relevante mas pode aprofundar a reflexão
- 2 estrelas: Parcial - Conexão fraca, precisa refletir mais
- 1 estrela: Precisa Revisão - Sem conexão clara com o texto

Categorias possíveis: moral, espiritual, prático, social, familiar, profissional, saúde, outro`;

    const userPrompt = `TEXTO ORIGINAL:
"""
${originalText}
"""

CONSELHOS DO ESTUDANTE:
${counselTexts}

Analise cada conselho e retorne sua avaliação.`;

    // Call Gemini directly with native function calling for structured output
    const validateCounselsFunction = {
      name: "validate_counsels",
      description: "Validate each counsel from the student",
      parameters: {
        type: "object",
        properties: {
          validatedCounsels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number", description: "Index of the counsel (1-based)" },
                isRelevant: { type: "boolean", description: "Whether the counsel is relevant to the text" },
                ranking: { type: "number", description: "Rating from 1 to 5" },
                feedback: { type: "string", description: "Constructive feedback in Portuguese" },
                category: {
                  type: "string",
                  enum: ["moral", "espiritual", "prático", "social", "familiar", "profissional", "saúde", "outro"],
                  description: "Category of the counsel"
                },
              },
              required: ["index", "isRelevant", "ranking", "feedback", "category"],
            },
          },
          overallFeedback: {
            type: "string",
            description: "General feedback about the student's interpretation in Portuguese",
          },
        },
        required: ["validatedCounsels", "overallFeedback"],
      },
    };

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          tools: [{ functionDeclarations: [validateCounselsFunction] }],
          toolConfig: {
            functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["validate_counsels"] },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao validar interpretação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiData).slice(0, 500));

    // Extract the function call result (Gemini returns args as a parsed object, not a JSON string)
    const functionCallPart = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    if (!functionCallPart || functionCallPart.functionCall.name !== "validate_counsels") {
      console.error("No valid function call in response");
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = functionCallPart.functionCall.args;
    const { validatedCounsels, overallFeedback } = validationResult;

    // Merge validation results with original counsels
    const mergedCounsels: ValidatedCounsel[] = counsels.map((counsel: Counsel, index: number) => {
      const validation = validatedCounsels.find((v: any) => v.index === index + 1) || {
        isRelevant: false,
        ranking: 1,
        feedback: "Não foi possível validar este conselho.",
        category: "outro",
      };

      return {
        text: counsel.text,
        isRelevant: validation.isRelevant,
        ranking: Math.min(5, Math.max(1, validation.ranking)),
        feedback: validation.feedback,
        category: validation.category,
      };
    });

    // Calculate statistics
    const totalCounsels = mergedCounsels.length;
    const relevantCounsels = mergedCounsels.filter((c) => c.isRelevant).length;
    const averageRanking = totalCounsels > 0
      ? mergedCounsels.reduce((sum, c) => sum + c.ranking, 0) / totalCounsels
      : 0;

    // Save to database (caller is always authenticated at this point)
    if (exerciseId) {
      try {
        const { error: saveError } = await supabase
          .from("interpretation_responses")
          .upsert({
            user_id: callerUser.id,
            exercise_id: exerciseId,
            lesson_id: lessonId || null,
            module_id: moduleId || null,
            counsels: mergedCounsels,
            total_counsels: totalCounsels,
            relevant_counsels: relevantCounsels,
            average_ranking: parseFloat(averageRanking.toFixed(2)),
            original_text: originalText,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,exercise_id",
          });

        if (saveError) {
          console.error("Error saving interpretation response:", saveError);
        } else {
          console.log("Interpretation response saved successfully");
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Don't fail the request, just log the error
      }
    }

    return new Response(
      JSON.stringify({
        counsels: mergedCounsels,
        totalCounsels,
        relevantCounsels,
        averageRanking: parseFloat(averageRanking.toFixed(2)),
        overallFeedback,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});