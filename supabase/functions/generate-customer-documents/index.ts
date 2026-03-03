import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const DOO_PURPLE = [146/255, 68/255, 255/255];
const DOO_LIGHT_PURPLE = [180/255, 120/255, 255/255];
const DOO_WHITE = [1, 1, 1];

// Sanitize text for PDF embedding - strip control chars and limit length
function sanitizeText(text: unknown, maxLength = 500): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Remove control characters except newline/tab, limit length
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().substring(0, maxLength);
}

// Sanitize customer object fields before use in PDF
function sanitizeCustomer(customer: Record<string, unknown>): Record<string, unknown> {
  const textFields = [
    'name', 'contact_name', 'contact_email', 'contact_phone',
    'company_registration_number', 'legal_address', 'representative_name',
    'representative_title', 'industry', 'country', 'description', 'currency'
  ];
  const sanitized = { ...customer };
  for (const field of textFields) {
    if (sanitized[field] != null) {
      sanitized[field] = sanitizeText(sanitized[field], field === 'description' ? 2000 : 500);
    }
  }
  return sanitized;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function drawProfessionalHeader(page: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null, pdfDoc: any) {
  const { width, height } = page.getSize();
  const gradientHeight = 80;
  const gradientSteps = 200; // More steps for smoother gradient
  
  // Smooth horizontal gradient: purple (right) to black with low opacity (left)
  for (let i = 0; i < gradientSteps; i++) {
    const x = (i * width / gradientSteps);
    const ratio = i / gradientSteps;
    
    // Purple on right (ratio = 1), black on left (ratio = 0)
    const r = 0 + (DOO_PURPLE[0] * ratio);
    const g = 0 + (DOO_PURPLE[1] * ratio);
    const b = 0 + (DOO_PURPLE[2] * ratio);
    const opacity = 0.15 + (0.25 * ratio); // Low opacity: 0.15 to 0.4
    
    page.drawRectangle({ 
      x: x, 
      y: height - gradientHeight, 
      width: (width / gradientSteps) + 1, 
      height: gradientHeight, 
      color: rgb(r, g, b),
      opacity: opacity
    });
  }

  // DOO logo - positioned properly for formal documents
  try {
    const dooLogoImage = await pdfDoc.embedPng(dooLogoBytes);
    const originalWidth = dooLogoImage.width;
    const originalHeight = dooLogoImage.height;
    // Scale to reasonable size (max 120px width)
    const scale = Math.min(120 / originalWidth, 1);
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;
    // Position: a bit to the left and down for formal placement
    page.drawImage(dooLogoImage, { 
      x: 30, 
      y: height - 105, 
      width: scaledWidth, 
      height: scaledHeight 
    });
    console.log('DOO logo embedded successfully:', scaledWidth, 'x', scaledHeight);
  } catch (e) {
    console.error('DOO logo embedding error:', e);
  }

  if (customerLogoBytes) {
    try {
      const customerLogoImage = await pdfDoc.embedPng(customerLogoBytes);
      const customerLogoDims = customerLogoImage.scale(0.1);
      page.drawImage(customerLogoImage, { x: width - 110, y: height - 70, width: customerLogoDims.width, height: customerLogoDims.height });
    } catch (e) { 
      console.error('Customer logo error:', e); 
    }
  }
}

function drawFooter(page: any, font: any, pageNumber: number) {
  const { width } = page.getSize();
  page.drawText(`Page ${pageNumber}`, { x: 50, y: 30, font, size: 9, color: rgb(0, 0, 0) });
  page.drawText('www.doo.ooo | hello@doo.ooo', { x: width - 200, y: 30, font, size: 9, color: rgb(0, 0, 0) });
}

function formatCurrency(amount: number, currency: string = 'BD') {
  return `${amount.toLocaleString()} ${currency}`;
}

async function generateProposal(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Page 1: Cover
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page1.getSize();
  
  // Center the title
  const titleText = 'AI CX PROPOSAL';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 36);
  const titleX = (pageWidth - titleWidth) / 2;
  page1.drawText(titleText, { x: titleX, y: 420, font: boldFont, size: 36, color: rgb(0, 0, 0) });
  
  // Add customer name below title
  const customerText = `Prepared for ${customer.name}`;
  const customerTextWidth = font.widthOfTextAtSize(customerText, 18);
  const customerX = (pageWidth - customerTextWidth) / 2;
  page1.drawText(customerText, { x: customerX, y: 380, font, size: 18, color: rgb(0, 0, 0) });
  
  if (customer.industry) {
    const industryText = `${customer.industry} Industry`;
    const industryWidth = font.widthOfTextAtSize(industryText, 14);
    const industryX = (pageWidth - industryWidth) / 2;
    page1.drawText(industryText, { x: industryX, y: 355, font, size: 14, color: rgb(0.3, 0.3, 0.3) });
  }
  
  drawFooter(page1, font, 1);

  // Page 2: About DOO & Customer-Specific Context
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  page2.drawText('DOO: Innovative AI Solutions for Customer Service', { x: 50, y: 720, font: boldFont, size: 16, color: rgb(0, 0, 0) });
  page2.drawText('and Marketing', { x: 50, y: 700, font: boldFont, size: 16, color: rgb(0, 0, 0) });
  
  let y = 670;
  
  // Add personalized intro
  const industryContext = customer.industry ? ` in the ${customer.industry} sector` : '';
  const personalizedIntro = [
    `Dear ${customer.contact_name || customer.name},`,
    '',
    `We're excited to present this AI-powered customer experience solution specifically tailored`,
    `for ${customer.name}${industryContext}. This proposal outlines how DOO's innovative platform`,
    'can transform your customer interactions and drive business growth.',
  ];
  personalizedIntro.forEach(line => { page2.drawText(line, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) }); y -= 18; });
  
  y -= 10;
  const aboutLines = [
    'DOO is an innovative platform that leverages the power of AI to enhance customer',
    'service and marketing for businesses. Our goal is to help companies streamline their',
    'customer interactions, boost engagement, and improve sales processes using advanced',
    'AI technology.',
    '',
    'We believe in providing ongoing, personalized support that helps businesses operate',
    'more efficiently and connect with their customers whenever and wherever they need.',
  ];
  aboutLines.forEach(line => { page2.drawText(line, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) }); y -= 18; });
  
  y -= 10;
  page2.drawText("Here's what we offer:", { x: 50, y, font: boldFont, size: 13, color: rgb(0, 0, 0) });
  y -= 25;
  page2.drawText('• AI-Powered Customer Service: Automate responses on popular messaging', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page2.drawText('  platforms like WhatsApp and Instagram, so you can respond to your customers', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page2.drawText('  quickly and effectively.', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 20;
  page2.drawText('• Custom AI Agents: We create personalized AI agents that fit the unique needs', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page2.drawText('  and voice of your business.', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  
  y -= 30;
  const finalLines = [
    'At DOO, we ensure that customer interactions are instant and personalized, with support',
    'for multiple languages, creating a smooth experience for everyone. Our solutions not only',
    'enhance service quality but also help reduce operational costs.',
    '',
    'We primarily serve businesses that want to elevate their customer experience through',
    'automation, making it easier to meet the needs of their clients.',
  ];
  finalLines.forEach(line => { page2.drawText(line, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) }); y -= 18; });
  drawFooter(page2, font, 2);

  // Page 3: Problem & Advantages (Personalized)
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  page3.drawText(`How ${customer.name} Can Benefit`, { x: 50, y: 720, font: boldFont, size: 18, color: rgb(0, 0, 0) });
  
  y = 685;
  page3.drawText('THE CHALLENGE', { x: 50, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  y -= 20;
  page3.drawText('Overwhelmed Teams | Missed Opportunities | Lack of Insights', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  
  y -= 30;
  page3.drawText(`WHY ${customer.name.toUpperCase()} NEEDS DOO`, { x: 50, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  y -= 25;
  page3.drawText('Streamlined Operations', { x: 50, y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
  y -= 18;
  page3.drawText(`Help ${customer.name} reduce response times and operational costs while optimizing`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page3.drawText('service delivery across all customer touchpoints.', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  y -= 25;
  page3.drawText('Aligned Values', { x: 50, y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
  y -= 18;
  page3.drawText(`Our AI agents will be customized to mirror ${customer.name}'s unique brand personality`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page3.drawText('and values in every customer interaction.', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  y -= 25;
  page3.drawText('Continuous Improvement', { x: 50, y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
  y -= 18;
  page3.drawText("Utilize DOO's AI-driven insights to continually enhance service offerings and adapt to", { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page3.drawText(`${customer.name}'s evolving customer needs.`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  drawFooter(page3, font, 3);

  // Page 4: AI Agents Tailored for Customer
  const page4 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page4, dooLogoBytes, customerLogoBytes, pdfDoc);
  page4.drawText(`AI Agents Designed for ${customer.name}`, { x: 50, y: 720, font: boldFont, size: 18, color: rgb(0, 0, 0) });
  
  y = 680;
  page4.drawText(`Our AI agents will be customized specifically for ${customer.name}'s unique needs,`, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page4.drawText('automating customer interactions across all channels:', { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  
  y -= 30;
  const features = ['Order Status Tracking', 'Frequently Asked Questions', 'Action Processing & Transactions', 'Product Information & Recommendations', 'Problem Solving & Support', 'Customer Feedback Collection'];
  features.forEach(f => { page4.drawText(`• ${f}`, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) }); y -= 22; });
  
  y -= 20;
  page4.drawText(`Unified Inbox for ${customer.name}'s Team`, { x: 50, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  y -= 20;
  page4.drawText('All customer conversations across WhatsApp, Instagram, email, and other channels', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page4.drawText('unified in one powerful dashboard for seamless team collaboration.', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  drawFooter(page4, font, 4);

  // Page 5: Features for Customer's Success
  const page5 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page5, dooLogoBytes, customerLogoBytes, pdfDoc);
  page5.drawText(`Empowering ${customer.name} with Advanced Features`, { x: 50, y: 720, font: boldFont, size: 16, color: rgb(0, 0, 0) });
  
  y = 680;
  page5.drawText('Customer Pulse - AI-Driven CX Optimization', { x: 50, y, font: boldFont, size: 13, color: rgb(0, 0, 0) });
  y -= 22;
  page5.drawText(`${customer.name} will have access to real-time monitoring of AI performance and customer`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page5.drawText('sentiment across all channels. Use actionable insights to continuously improve customer', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page5.drawText('satisfaction and service quality.', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  y -= 30;
  page5.drawText(`Personalized AI Control for ${customer.name}`, { x: 50, y, font: boldFont, size: 13, color: rgb(0, 0, 0) });
  y -= 22;
  page5.drawText(`Customize your AI agents' voice to match ${customer.name}'s brand personality. Adjust`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page5.drawText('interaction styles, response patterns, and ensure they provide a consistent and branded', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 16;
  page5.drawText('customer experience across all channels.', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  drawFooter(page5, font, 5);

  // Page 6: OMLAQ - Perfect for Customer's Region
  const page6 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page6, dooLogoBytes, customerLogoBytes, pdfDoc);
  page6.drawText('OMLAQ - Arabic Dialects Engine', { x: 50, y: 720, font: boldFont, size: 18, color: rgb(0, 0, 0) });
  
  y = 680;
  const regionContext = customer.country ? ` This is particularly relevant for ${customer.name} serving customers in ${customer.country}.` : '';
  const omlaqLines = [
    'OMLAQ is our Large Language Layer that is culturally aware, understands & speaks',
    `in Arabic dialects.${regionContext}`,
    '',
    `For ${customer.name}, this means:`,
    '• Authentic conversations in local dialects: Najdi, Bahraini, Kuwaiti, and more',
    '• 8 specialized models, each tuned for regional authenticity and local culture',
    '• Enterprise-grade reliability running on Microsoft Azure',
    '• Already live and trusted by leading regional businesses',
    '',
    'OMLAQ Voice - Multi-Channel Dialect Support:',
    `${customer.name}'s customers can interact naturally in their own dialect through:`,
    '• Phone conversations with natural dialect recognition',
    '• Self-service kiosks with voice interaction',
    '• In-vehicle assistance systems',
    '• Any customer touchpoint—no rigid menus, no scripts, just authentic connection',
  ];
  omlaqLines.forEach(line => { page6.drawText(line, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) }); y -= 18; });
  
  y -= 20;
  page6.drawText(`We look forward to partnering with ${customer.name} to transform your`, { x: 50, y, font: boldFont, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page6.drawText('customer experience with AI-powered solutions.', { x: 50, y, font: boldFont, size: 11, color: rgb(0, 0, 0) });
  drawFooter(page6, font, 6);

  return pdfDoc;
}

async function generateServiceAgreement(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Page 1
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page1.getSize();
  const titleText = 'Service Agreement';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 24);
  const titleX = (pageWidth - titleWidth) / 2;
  page1.drawText(titleText, { x: titleX, y: 720, font: boldFont, size: 24, color: rgb(0, 0, 0) });
  
  let y = 680;
  page1.drawText(`This Service Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} ("Effective Date")`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page1.drawText('by and between:', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  y -= 30;
  page1.drawText('Party A: DOO Technology Solutions, a company incorporated under the laws of the Kingdom', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('of Bahrain, with commercial registration number 173610-1 having its principal place of business', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('at Office 39, Building 111, Road 385, Block 304, Manama Center, Kingdom of Bahrain', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('("Service Provider"); and', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText(`Party B: ${customer.name}, ${customer.company_registration_number ? 'Company Registration No.: ' + customer.company_registration_number : ''}`, { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText(`Located at: ${customer.legal_address || 'N/A'}`, { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText(`Represented herein by: ${customer.representative_name || customer.contact_name || 'N/A'} ("Client").`, { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText('Collectively referred to as the "Parties" and individually as a "Party."', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText('1. Scope of Services', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('The Service Provider shall deliver artificial intelligence (AI) solutions, systems, and related', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('services as described in Schedule A (Services Description).', { x: 50, y, font, size: 10 });
  
  drawFooter(page1, font, 1);

  return pdfDoc;
}

async function generateSLA(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page1.getSize();
  const titleText = 'Service Level Agreement';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 24);
  const titleX = (pageWidth - titleWidth) / 2;
  page1.drawText(titleText, { x: titleX, y: 720, font: boldFont, size: 24, color: rgb(0, 0, 0) });
  
  let y = 680;
  page1.drawText(`This Service Level Agreement is prepared for ${customer.name}`, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  
  y -= 30;
  page1.drawText('1. Service Availability', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('DOO commits to maintaining 99.9% uptime for all AI services.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText('2. Response Times', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('Critical issues: 1 hour response time', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('High priority: 4 hours response time', { x: 50, y, font, size: 10 });
  y -= 16;
  page1.drawText('Normal priority: 24 hours response time', { x: 50, y, font, size: 10 });
  
  drawFooter(page1, font, 1);

  return pdfDoc;
}

async function generateInvoice(customer: any, contract: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page1.getSize();
  const titleText = 'Quotation';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 24);
  const titleX = (pageWidth - titleWidth) / 2;
  page1.drawText(titleText, { x: titleX, y: 720, font: boldFont, size: 24, color: rgb(0, 0, 0) });
  
  let y = 680;
  page1.drawText(`Prepared for: ${customer.name}`, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  y -= 20;
  page1.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
  
  if (contract) {
    y -= 30;
    page1.drawText('Contract Details:', { x: 50, y, font: boldFont, size: 12 });
    y -= 20;
    page1.drawText(`Contract: ${contract.name}`, { x: 50, y, font, size: 10 });
    y -= 16;
    page1.drawText(`Value: ${formatCurrency(contract.value, customer.currency || 'BD')}`, { x: 50, y, font, size: 10 });
  }
  
  drawFooter(page1, font, 1);

  return pdfDoc;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ AUTHENTICATION ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("generate-customer-documents: Invalid token or user not found", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`generate-customer-documents: Authenticated user ${user.id}`);

    // ============ AUTHORIZATION - ROLE CHECK ============
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("generate-customer-documents: Could not verify user role", profileError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Could not verify user role" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only admins and managers should generate legal documents
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      console.error(`generate-customer-documents: User ${user.id} has role '${profile.role}' - access denied`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin or manager access required to generate documents" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`generate-customer-documents: User ${user.id} authorized with role '${profile.role}'`);
    // ============ END AUTHORIZATION ============

    const body = await req.json();
    const { customer_id, document_types, format = 'pdf' } = body;

    // Input validation
    if (!customer_id || typeof customer_id !== 'string' || customer_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Valid customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(customer_id)) {
      return new Response(
        JSON.stringify({ error: 'customer_id must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!document_types || !Array.isArray(document_types)) {
      return new Response(
        JSON.stringify({ error: 'document_types array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate document types
    const allowedDocTypes = ['proposal', 'service_agreement', 'sla', 'quotation'];
    const invalidTypes = document_types.filter((t: unknown) => typeof t !== 'string' || !allowedDocTypes.includes(t as string));
    if (invalidTypes.length > 0 || document_types.length === 0 || document_types.length > 10) {
      return new Response(
        JSON.stringify({ error: `Invalid document types. Allowed: ${allowedDocTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating documents for customer ${customer_id}:`, document_types);

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize customer data before PDF generation
    const sanitizedCustomer = sanitizeCustomer(customer as Record<string, unknown>);

    // Fetch latest active contract
    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch DOO logo
    const dooLogoUrl = `${supabaseUrl}/storage/v1/object/public/lovable-uploads/doo-logo-official.png`;
    let dooLogoBytes: Uint8Array;
    try {
      const logoResponse = await fetch(dooLogoUrl);
      if (logoResponse.ok) {
        dooLogoBytes = new Uint8Array(await logoResponse.arrayBuffer());
      } else {
        throw new Error('Failed to fetch DOO logo');
      }
    } catch (e) {
      console.error('Error fetching DOO logo:', e);
      // Use a placeholder
      dooLogoBytes = new Uint8Array([]);
    }

    // Fetch customer logo if available
    let customerLogoBytes: Uint8Array | null = null;
    if (customer.logo) {
      try {
        const customerLogoResponse = await fetch(customer.logo);
        if (customerLogoResponse.ok) {
          customerLogoBytes = new Uint8Array(await customerLogoResponse.arrayBuffer());
        }
      } catch (e) {
        console.error('Error fetching customer logo:', e);
      }
    }

    const generatedDocs: Array<{
      type: string;
      file_path: string;
      file_name: string;
    }> = [];

    for (const docType of document_types) {
      try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let finalDoc;
        switch (docType) {
          case 'proposal':
            finalDoc = await generateProposal(sanitizedCustomer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'service_agreement':
            finalDoc = await generateServiceAgreement(sanitizedCustomer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'sla':
            finalDoc = await generateSLA(sanitizedCustomer, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          case 'quotation':
            finalDoc = await generateInvoice(sanitizedCustomer, contract, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
            break;
          default:
            console.log(`Unknown document type: ${docType}`);
            continue;
        }

        const pdfBytes = await finalDoc.save();
        const fileName = `${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${docType}_${Date.now()}.pdf`;
        const filePath = `${customer_id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Error uploading ${docType}:`, uploadError);
          continue;
        }

        // Record in generated_documents table
        await supabase.from('generated_documents').insert({
          customer_id,
          document_type: docType,
          file_path: filePath,
          format: 'pdf',
          generated_by: user.id,
        });

        generatedDocs.push({
          type: docType,
          file_path: filePath,
          file_name: fileName,
        });

        console.log(`Generated ${docType} for ${customer.name}`);
      } catch (docError) {
        console.error(`Error generating ${docType}:`, docError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documents: generatedDocs,
        customer_name: customer.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-customer-documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
