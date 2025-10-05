import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1?dts';

const DOO_PURPLE = [146/255, 68/255, 255/255];
const DOO_LIGHT_PURPLE = [180/255, 120/255, 255/255];
const DOO_WHITE = [1, 1, 1];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function drawProfessionalHeader(page: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null, pdfDoc: any) {
  const { width, height } = page.getSize();
  const gradientHeight = 80;
  const gradientSteps = 150;
  
  for (let i = 0; i < gradientSteps; i++) {
    const y = height - (i * gradientHeight / gradientSteps);
    const ratio = i / gradientSteps;
    let r, g, b;
    if (ratio < 0.4) {
      const localRatio = ratio / 0.4;
      r = DOO_PURPLE[0] + (DOO_LIGHT_PURPLE[0] - DOO_PURPLE[0]) * localRatio;
      g = DOO_PURPLE[1] + (DOO_LIGHT_PURPLE[1] - DOO_PURPLE[1]) * localRatio;
      b = DOO_PURPLE[2] + (DOO_LIGHT_PURPLE[2] - DOO_PURPLE[2]) * localRatio;
    } else {
      const localRatio = (ratio - 0.4) / 0.6;
      r = DOO_LIGHT_PURPLE[0] + (DOO_WHITE[0] - DOO_LIGHT_PURPLE[0]) * localRatio;
      g = DOO_LIGHT_PURPLE[1] + (DOO_WHITE[1] - DOO_LIGHT_PURPLE[1]) * localRatio;
      b = DOO_LIGHT_PURPLE[2] + (DOO_WHITE[2] - DOO_LIGHT_PURPLE[2]) * localRatio;
    }
    page.drawRectangle({ x: 0, y: y - (gradientHeight / gradientSteps), width: width, height: gradientHeight / gradientSteps + 1, color: rgb(r, g, b) });
  }

  const dooLogoImage = await pdfDoc.embedPng(dooLogoBytes);
  page.drawImage(dooLogoImage, { x: 50, y: height - 70, width: 180, height: 65 });

  if (customerLogoBytes) {
    try {
      const customerLogoImage = await pdfDoc.embedPng(customerLogoBytes);
      page.drawImage(customerLogoImage, { x: width - 110, y: height - 70, width: 60, height: 60 });
    } catch (e) { console.error('Customer logo error:', e); }
  }
}

async function generateProposal(customer: any, pdfDoc: any, font: any) {
    const page = pdfDoc.addPage();
    page.drawText(`Proposal for ${customer.name}`, { x: 50, y: 750, font, size: 30 });
    page.drawText(`This is a proposal for ${customer.name}.`, { x: 50, y: 700, font, size: 20 });
    return page;
}

async function generateServiceAgreement(customer: any, pdfDoc: any, font: any) {
    const page = pdfDoc.addPage();
    page.drawText(`Service Agreement for ${customer.name}`, { x: 50, y: 750, font, size: 30 });
    page.drawText(`This is a service agreement for ${customer.name}.`, { x: 50, y: 700, font, size: 20 });
    return page;
}

async function generateSLA(customer: any, pdfDoc: any, font: any) {
    const page = pdfDoc.addPage();
    page.drawText(`SLA for ${customer.name}`, { x: 50, y: 750, font, size: 30 });
    page.drawText(`This is a SLA for ${customer.name}.`, { x: 50, y: 700, font, size: 20 });
    return page;
}

async function generateInvoice(customer: any, pdfDoc: any, font: any) {
    const page = pdfDoc.addPage();
    page.drawText(`Invoice for ${customer.name}`, { x: 50, y: 750, font, size: 30 });
    page.drawText(`This is an invoice for ${customer.name}.`, { x: 50, y: 700, font, size: 20 });
    return page;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, document_types } = await req.json();
    
    const { data: customer, error } = await supabase.from('customers').select('*').eq('id', customer_id).single();
    if (error || !customer) throw new Error('Customer not found');

    const dooLogoUrl = 'https://cdn.prod.website-files.com/68ac62e7fc79b26131535066/68ad505697774505c5b64767_doo-logo.png';
    const dooLogoResponse = await fetch(dooLogoUrl);
    const dooLogoBytes = new Uint8Array(await dooLogoResponse.arrayBuffer());

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
