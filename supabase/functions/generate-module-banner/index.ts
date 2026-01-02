import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moduleId, title, description } = await req.json();
    
    if (!moduleId || !title) {
      return new Response(
        JSON.stringify({ error: "moduleId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build contextual prompt based on module info
    const moduleDescription = description || title;
    const prompt = `Create a sacred African spiritual art banner image for an educational module titled "${title}". 
The module is about: ${moduleDescription}.

Style requirements:
- Traditional Yoruba and Nigerian sacred art aesthetic
- Rich earth tones: deep forest green, warm brown, golden amber accents
- Include subtle Adinkra or Ifa symbols relevant to the content
- Mystical atmosphere with soft golden light
- Nature elements: sacred trees, forest, moonlight
- Horizontal banner format (16:9 aspect ratio)
- Professional, dignified, and spiritually evocative
- No text or letters in the image
- Ultra high resolution`;

    console.log("Generating banner for module:", moduleId, "with prompt:", prompt);

    // Call Lovable AI Gateway for image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    // Extract image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      throw new Error("No image generated from AI");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate unique filename
    const filename = `module-banner-${moduleId}-${Date.now()}.png`;
    
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
    console.log("Image uploaded to:", publicUrl);

    // Update module with new image URL
    const { error: updateError } = await supabase
      .from("modules")
      .update({ image_url: publicUrl })
      .eq("id", moduleId);

    if (updateError) {
      console.error("Module update error:", updateError);
      throw new Error(`Failed to update module: ${updateError.message}`);
    }

    console.log("Module updated successfully with banner URL");

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
