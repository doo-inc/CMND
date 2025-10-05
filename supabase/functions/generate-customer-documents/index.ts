import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DOO Brand Colors (Official)
const DOO_PINK = [212, 106, 216]; // #d46ad8
const DOO_PURPLE = [113, 44, 157]; // #712c9d
const DOO_LIGHT_PURPLE = [193, 87, 224]; // #c157e0
const DOO_LIGHT_PINK = [226, 120, 212]; // #e278d4

// Professional header with logos and gradient effect
async function drawProfessionalHeader(
  page: any, 
  boldFont: any, 
  regularFont: any,
  dooLogoBytes: Uint8Array | null,
  customerLogoBytes: Uint8Array | null,
  pdfDoc: any
) {
  const { width, height } = page.getSize();
  
  // Compact header height
  const headerHeight = 60;
  
  // Draw gradient-style header with multiple rectangles
  const gradientSteps = 4;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = DOO_PINK[0] + (DOO_PURPLE[0] - DOO_PINK[0]) * ratio;
    const g = DOO_PINK[1] + (DOO_PURPLE[1] - DOO_PINK[1]) * ratio;
    const b = DOO_PINK[2] + (DOO_PURPLE[2] - DOO_PINK[2]) * ratio;
    
    page.drawRectangle({
      x: (width / gradientSteps) * i,
      y: height - headerHeight,
      width: (width / gradientSteps) + 1,
      height: headerHeight,
      color: rgb(r / 255, g / 255, b / 255),
    });
  }
  
  // Embed and draw DOO logo if available
  if (dooLogoBytes) {
    try {
      const dooLogo = await pdfDoc.embedPng(dooLogoBytes);
      const logoHeight = 40;
      const logoWidth = (dooLogo.width / dooLogo.height) * logoHeight;
      
      page.drawImage(dooLogo, {
        x: 40,
        y: height - headerHeight + 10,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (e) {
      // Fallback to text
      page.drawText('DOO', {
        x: 40,
        y: height - 35,
        size: 24,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
    }
  } else {
    page.drawText('DOO', {
      x: 40,
      y: height - 35,
      size: 24,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
  }
  
  // Draw customer logo on the right if available
  if (customerLogoBytes) {
    try {
      const customerLogo = await pdfDoc.embedPng(customerLogoBytes);
      const logoHeight = 35;
      const logoWidth = (customerLogo.width / customerLogo.height) * logoHeight;
      
      page.drawImage(customerLogo, {
        x: width - logoWidth - 40,
        y: height - headerHeight + 12,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (e) {
      console.error('Failed to embed customer logo:', e);
    }
  }
}

// Professional footer with page number
function drawFooter(page: any, text: string, font: any, pageNum: number) {
  const { width } = page.getSize();
  
  page.drawLine({
    start: { x: 50, y: 50 },
    end: { x: width - 50, y: 50 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  
  page.drawText(text, {
    x: 50,
    y: 35,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText(`Page ${pageNum}`, {
    x: width - 100,
    y: 35,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
}

// Professional Customer Proposal
async function generateProposal(
  customer: any, 
  dooLogoBytes: Uint8Array | null,
  customerLogoBytes: Uint8Array | null
) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const firstPage = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = firstPage.getSize();
  
  await drawProfessionalHeader(firstPage, boldFont, regularFont, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  let yPos = height - 120;
  
  // Title
  firstPage.drawText('CUSTOMER PROPOSAL', {
    x: 50,
    y: yPos,
    size: 22,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  yPos -= 50;
  
  // Customer Information Section
  firstPage.drawText('Client Information', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const infoLines = [
    `Company: ${customer.name}`,
    `Country: ${customer.country || 'N/A'}`,
    `Industry: ${customer.industry || 'N/A'}`,
    `Contact: ${customer.contact_name || 'N/A'}`,
    `Email: ${customer.contact_email || 'N/A'}`,
  ];
  
  infoLines.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  });
  
  yPos -= 20;
  
  // Proposal Details
  firstPage.drawText('Proposed Solution', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const proposalText = [
    'We are pleased to present our comprehensive solution tailored to your',
    'business needs. Our platform offers cutting-edge technology and dedicated',
    'support to help you achieve your goals.',
    '',
    'Key Benefits:',
    '  • Enterprise-grade security and reliability',
    '  • 24/7 dedicated customer support',
    '  • Scalable infrastructure that grows with your business',
    '  • Regular updates and feature enhancements',
    '  • Comprehensive training and onboarding',
  ];
  
  proposalText.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 18;
  });
  
  yPos -= 20;
  
  // Pricing Section
  firstPage.drawText('Investment', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const currency = customer.currency || 'BD';
  const setupFee = customer.setup_fee || 0;
  const annualRate = customer.annual_rate || customer.contract_size || 0;
  
  firstPage.drawText(`Setup Fee: ${setupFee.toLocaleString()} ${currency}`, {
    x: 50,
    y: yPos,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 20;
  
  firstPage.drawText(`Annual Rate: ${annualRate.toLocaleString()} ${currency}`, {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  yPos -= 40;
  
  // Next Steps
  firstPage.drawText('Next Steps', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const nextSteps = [
    '1. Review this proposal and discuss any questions',
    '2. Sign the Service Agreement',
    '3. Complete onboarding and setup',
    '4. Go live with your new solution',
  ];
  
  nextSteps.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  });
  
  const footerText = 'DOO • www.doo.com • info@doo.com';
  drawFooter(firstPage, footerText, regularFont, 1);

  return await pdfDoc.save();
}

// Professional Service Level Agreement
async function generateSLA(
  customer: any, 
  dooLogoBytes: Uint8Array | null,
  customerLogoBytes: Uint8Array | null
) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const firstPage = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = firstPage.getSize();
  
  await drawProfessionalHeader(firstPage, boldFont, regularFont, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  let yPos = height - 120;
  
  // Title
  firstPage.drawText('SERVICE LEVEL AGREEMENT', {
    x: 50,
    y: yPos,
    size: 22,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  yPos -= 50;
  
  firstPage.drawText(`Between: DOO and ${customer.name}`, {
    x: 50,
    y: yPos,
    size: 12,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 35;
  
  // Service Availability
  firstPage.drawText('1. Service Availability', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const availabilityText = [
    'DOO guarantees 99.9% uptime for all services. Scheduled maintenance',
    'windows will be communicated at least 48 hours in advance.',
  ];
  
  availabilityText.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 18;
  });
  
  yPos -= 20;
  
  // Support Levels
  firstPage.drawText('2. Support Levels', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const supportLevels = [
    'Priority 1 (Critical): Response within 1 hour, 24/7',
    'Priority 2 (High): Response within 4 hours during business hours',
    'Priority 3 (Medium): Response within 1 business day',
    'Priority 4 (Low): Response within 3 business days',
  ];
  
  supportLevels.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  });
  
  yPos -= 20;
  
  // Performance Metrics
  firstPage.drawText('3. Performance Metrics', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const metricsText = [
    '  • System uptime: 99.9% monthly average',
    '  • Page load time: < 2 seconds',
    '  • API response time: < 500ms',
    '  • Support ticket first response: Within SLA timeframes',
  ];
  
  metricsText.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  });
  
  yPos -= 20;
  
  // Security & Compliance
  firstPage.drawText('4. Security & Compliance', {
    x: 50,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 25;
  
  const securityText = [
    'All data is encrypted in transit and at rest. We maintain compliance',
    'with industry standards including ISO 27001 and SOC 2 Type II.',
  ];
  
  securityText.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 18;
  });
  
  const footerText = 'DOO • www.doo.com • info@doo.com';
  drawFooter(firstPage, footerText, regularFont, 1);

  return await pdfDoc.save();
}

// Professional Invoice/Quotation
async function generateInvoice(
  customer: any, 
  dooLogoBytes: Uint8Array | null,
  customerLogoBytes: Uint8Array | null
) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const firstPage = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = firstPage.getSize();
  
  await drawProfessionalHeader(firstPage, boldFont, regularFont, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  let yPos = height - 120;
  
  // Title
  firstPage.drawText('QUOTATION', {
    x: 50,
    y: yPos,
    size: 22,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  // Date and Quote Number
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  firstPage.drawText(`Date: ${today}`, {
    x: width - 200,
    y: yPos,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  firstPage.drawText(`Quote #: Q-${Date.now().toString().slice(-6)}`, {
    x: width - 200,
    y: yPos - 18,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 60;
  
  // Bill To
  firstPage.drawText('Bill To:', {
    x: 50,
    y: yPos,
    size: 12,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 22;
  
  const billToLines = [
    customer.name,
    customer.legal_address || '',
    customer.country || '',
    customer.contact_email || '',
  ].filter(line => line);
  
  billToLines.forEach(line => {
    firstPage.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 18;
  });
  
  yPos -= 25;
  
  // Table Header
  const tableTop = yPos;
  const col1 = 50;
  const col2 = 300;
  const col3 = 450;
  
  firstPage.drawRectangle({
    x: col1,
    y: tableTop - 5,
    width: width - 100,
    height: 25,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  firstPage.drawText('Description', {
    x: col1 + 5,
    y: tableTop,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  firstPage.drawText('Quantity', {
    x: col2 + 5,
    y: tableTop,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  firstPage.drawText('Amount', {
    x: col3 + 5,
    y: tableTop,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos = tableTop - 30;
  
  // Line items
  const currency = customer.currency || 'BD';
  const setupFee = customer.setup_fee || 0;
  const annualRate = customer.annual_rate || customer.contract_size || 0;
  
  if (setupFee > 0) {
    firstPage.drawText('Setup & Implementation Fee', {
      x: col1 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText('1', {
      x: col2 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText(`${setupFee.toLocaleString()} ${currency}`, {
      x: col3 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPos -= 25;
  }
  
  if (annualRate > 0) {
    firstPage.drawText('Annual Service Subscription', {
      x: col1 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText('1 Year', {
      x: col2 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText(`${annualRate.toLocaleString()} ${currency}`, {
      x: col3 + 5,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPos -= 35;
  }
  
  // Total line
  firstPage.drawLine({
    start: { x: col3, y: yPos + 10 },
    end: { x: width - 50, y: yPos + 10 },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  yPos -= 15;
  
  const total = setupFee + annualRate;
  
  firstPage.drawText('TOTAL:', {
    x: col2 + 5,
    y: yPos,
    size: 13,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  firstPage.drawText(`${total.toLocaleString()} ${currency}`, {
    x: col3 + 5,
    y: yPos,
    size: 13,
    font: boldFont,
    color: rgb(DOO_PURPLE[0] / 255, DOO_PURPLE[1] / 255, DOO_PURPLE[2] / 255),
  });
  
  yPos -= 45;
  
  // Payment Terms
  firstPage.drawText('Payment Terms:', {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 20;
  
  const paymentDays = customer.payment_terms_days || 14;
  firstPage.drawText(`Payment due within ${paymentDays} days of invoice date.`, {
    x: 50,
    y: yPos,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  const footerText = 'DOO • www.doo.com • info@doo.com';
  drawFooter(firstPage, footerText, regularFont, 1);

  return await pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { customer_id, document_types, format, options } = await req.json();

    console.log('[EDGE-FUNCTION] Generating documents:', {
      customer_id,
      document_types,
      format,
      options
    });

    // Fetch customer data
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    // Fetch DOO logo from storage
    let dooLogoBytes: Uint8Array | null = null;
    try {
      const { data: logoData } = await supabaseAdmin.storage
        .from('customer-documents')
        .download('templates/doo-logo-official.png');
      
      if (logoData) {
        dooLogoBytes = new Uint8Array(await logoData.arrayBuffer());
        console.log('[EDGE-FUNCTION] DOO logo loaded successfully');
      }
    } catch (logoError) {
      console.log('[EDGE-FUNCTION] Could not load DOO logo, will use text fallback');
    }

    // Fetch customer logo if available
    let customerLogoBytes: Uint8Array | null = null;
    if (customer.logo) {
      try {
        const logoPath = customer.logo.replace('customer-avatars/', '');
        const { data: custLogoData } = await supabaseAdmin.storage
          .from('customer-avatars')
          .download(logoPath);
        
        if (custLogoData) {
          customerLogoBytes = new Uint8Array(await custLogoData.arrayBuffer());
          console.log('[EDGE-FUNCTION] Customer logo loaded successfully');
        }
      } catch (custLogoError) {
        console.log('[EDGE-FUNCTION] Could not load customer logo:', custLogoError);
      }
    }

    const generatedDocs = [];
    const errors = [];

    for (const docType of document_types) {
      try {
        console.log(`[EDGE-FUNCTION] Generating ${docType}...`);
        
        let pdfBytes;
        if (docType === 'proposal') {
          pdfBytes = await generateProposal(customer, dooLogoBytes, customerLogoBytes);
        } else if (docType === 'service_agreement') {
          pdfBytes = await generateProposal(customer, dooLogoBytes, customerLogoBytes);
        } else if (docType === 'sla') {
          pdfBytes = await generateSLA(customer, dooLogoBytes, customerLogoBytes);
        } else if (docType === 'quotation') {
          pdfBytes = await generateInvoice(customer, dooLogoBytes, customerLogoBytes);
        } else {
          throw new Error(`Unknown document type: ${docType}`);
        }

        const fileName = `${customer_id}/${docType}_${Date.now()}.pdf`;
        
        // Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from('customer-documents')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get signed URL
        const { data: urlData } = await supabaseAdmin.storage
          .from('customer-documents')
          .createSignedUrl(fileName, 3600);

        if (!urlData) {
          throw new Error('Failed to generate download URL');
        }

        // Insert record
        const { error: insertError } = await supabaseAdmin
          .from('generated_documents')
          .insert({
            customer_id,
            document_type: docType,
            file_path: fileName,
            format: 'pdf',
            generated_by: user.id,
            metadata: { options }
          });

        if (insertError) {
          console.error('Error inserting record:', insertError);
        }

        generatedDocs.push({
          type: docType,
          file_path: fileName,
          download_url: urlData.signedUrl,
          generated_at: new Date().toISOString()
        });

        console.log(`[EDGE-FUNCTION] Successfully generated ${docType}`);
        
      } catch (error: any) {
        console.error(`[EDGE-FUNCTION] Error generating ${docType}:`, error);
        errors.push(`Failed to generate ${docType}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: generatedDocs.length > 0,
        documents: generatedDocs,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[EDGE-FUNCTION] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        documents: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
