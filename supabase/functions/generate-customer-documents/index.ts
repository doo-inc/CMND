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

function formatCurrency(amount: number, currency: string = 'BD') {
  return `${amount.toLocaleString()} ${currency}`;
}

async function generateProposal(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Cover Page
  const coverPage = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(coverPage, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  coverPage.drawText('Customer Proposal', { x: 50, y: 650, font: boldFont, size: 36, color: rgb(0.57, 0.27, 1) });
  coverPage.drawText(`Prepared for ${customer.name}`, { x: 50, y: 600, font: boldFont, size: 20 });
  coverPage.drawText(`Contact: ${customer.contact_name || 'N/A'}`, { x: 50, y: 560, font, size: 14 });
  coverPage.drawText(`Email: ${customer.contact_email || 'N/A'}`, { x: 50, y: 540, font, size: 14 });
  coverPage.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 500, font, size: 14 });

  // Page 2: Company Overview
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page2.drawText('About DOO', { x: 50, y: 720, font: boldFont, size: 24 });
  const aboutText = [
    'DOO is a leading provider of AI-powered customer service solutions.',
    'We help businesses automate and enhance their customer interactions',
    'through advanced text and voice AI technologies.',
    '',
    'Our solutions are designed to:',
    '• Reduce response times by up to 80%',
    '• Handle unlimited simultaneous conversations',
    '• Provide 24/7 customer support coverage',
    '• Scale seamlessly with your business growth',
  ];
  let yPos = 680;
  aboutText.forEach(line => {
    page2.drawText(line, { x: 50, y: yPos, font, size: 12 });
    yPos -= 20;
  });

  // Page 3: Service Details
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page3.drawText('Proposed Services', { x: 50, y: 720, font: boldFont, size: 24 });
  yPos = 680;
  
  if (customer.service_type === 'text' || customer.service_type === 'both') {
    page3.drawText('Text AI Services', { x: 50, y: yPos, font: boldFont, size: 16 });
    yPos -= 25;
    page3.drawText(`Plan: ${customer.text_plan || 'N/A'}`, { x: 70, y: yPos, font, size: 12 });
    yPos -= 20;
    page3.drawText(`AI Responses: ${customer.text_ai_responses?.toLocaleString() || 'N/A'}`, { x: 70, y: yPos, font, size: 12 });
    yPos -= 30;
  }
  
  if (customer.service_type === 'voice' || customer.service_type === 'both') {
    page3.drawText('Voice AI Services', { x: 50, y: yPos, font: boldFont, size: 16 });
    yPos -= 25;
    page3.drawText(`Tier: ${customer.voice_tier || 'N/A'}`, { x: 70, y: yPos, font, size: 12 });
    yPos -= 20;
    page3.drawText(`Hours: ${customer.voice_hours || 'N/A'}`, { x: 70, y: yPos, font, size: 12 });
    yPos -= 20;
    page3.drawText(`Price per hour: ${formatCurrency(customer.voice_price_per_hour || 0, customer.currency)}`, { x: 70, y: yPos, font, size: 12 });
    yPos -= 30;
  }

  // Page 4: Pricing
  const page4 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page4, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page4.drawText('Investment', { x: 50, y: 720, font: boldFont, size: 24 });
  page4.drawText(`Setup Fee: ${formatCurrency(customer.setup_fee || 0, customer.currency)}`, { x: 50, y: 670, font: boldFont, size: 14 });
  page4.drawText(`Annual Rate: ${formatCurrency(customer.annual_rate || 0, customer.currency)}`, { x: 50, y: 640, font: boldFont, size: 14 });
  page4.drawText(`Total First Year: ${formatCurrency((customer.setup_fee || 0) + (customer.annual_rate || 0), customer.currency)}`, { x: 50, y: 600, font: boldFont, size: 16, color: rgb(0.57, 0.27, 1) });
  
  page4.drawText(`Payment Terms: ${customer.payment_terms_days || 14} days`, { x: 50, y: 550, font, size: 12 });

  return pdfDoc;
}

