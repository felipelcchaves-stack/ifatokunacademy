import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Mapeamento de contexto cultural por palavras-chave
const contextKeywords: Record<string, string> = {
  "oogun": "traditional Yoruba medicine (Oogun), sacred healing herbs and leaves (ewe), medicinal preparations in clay pots, forest medicine gathering, Osanyin staff",
  "orisa": "Orisa shrine elements, sacred vessels (igba), ritual offerings, devotional symbols, altar arrangements",
  "ogun": "Ogun symbolism - iron tools, palm fronds (mariwo), forest imagery, blacksmith elements, colors: black and green",
  "sango": "Sango symbolism - ose Sango (double-headed axe), lightning, thunder stones (edun ara), colors: red and white",
  "osun": "Osun symbolism - river waters, brass jewelry, mirror (aworan), honey, fertility symbols, colors: yellow and gold",
  "obatala": "Obatala symbolism - white cloth (ala), dove, snail shells, purity, creation, colors: pure white and silver",
  "yemoja": "Yemoja symbolism - ocean waters, fish, seashells, motherhood, colors: blue and crystal",
  "oya": "Oya symbolism - wind, buffalo horns, cemetery, transformation, colors: burgundy and purple",
  "esu": "Esu symbolism - crossroads, laterite clay, cowries, communication, colors: red and black",
  "iyami": "Iyaami Osoronga - sacred birds (eleiye), night symbolism, Gelede masks, maternal ancestral power, calabash",
  "odu": "Ifá Odu signatures, sacred markings on iyerosun powder, palm nut arrangements, divination patterns on Opon Ifá",
  "imule": "sacred oaths and covenants, spiritual bonds, ritual agreements, binding symbols, blood pacts",
  "sise": "ritual practice (sise), ceremonial preparations, sacred work, devotional service, offerings",
  "ifa": "Ifá divination system, Opon Ifá (divination board), Opele chain, Ikin (sacred palm nuts), Iroke tapper",
  "yoruba": "Yoruba language and culture, oral tradition, proverbs (owe), Aroko communication symbols",
  "akapo": "apprentice studies, learning path, student of Ifá, foundation knowledge, sitting at master's feet",
  "awo": "mysteries (awo), initiated knowledge, deeper understanding, secret wisdom, sacred groves",
  "oluwo": "master priest, highest knowledge, leadership in Ifá, complete mastery, elder wisdom",
  "egungun": "ancestral masquerade, Egungun costumes, ancestor veneration, spiritual lineage",
  "ori": "Ori (inner head/destiny), consciousness, personal divinity, spiritual alignment",
  "ibeji": "sacred twins, Ere Ibeji carvings, twin veneration, duality symbolism"
};

function getContextualElements(title: string, description: string): string {
  const combinedText = `${title} ${description}`.toLowerCase();
  const matchedContexts: string[] = [];
  
  for (const [keyword, context] of Object.entries(contextKeywords)) {
    if (combinedText.includes(keyword.toLowerCase())) {
      matchedContexts.push(context);
    }
  }
  
  if (matchedContexts.length > 0) {
    return `\n\nSPECIFIC CONTEXT FOR THIS MODULE:\n- ${matchedContexts.join('\n- ')}`;
  }
  
  return "";
}

function buildCustomPrompt(bannerPrompt: string, title: string, description: string, isRetry: boolean = false): string {
  // Replace placeholders in the org's custom prompt
  let prompt = bannerPrompt
    .replace(/\{title\}/g, title)
    .replace(/\{description\}/g, description || "Educational module");

  const contextualElements = getContextualElements(title, description);

  prompt += `${contextualElements}

TECHNICAL REQUIREMENTS (always apply):
- Horizontal banner format (16:9 aspect ratio)
- Ultra high resolution quality
- NO TEXT, NO LETTERS, NO WORDS in the image
- Subtle, artistic representation - not literal or cartoonish`;

  if (isRetry) {
    prompt += "\n\nIMPORTANT: Generate the actual visual image now. Do not describe it - CREATE the image directly.";
  }

  return prompt;
}

