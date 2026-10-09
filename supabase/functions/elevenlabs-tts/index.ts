import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for text
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar que o chamador está autenticado (função antes gerava áudio sem checar nada,
    // o que permitia qualquer pessoa consumir créditos pagos do ElevenLabs)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voiceId, skipCache } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text) {
      throw new Error('Text is required');
    }

    const selectedVoiceId = voiceId || 'CwhRBWXzGAHq8TQ4Fs17';
    const textHash = `${hashText(text)}_${selectedVoiceId}`;

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      console.log('Checking cache for hash:', textHash);
      const { data: cached } = await supabase
        .from('generated_audio_cache')
        .select('audio_url')
        .eq('text_hash', textHash)
        .maybeSingle();

      if (cached?.audio_url) {
        console.log('Cache hit! Returning cached audio URL');
        return new Response(
          JSON.stringify({ audioUrl: cached.audio_url, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Cache miss, generating new audio');
    }

    // Generate audio from ElevenLabs
    console.log('Generating TTS for text:', text.substring(0, 50) + '...');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 0.85,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Parse error details for better handling
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail?.status === 'quota_exceeded') {
          throw new Error(`quota_exceeded: ${errorJson.detail.message}`);
        } else if (errorJson.detail?.status === 'detected_unusual_activity') {
          throw new Error(`unusual_activity: ${errorJson.detail.message}`);
        }
      } catch (parseError) {
        // If parsing fails, use original error
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    console.log('Audio generated successfully, size:', audioBuffer.byteLength);

    // Upload to Supabase Storage
    const fileName = `audio/${textHash}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-media')
      .upload(fileName, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Still return the audio even if caching fails
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('content-media')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;
    console.log('Audio uploaded to:', audioUrl);

    // Save to cache table
    const { error: cacheError } = await supabase
      .from('generated_audio_cache')
      .upsert({
        text_hash: textHash,
        text_preview: text.substring(0, 100),
        audio_url: audioUrl,
        voice_id: selectedVoiceId,
        file_size_bytes: audioBuffer.byteLength
      }, { onConflict: 'text_hash' });

    if (cacheError) {
      console.error('Cache insert error:', cacheError);
    }

    return new Response(
      JSON.stringify({ audioUrl, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS error:', errorMessage);
    
    // Determine error type and provide friendly message
    let userMessage = 'Erro ao gerar áudio. Tente novamente mais tarde.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (errorMessage.includes('quota_exceeded')) {
      userMessage = 'Limite de créditos atingido. O áudio estará disponível em breve.';
      errorCode = 'QUOTA_EXCEEDED';
    } else if (errorMessage.includes('unusual_activity') || errorMessage.includes('Free Tier')) {
      userMessage = 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
      errorCode = 'SERVICE_UNAVAILABLE';
    } else if (errorMessage.includes('API key')) {
      userMessage = 'Erro de configuração do serviço de áudio.';
      errorCode = 'CONFIG_ERROR';
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage, 
        errorCode,
        details: errorMessage 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
