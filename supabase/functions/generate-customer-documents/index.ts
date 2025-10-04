import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('[EDGE-FUNCTION] Function loaded and ready');

serve(async (req) => {
  const method = req.method;
  const url = req.url;
  console.log(`[EDGE-FUNCTION] ${method} request received at ${url}`);
  
  if (req.method === 'OPTIONS') {
    console.log('[EDGE-FUNCTION] Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[EDGE-FUNCTION] Processing POST request');
    const body = await req.json();
    console.log('[EDGE-FUNCTION] Request body:', JSON.stringify(body));
    
    const response = {
      success: true,
      documents: [{
        type: 'proposal',
        file_path: 'test.pdf',
        download_url: 'https://example.com/test.pdf',
        generated_at: new Date().toISOString()
      }],
      message: 'Edge function received and processed the request successfully!',
      received: body
    };
    
    console.log('[EDGE-FUNCTION] Sending response:', JSON.stringify(response));
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('[EDGE-FUNCTION] Error occurred:', error.message);
    console.error('[EDGE-FUNCTION] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        documents: [],
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