function buildPrompt(title: string, description: string, isRetry: boolean = false): string {
  const contextualElements = getContextualElements(title, description);
  
  const basePrompt = `Create a sacred banner image inspired by authentic Nigerian Isese and Ifá tradition for an educational module titled "${title}".

Module description: ${description || "Traditional Yoruba spiritual studies"}.

CULTURAL FOUNDATION - This is content about traditional Yoruba religion (Isese), the Ifá divination system, and Orisa worship from Nigeria/Benin. Include these AUTHENTIC elements:

SACRED IFÁ OBJECTS:
- Opon Ifá (divination board with intricate carved borders featuring Esu face)
- Opele (divination chain with 8 half seed pods)
- Ikin Ifá (16 sacred palm nuts arranged ceremonially)
- Iroke Ifá (carved ivory or wood divination tapper)
- Iyerosun (sacred divination powder from Irosun tree)

TRADITIONAL YORUBA AESTHETICS:
- Adire textile patterns (indigo tie-dye with symbolic motifs)
- Aso-Oke woven fabric textures (strip-woven cloth)
- Ere Ibeji carving style (smooth wood, detailed features)
- Benin bronze art influence (detailed metalwork)
- Carved calabash patterns

SACRED NATURAL ELEMENTS:
- Iroko tree (sacred Orisa tree)
- Palm fronds (mariwo)
- Cowrie shells (owo eyo) in patterns
- Kola nuts (obi abata) - four-lobed sacred nuts
- Sacred grove atmosphere (igbo)
- River or forest settings

AUTHENTIC COLOR PALETTE:
- Earth browns and terracotta
- Deep forest greens  
- Indigo blues (from Adire)
- Warm golds and brass tones
- Sacred whites
${contextualElements}

STYLE REQUIREMENTS:
- Mystical, sacred forest or shrine atmosphere
- Horizontal banner format (16:9 aspect ratio)
- Professional, dignified, spiritually evocative
- Ultra high resolution quality
- NO TEXT, NO LETTERS, NO WORDS in the image
- Authentic Nigerian/Yoruba aesthetic - NOT generic "African" imagery
- Subtle, artistic representation - not literal or cartoonish`;

  if (isRetry) {
    return basePrompt + "\n\nIMPORTANT: Generate the actual visual image now. Do not describe it - CREATE the image directly.";
  }
  
  return basePrompt;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  console.log("generate-module-banner: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual authentication - get Authorization header
    const authHeader = req.headers.get("authorization");
    console.log("generate-module-banner: Auth header present:", !!authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("generate-module-banner: Missing or invalid auth header");
      return new Response(
        JSON.stringify({ error: "Sessão inválida. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Validate user with getClaims (works with signing-keys)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log("generate-module-banner: User validation failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = claimsData.claims.sub as string;
    console.log("generate-module-banner: User validated:", userId);

    // Check if user is admin using service role client
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { user_id: userId });
    
    if (adminError) {
      console.log("generate-module-banner: Admin check failed:", adminError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!isAdmin) {
      console.log("generate-module-banner: User is not admin");
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerar banners." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("generate-module-banner: User is admin, proceeding");

    const { moduleId, title, description } = await req.json();
    
    if (!moduleId || !title) {
      return new Response(
        JSON.stringify({ error: "moduleId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("generate-module-banner: Generating banner for module:", title);

    // Fetch organization's custom banner prompt
    let customBannerPrompt: string | null = null;
    const { data: moduleOrgData } = await supabase
      .from("modules")
      .select("organization_id")
      .eq("id", moduleId)
      .single();

    if (moduleOrgData?.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("branding")
        .eq("id", moduleOrgData.organization_id)
        .single();
      
      customBannerPrompt = (orgData?.branding as any)?.banner_prompt || null;
      console.log("generate-module-banner: Custom prompt found:", !!customBannerPrompt);
    }

    // Generate image with retry logic
    let imageData: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`generate-module-banner: Attempt ${attempt}/${MAX_RETRIES}`);

      const isRetry = attempt > 1;
      const prompt = customBannerPrompt
        ? buildCustomPrompt(customBannerPrompt, title, description || "", isRetry)
        : buildPrompt(title, description || "", isRetry);

      try {
        console.log("generate-module-banner: Calling Gemini API");

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`generate-module-banner: Gemini API error (attempt ${attempt}):`, response.status, errorText);

          if (response.status === 429) {
            lastError = "Rate limit exceeded. Please try again later.";
            if (attempt < MAX_RETRIES) {
              console.log(`generate-module-banner: Rate limited, waiting ${RETRY_DELAY_MS * 2}ms...`);
              await sleep(RETRY_DELAY_MS * 2);
              continue;
            }
          } else {
            lastError = `Gemini API error: ${response.status}`;
          }

          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          return new Response(
            JSON.stringify({ error: lastError }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const aiData = await response.json();
        console.log("generate-module-banner: AI response received");

        // Extract image from response (Gemini returns base64 inline data, not a data URL)
        const imagePart = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        const generatedImage = imagePart
          ? `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`
          : null;

        if (!generatedImage) {
          console.error(`generate-module-banner: No image in AI response (attempt ${attempt}):`, JSON.stringify(aiData).substring(0, 500));
          lastError = "AI did not generate an image";
          
          if (attempt < MAX_RETRIES) {
            console.log(`generate-module-banner: No image, retrying in ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          
          throw new Error("No image generated from AI after all retries");
        }

        // Success!
        imageData = generatedImage;
        console.log("generate-module-banner: Image generated successfully on attempt", attempt);
        break;

      } catch (fetchError) {
        console.error(`generate-module-banner: Fetch error on attempt ${attempt}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
        
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw fetchError;
      }
    }

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: lastError || "Failed to generate image after all retries" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate unique filename
    const filename = `module-banner-${moduleId}-${Date.now()}.png`;
    
    console.log("generate-module-banner: Uploading to storage");
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("content-media")
      .upload(`banners/${filename}`, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("content-media")
      .getPublicUrl(`banners/${filename}`);

    const publicUrl = urlData.publicUrl;
    console.log("generate-module-banner: Image uploaded to:", publicUrl);

    // Update module with new image URL
    const { error: updateError } = await supabase
      .from("modules")
      .update({ image_url: publicUrl })
      .eq("id", moduleId);

    if (updateError) {
      console.error("Module update error:", updateError);
      throw new Error(`Failed to update module: ${updateError.message}`);
    }

    console.log("generate-module-banner: Module updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        message: "Banner generated and saved successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-module-banner:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});