async function generateServiceAgreement(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Page 1: Title & Parties
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page1.drawText('Service Agreement', { x: 50, y: 720, font: boldFont, size: 28 });
  page1.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 680, font, size: 12 });
  
  let yPos = 640;
  page1.drawText('BETWEEN:', { x: 50, y: yPos, font: boldFont, size: 14 });
  yPos -= 30;
  page1.drawText('Party A: DOO Technologies', { x: 50, y: yPos, font: boldFont, size: 12 });
  yPos -= 20;
  page1.drawText('Address: [DOO Address]', { x: 70, y: yPos, font, size: 11 });
  yPos -= 20;
  page1.drawText('Registration: [DOO Registration]', { x: 70, y: yPos, font, size: 11 });
  yPos -= 40;
  
  page1.drawText('AND:', { x: 50, y: yPos, font: boldFont, size: 14 });
  yPos -= 30;
  page1.drawText(`Party B: ${customer.name}`, { x: 50, y: yPos, font: boldFont, size: 12 });
  yPos -= 20;
  page1.drawText(`Address: ${customer.legal_address || 'N/A'}`, { x: 70, y: yPos, font, size: 11 });
  yPos -= 20;
  page1.drawText(`Registration: ${customer.company_registration_number || 'N/A'}`, { x: 70, y: yPos, font, size: 11 });
  yPos -= 20;
  page1.drawText(`Representative: ${customer.representative_name || 'N/A'}`, { x: 70, y: yPos, font, size: 11 });
  yPos -= 20;
  page1.drawText(`Title: ${customer.representative_title || 'N/A'}`, { x: 70, y: yPos, font, size: 11 });

  // Page 2: Terms
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page2.drawText('Terms and Conditions', { x: 50, y: 720, font: boldFont, size: 20 });
  yPos = 680;
  
  const sections = [
    { title: '1. Services', text: 'DOO will provide AI-powered customer service solutions as specified in Appendix A.' },
    { title: '2. Term', text: 'This agreement is effective upon signing and continues for one year with automatic renewal.' },
    { title: '3. Fees', text: `Setup Fee: ${formatCurrency(customer.setup_fee || 0, customer.currency)}, Annual: ${formatCurrency(customer.annual_rate || 0, customer.currency)}` },
    { title: '4. Payment Terms', text: `Payment due within ${customer.payment_terms_days || 14} days of invoice date.` },
    { title: '5. Confidentiality', text: 'Both parties agree to maintain confidentiality of proprietary information.' },
  ];
  
  sections.forEach(section => {
    if (yPos < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      yPos = 720;
    }
    page2.drawText(section.title, { x: 50, y: yPos, font: boldFont, size: 13 });
    yPos -= 20;
    page2.drawText(section.text, { x: 70, y: yPos, font, size: 11, maxWidth: 470 });
    yPos -= 40;
  });

  // Page 3: Signatures
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page3.drawText('Signatures', { x: 50, y: 720, font: boldFont, size: 20 });
  page3.drawText('Party A: DOO Technologies', { x: 50, y: 650, font: boldFont, size: 12 });
  page3.drawText('Signature: _____________________', { x: 50, y: 600, font, size: 11 });
  page3.drawText('Date: _____________________', { x: 50, y: 570, font, size: 11 });
  
  page3.drawText(`Party B: ${customer.name}`, { x: 50, y: 500, font: boldFont, size: 12 });
  page3.drawText('Signature: _____________________', { x: 50, y: 450, font, size: 11 });
  page3.drawText('Date: _____________________', { x: 50, y: 420, font, size: 11 });

  return pdfDoc;
}

async function generateSLA(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Page 1: Title & Overview
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page1.drawText('Service Level Agreement', { x: 50, y: 720, font: boldFont, size: 28 });
  page1.drawText(`Customer: ${customer.name}`, { x: 50, y: 680, font: boldFont, size: 14 });
  page1.drawText(`Effective Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 660, font, size: 12 });
  
  let yPos = 620;
  page1.drawText('Service Commitments', { x: 50, y: yPos, font: boldFont, size: 16 });
  yPos -= 30;
  
  const commitments = [
    '• System Uptime: 99.9% availability',
    '• Response Time: < 500ms for 95% of requests',
    '• Support Response: Within 4 business hours',
    '• Critical Issues: Within 1 hour',
    '• Scheduled Maintenance: < 4 hours per month',
  ];
  
  commitments.forEach(commitment => {
    page1.drawText(commitment, { x: 50, y: yPos, font, size: 12 });
    yPos -= 25;
  });

  // Page 2: Support Levels
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page2.drawText('Support Levels', { x: 50, y: 720, font: boldFont, size: 20 });
  yPos = 680;
  
  const supportLevels = [
    { level: 'Critical', time: '1 hour', desc: 'System down, major functionality unavailable' },
    { level: 'High', time: '4 hours', desc: 'Significant feature impacted, workaround available' },
    { level: 'Medium', time: '24 hours', desc: 'Minor feature affected, business continues' },
    { level: 'Low', time: '48 hours', desc: 'General questions, enhancement requests' },
  ];
  
  supportLevels.forEach(level => {
    page2.drawText(`${level.level} Priority - ${level.time}`, { x: 50, y: yPos, font: boldFont, size: 12 });
    yPos -= 20;
    page2.drawText(level.desc, { x: 70, y: yPos, font, size: 11 });
    yPos -= 35;
  });

  // Page 3: Remedies & Exclusions
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page3.drawText('Service Credits', { x: 50, y: 720, font: boldFont, size: 20 });
  yPos = 680;
  
  const credits = [
    'Uptime < 99.9%: 10% monthly fee credit',
    'Uptime < 99.5%: 25% monthly fee credit',
    'Uptime < 99.0%: 50% monthly fee credit',
  ];
  
  credits.forEach(credit => {
    page3.drawText(`• ${credit}`, { x: 50, y: yPos, font, size: 12 });
    yPos -= 25;
  });
  
  yPos -= 20;
  page3.drawText('Exclusions', { x: 50, y: yPos, font: boldFont, size: 16 });
  yPos -= 30;
  
  const exclusions = [
    '• Scheduled maintenance windows',
    '• Issues caused by customer systems or actions',
    '• Force majeure events',
    '• Third-party service failures',
  ];
  
  exclusions.forEach(exclusion => {
    page3.drawText(exclusion, { x: 50, y: yPos, font, size: 11 });
    yPos -= 25;
  });

  return pdfDoc;
}

async function generateInvoice(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  const page = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  page.drawText('INVOICE', { x: 50, y: 720, font: boldFont, size: 32, color: rgb(0.57, 0.27, 1) });
  
  let yPos = 670;
  page.drawText(`Invoice Date: ${new Date().toLocaleDateString()}`, { x: 50, y: yPos, font, size: 11 });
  yPos -= 20;
  page.drawText(`Due Date: ${new Date(Date.now() + (customer.payment_terms_days || 14) * 24 * 60 * 60 * 1000).toLocaleDateString()}`, { x: 50, y: yPos, font, size: 11 });
  yPos -= 40;
  
  // Bill To
  page.drawText('Bill To:', { x: 50, y: yPos, font: boldFont, size: 14 });
  yPos -= 25;
  page.drawText(customer.name, { x: 50, y: yPos, font: boldFont, size: 12 });
  yPos -= 20;
  if (customer.legal_address) {
    page.drawText(customer.legal_address, { x: 50, y: yPos, font, size: 11 });
    yPos -= 20;
  }
  if (customer.contact_email) {
    page.drawText(customer.contact_email, { x: 50, y: yPos, font, size: 11 });
    yPos -= 30;
  } else {
    yPos -= 30;
  }
  
  // Line Items
  yPos -= 20;
  page.drawText('Description', { x: 50, y: yPos, font: boldFont, size: 12 });
  page.drawText('Amount', { x: 450, y: yPos, font: boldFont, size: 12 });
  yPos -= 5;
  page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 1 });
  yPos -= 25;
  
  let subtotal = 0;
  
  if (customer.setup_fee && customer.setup_fee > 0) {
    page.drawText('Setup Fee', { x: 50, y: yPos, font, size: 11 });
    page.drawText(formatCurrency(customer.setup_fee, customer.currency), { x: 450, y: yPos, font, size: 11 });
    subtotal += customer.setup_fee;
    yPos -= 25;
  }
  
  if (customer.annual_rate && customer.annual_rate > 0) {
    page.drawText('Annual Service Fee', { x: 50, y: yPos, font, size: 11 });
    page.drawText(formatCurrency(customer.annual_rate, customer.currency), { x: 450, y: yPos, font, size: 11 });
    subtotal += customer.annual_rate;
    yPos -= 25;
  }
  
  yPos -= 10;
  page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 1 });
  yPos -= 25;
  
  page.drawText('Total', { x: 50, y: yPos, font: boldFont, size: 14 });
  page.drawText(formatCurrency(subtotal, customer.currency), { x: 450, y: yPos, font: boldFont, size: 14 });
  
  // Payment Details
  yPos -= 60;
  page.drawText('Payment Details', { x: 50, y: yPos, font: boldFont, size: 14 });
  yPos -= 25;
  page.drawText('Bank: [Bank Name]', { x: 50, y: yPos, font, size: 11 });
  yPos -= 20;
  page.drawText('Account: [Account Number]', { x: 50, y: yPos, font, size: 11 });
  yPos -= 20;
  page.drawText('IBAN: [IBAN]', { x: 50, y: yPos, font, size: 11 });
  
  // Footer
  page.drawText('Thank you for your business!', { x: 50, y: 100, font: boldFont, size: 12, color: rgb(0.57, 0.27, 1) });
  page.drawText('For questions, contact: finance@doo.com', { x: 50, y: 80, font, size: 10 });

  return pdfDoc;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, document_types, format = 'pdf' } = await req.json();
    console.log('Generating documents for customer:', customer_id, 'types:', document_types);
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();
      
    if (customerError || !customer) {
      console.error('Customer fetch error:', customerError);
      throw new Error('Customer not found');
    }

    // Fetch DOO logo
    const dooLogoUrl = 'https://cdn.prod.website-files.com/68ac62e7fc79b26131535066/68ad505697774505c5b64767_doo-logo.png';
    const dooLogoResponse = await fetch(dooLogoUrl);
    const dooLogoBytes = new Uint8Array(await dooLogoResponse.arrayBuffer());

    // Fetch customer logo if available
    let customerLogoBytes: Uint8Array | null = null;
    if (customer.logo) {
      try {
        const logoResponse = await fetch(customer.logo);
        customerLogoBytes = new Uint8Array(await logoResponse.arrayBuffer());
      } catch (e) {
        console.error('Error fetching customer logo:', e);
      }
    }

    const documents = [];
    const errors = [];

    for (const docType of document_types) {
      try {
        console.log('Generating document type:', docType);
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Generate document based on type
        switch (docType) {
          case 'proposal':
            await generateProposal(customer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'service_agreement':
            await generateServiceAgreement(customer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'sla':
            await generateSLA(customer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'quotation':
            await generateInvoice(customer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          default:
            throw new Error(`Unknown document type: ${docType}`);
        }

        // Save PDF
        const pdfBytes = await pdfDoc.save();
        const timestamp = Date.now();
        const filePath = `${customer_id}/${docType}_${timestamp}.pdf`;

        console.log('Uploading to storage:', filePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(filePath);

        console.log('Document uploaded, URL:', urlData.publicUrl);

        // Insert record into generated_documents table
        const { error: insertError } = await supabase
          .from('generated_documents')
          .insert({
            customer_id,
            document_type: docType,
            file_path: filePath,
            format: 'pdf',
            generated_at: new Date().toISOString(),
            metadata: { 
              customer_name: customer.name,
              generated_by: 'system'
            },
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        documents.push({
          type: docType,
          file_path: filePath,
          download_url: urlData.publicUrl,
          generated_at: new Date().toISOString(),
        });

      } catch (docError: any) {
        console.error(`Error generating ${docType}:`, docError);
        errors.push(`Failed to generate ${docType}: ${docError.message}`);
      }
    }

    console.log('Generation complete. Success:', documents.length, 'Errors:', errors.length);

    return new Response(
      JSON.stringify({ 
        success: documents.length > 0, 
        documents,
        errors: errors.length > 0 ? errors : undefined
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        documents: [],
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
