import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://cdn.skypack.dev/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentGenerationRequest {
  customer_id: string;
  document_types: Array<'proposal' | 'service_agreement' | 'sla' | 'quotation'>;
  format: 'pdf';
  options?: {
    include_logo?: boolean;
    custom_fields?: Record<string, any>;
  };
}

// Helper to add wrapped text to PDF
const drawWrappedText = (
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  color: any = rgb(0, 0, 0)
) => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  const lineHeight = size + 4;

  for (const word of words) {
    const testLine = line + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, size);
    
    if (testWidth > maxWidth && line !== '') {
      page.drawText(line.trim(), { x, y: currentY, size, font, color });
      line = word + ' ';
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  
  if (line.trim()) {
    page.drawText(line.trim(), { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  
  return currentY;
};

const generateProposalPDF = async (customer: any, logoImage: any) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let yPos = height - 80;

  // Header with logo
  if (logoImage) {
    page.drawImage(logoImage, { x: (width - 100) / 2, y: yPos, width: 100, height: 50 });
    yPos -= 70;
  }

  // Title
  page.drawText('BUSINESS PROPOSAL', {
    x: 50, y: yPos, size: 24, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 35;

  // Client info
  page.drawText(`Prepared for: ${customer.name || 'N/A'}`, {
    x: 50, y: yPos, size: 12, font: boldFont
  });
  yPos -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: 50, y: yPos, size: 10, font
  });
  yPos -= 35;

  // Horizontal line
  page.drawLine({ start: { x: 50, y: yPos }, end: { x: width - 50, y: yPos }, thickness: 2, color: rgb(0, 0.4, 0.8) });
  yPos -= 25;

  // Client Information Section
  page.drawText('CLIENT INFORMATION', {
    x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 20;

  const clientInfo = [
    `Company: ${customer.name || 'N/A'}`,
    `Industry: ${customer.industry || 'N/A'}`,
    `Contact: ${customer.contact_name || 'N/A'}`,
    `Email: ${customer.contact_email || 'N/A'}`,
    `Phone: ${customer.contact_phone || 'N/A'}`,
    `Country: ${customer.country || 'N/A'}`
  ];

  for (const info of clientInfo) {
    page.drawText(info, { x: 70, y: yPos, size: 10, font });
    yPos -= 15;
  }
  yPos -= 10;

  // Proposed Solution
  page.drawText('PROPOSED SOLUTION', {
    x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 20;

  const description = customer.description || 
    'Comprehensive AI-powered solution tailored to your business needs, including advanced analytics, automation capabilities, and seamless integration with existing systems.';
  
  yPos = drawWrappedText(page, description, 70, yPos, width - 140, font, 10);
  yPos -= 20;

  // Key Features
  page.drawText('Key Features:', { x: 70, y: yPos, size: 10, font: boldFont });
  yPos -= 15;

  const features = [
    'AI-Powered Analytics and Insights',
    'Automated Workflow Management',
    'Real-time Data Processing',
    'Custom Integration Support',
    `24/7 Technical Support (${customer.segment || 'Enterprise'} Tier)`
  ];

  for (const feature of features) {
    page.drawText(`• ${feature}`, { x: 85, y: yPos, size: 9, font });
    yPos -= 14;
  }
  yPos -= 15;

  // Investment Summary
  page.drawText('INVESTMENT SUMMARY', {
    x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 25;

  // Pricing table
  const currency = customer.currency || 'BD';
  const setupFee = (customer.setup_fee || 0).toLocaleString();
  const annualRate = (customer.annual_rate || 0).toLocaleString();
  const total = (customer.contract_size || 0).toLocaleString();

  page.drawRectangle({ x: 70, y: yPos - 75, width: width - 140, height: 95, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
  
  // Table headers
  page.drawText('Description', { x: 80, y: yPos, size: 10, font: boldFont });
  page.drawText(`Amount (${currency})`, { x: width - 180, y: yPos, size: 10, font: boldFont });
  yPos -= 20;

  page.drawLine({ start: { x: 70, y: yPos }, end: { x: width - 70, y: yPos }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  yPos -= 15;

  // Table rows
  page.drawText('Setup & Implementation Fee', { x: 80, y: yPos, size: 9, font });
  page.drawText(setupFee, { x: width - 150, y: yPos, size: 9, font });
  yPos -= 15;

  page.drawText('Annual Service Fee', { x: 80, y: yPos, size: 9, font });
  page.drawText(annualRate, { x: width - 150, y: yPos, size: 9, font });
  yPos -= 20;

  page.drawLine({ start: { x: 70, y: yPos }, end: { x: width - 70, y: yPos }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  yPos -= 15;

  page.drawText('Total First Year Investment', { x: 80, y: yPos, size: 10, font: boldFont });
  page.drawText(total, { x: width - 150, y: yPos, size: 10, font: boldFont });
  yPos -= 25;

  page.drawText(`Payment Terms: Net ${customer.payment_terms_days || 14} days`, {
    x: 70, y: yPos, size: 9, font
  });
  yPos -= 15;

  if (customer.go_live_date) {
    page.drawText(`Go-Live Date: ${customer.go_live_date}`, {
      x: 70, y: yPos, size: 9, font
    });
  }

  return pdfDoc;
};

const generateServiceAgreementPDF = async (customer: any, logoImage: any) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPos = height - 60;

  // Header with logo
  if (logoImage) {
    page.drawImage(logoImage, { x: 50, y: yPos, width: 80, height: 40 });
  }

  page.drawText('SERVICE AGREEMENT', {
    x: (width - 200) / 2, y: yPos + 10, size: 20, font: boldFont
  });
  yPos -= 60;

  page.drawText(`Agreement Date: ${new Date().toLocaleDateString()}`, {
    x: 50, y: yPos, size: 10, font
  });
  yPos -= 30;

  // Parties section
  page.drawRectangle({
    x: 50, y: yPos - 80, width: width - 100, height: 90,
    color: rgb(0.96, 0.96, 0.96), borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 1
  });

  page.drawText('THIS AGREEMENT is made on ' + new Date().toLocaleDateString(), {
    x: 60, y: yPos, size: 9, font: boldFont
  });
  yPos -= 15;

  page.drawText('BETWEEN:', { x: 60, y: yPos, size: 9, font: boldFont });
  yPos -= 12;

  page.drawText('Party A: Service Provider (hereinafter referred to as "Provider")', {
    x: 60, y: yPos, size: 9, font
  });
  yPos -= 12;

  page.drawText(`Party B: ${customer.name || '[CLIENT NAME]'} (hereinafter referred to as "Client")`, {
    x: 60, y: yPos, size: 9, font
  });
  yPos -= 12;

  page.drawText(`Registration Number: ${customer.company_registration_number || 'N/A'}`, {
    x: 60, y: yPos, size: 8, font
  });
  yPos -= 10;

  page.drawText(`Registered Address: ${customer.legal_address || 'N/A'}`, {
    x: 60, y: yPos, size: 8, font
  });
  yPos -= 10;

  page.drawText(`Representative: ${customer.representative_name || 'N/A'}, ${customer.representative_title || 'N/A'}`, {
    x: 60, y: yPos, size: 8, font
  });
  yPos -= 30;

  // Clauses
  const clauses = [
    {
      title: '1. SERVICES',
      content: 'The Provider agrees to provide AI-powered software solutions and related support services to the Client in accordance with this Agreement.'
    },
    {
      title: '2. TERM',
      content: `This Agreement shall commence on ${customer.go_live_date || '[START DATE]'} and continue for an initial period of 12 months, subject to renewal.`
    },
    {
      title: '3. FEES AND PAYMENT',
      content: `Setup Fee: ${customer.currency || 'BD'} ${(customer.setup_fee || 0).toLocaleString()}. Annual Service Fee: ${customer.currency || 'BD'} ${(customer.annual_rate || 0).toLocaleString()}. Payment terms: Net ${customer.payment_terms_days || 14} days.`
    },
    {
      title: '4. CONFIDENTIALITY',
      content: 'Both parties agree to maintain strict confidentiality of all proprietary information exchanged during the term of this Agreement.'
    }
  ];

  for (const clause of clauses) {
    if (yPos < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      yPos = height - 50;
    }

    page.drawText(clause.title, { x: 50, y: yPos, size: 11, font: boldFont });
    yPos -= 15;

    yPos = drawWrappedText(page, clause.content, 70, yPos, width - 140, font, 9);
    yPos -= 20;
  }

  // Signature section
  if (yPos < 150) {
    const newPage = pdfDoc.addPage([595, 842]);
    yPos = height - 50;
  }

  yPos -= 20;
  page.drawText('SIGNATURES', { x: 50, y: yPos, size: 12, font: boldFont });
  yPos -= 30;

  // Provider signature
  page.drawText('For the Provider:', { x: 70, y: yPos, size: 10, font: boldFont });
  yPos -= 50;
  page.drawLine({ start: { x: 70, y: yPos }, end: { x: 250, y: yPos }, thickness: 1 });
  yPos -= 15;
  page.drawText('Signature & Date', { x: 70, y: yPos, size: 8, font });

  // Client signature
  yPos += 65;
  page.drawText('For the Client:', { x: 320, y: yPos, size: 10, font: boldFont });
  yPos -= 50;
  page.drawLine({ start: { x: 320, y: yPos }, end: { x: 500, y: yPos }, thickness: 1 });
  yPos -= 15;
  page.drawText(`${customer.representative_name || 'Name'}, ${customer.representative_title || 'Title'}`, {
    x: 320, y: yPos, size: 8, font
  });

  return pdfDoc;
};

const generateSLAPDF = async (customer: any, logoImage: any) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPos = height - 60;

  // Header with logo
  if (logoImage) {
    page.drawImage(logoImage, { x: 50, y: yPos, width: 80, height: 40 });
  }

  page.drawText('SERVICE LEVEL AGREEMENT (SLA)', {
    x: 50, y: yPos - 20, size: 20, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 80;

  page.drawText(`Effective Date: ${new Date().toLocaleDateString()}`, {
    x: 50, y: yPos, size: 10, font
  });
  yPos -= 30;

  // Client information box
  page.drawRectangle({
    x: 50, y: yPos - 70, width: width - 100, height: 80,
    color: rgb(0.94, 0.97, 1), borderColor: rgb(0, 0.4, 0.8), borderWidth: 2
  });

  page.drawText('CLIENT INFORMATION', { x: 60, y: yPos, size: 11, font: boldFont, color: rgb(0, 0.4, 0.8) });
  yPos -= 15;
  page.drawText(`Client: ${customer.name || 'N/A'}`, { x: 60, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText(`Service Tier: ${customer.segment || 'Enterprise'}`, { x: 60, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText(`Contact: ${customer.contact_name || 'N/A'} (${customer.contact_email || 'N/A'})`, {
    x: 60, y: yPos, size: 9, font
  });
  yPos -= 12;
  page.drawText(`Contract Start: ${customer.go_live_date || 'N/A'}`, { x: 60, y: yPos, size: 9, font });
  yPos -= 35;

  // Service Availability
  page.drawText('SERVICE AVAILABILITY', { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0.4, 0.8) });
  yPos -= 15;
  page.drawText('• Uptime Guarantee: 99.9% monthly uptime', { x: 70, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText('• Planned Maintenance: Announced 48 hours in advance', { x: 70, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText('• Maximum Planned Downtime: 4 hours per month', { x: 70, y: yPos, size: 9, font });
  yPos -= 25;

  // Support Response Times Table
  page.drawText('SUPPORT RESPONSE TIMES', { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0.4, 0.8) });
  yPos -= 20;

  const tableData = [
    ['Priority', 'Description', 'Response', 'Resolution'],
    ['P1 - Critical', 'Service unavailable', '15 min', '4 hours'],
    ['P2 - High', 'Major issues', '1 hour', '8 hours'],
    ['P3 - Medium', 'Minor issues', '4 hours', '24 hours'],
    ['P4 - Low', 'General inquiries', '8 hours', '3 days']
  ];

  const colWidths = [100, 180, 80, 80];
  const tableX = 50;
  let tableY = yPos;

  // Draw table
  for (let i = 0; i < tableData.length; i++) {
    const row = tableData[i];
    const isHeader = i === 0;
    
    if (isHeader) {
      page.drawRectangle({
        x: tableX, y: tableY - 12, width: colWidths.reduce((a, b) => a + b), height: 14,
        color: rgb(0, 0.4, 0.8)
      });
    }
    
    let colX = tableX + 5;
    for (let j = 0; j < row.length; j++) {
      page.drawText(row[j], {
        x: colX, y: tableY, size: isHeader ? 8 : 7,
        font: isHeader ? boldFont : font,
        color: isHeader ? rgb(1, 1, 1) : rgb(0, 0, 0)
      });
      
      // Draw column border
      if (j < row.length - 1) {
        page.drawLine({
          start: { x: colX + colWidths[j] - 5, y: tableY + 10 },
          end: { x: colX + colWidths[j] - 5, y: tableY - 12 },
          thickness: 0.5, color: rgb(0.7, 0.7, 0.7)
        });
      }
      
      colX += colWidths[j];
    }
    
    // Draw row border
    if (i < tableData.length - 1) {
      page.drawLine({
        start: { x: tableX, y: tableY - 12 },
        end: { x: tableX + colWidths.reduce((a, b) => a + b), y: tableY - 12 },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7)
      });
    }
    
    tableY -= 14;
  }

  yPos = tableY - 20;

  // Support Channels
  page.drawText('SUPPORT CHANNELS', { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0.4, 0.8) });
  yPos -= 15;
  const channels = [
    'Email Support: Available 24/7',
    'Phone Support: Business hours (9 AM - 6 PM)',
    'Emergency Hotline: 24/7 for P1 issues',
    'Portal Access: 24/7 ticket management'
  ];
  for (const channel of channels) {
    page.drawText(`• ${channel}`, { x: 70, y: yPos, size: 9, font });
    yPos -= 12;
  }

  return pdfDoc;
};

const generateQuotationPDF = async (customer: any, logoImage: any) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPos = height - 60;

  // Header - Logo on right
  page.drawText('QUOTATION', { x: 50, y: yPos, size: 24, font: boldFont, color: rgb(0, 0.4, 0.8) });
  
  if (logoImage) {
    page.drawImage(logoImage, { x: width - 130, y: yPos - 10, width: 80, height: 40 });
  }
  
  yPos -= 45;

  // Quote info
  const quoteNum = `QT-${Date.now().toString().slice(-6)}`;
  page.drawText(`Quote #: ${quoteNum}`, { x: 50, y: yPos, size: 10, font });
  yPos -= 15;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: yPos, size: 10, font });
  yPos -= 15;
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  page.drawText(`Valid Until: ${validUntil.toLocaleDateString()}`, { x: 50, y: yPos, size: 10, font });
  yPos -= 30;

  page.drawLine({
    start: { x: 50, y: yPos }, end: { x: width - 50, y: yPos },
    thickness: 2, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 25;

  // Bill To
  page.drawText('BILL TO:', { x: 50, y: yPos, size: 11, font: boldFont, color: rgb(0, 0.4, 0.8) });
  yPos -= 18;
  page.drawText(customer.name || '[CLIENT NAME]', { x: 50, y: yPos, size: 11, font: boldFont });
  yPos -= 14;
  if (customer.legal_address) {
    page.drawText(customer.legal_address, { x: 50, y: yPos, size: 9, font });
    yPos -= 12;
  }
  page.drawText(`Contact: ${customer.contact_name || 'N/A'}`, { x: 50, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText(`Email: ${customer.contact_email || 'N/A'}`, { x: 50, y: yPos, size: 9, font });
  yPos -= 12;
  page.drawText(`Phone: ${customer.contact_phone || 'N/A'}`, { x: 50, y: yPos, size: 9, font });
  yPos -= 30;

  // Items table
  const tableStart = yPos;
  const currency = customer.currency || 'BD';

  // Table header
  page.drawRectangle({
    x: 50, y: yPos - 15, width: width - 100, height: 18,
    color: rgb(0, 0.4, 0.8)
  });
  
  page.drawText('Description', { x: 60, y: yPos, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Qty', { x: 350, y: yPos, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Unit Price', { x: 400, y: yPos, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Amount', { x: 470, y: yPos, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  yPos -= 25;

  // Item 1: Setup
  page.drawText('Setup & Implementation Services', { x: 60, y: yPos, size: 9, font: boldFont });
  yPos -= 11;
  page.drawText('Initial system configuration, data migration, and user training', {
    x: 60, y: yPos, size: 8, font, color: rgb(0.3, 0.3, 0.3)
  });
  yPos += 11;
  page.drawText('1', { x: 355, y: yPos, size: 9, font });
  const setupFee = (customer.setup_fee || 0).toLocaleString();
  page.drawText(`${currency} ${setupFee}`, { x: 400, y: yPos, size: 9, font });
  page.drawText(`${currency} ${setupFee}`, { x: 470, y: yPos, size: 9, font });
  yPos -= 25;

  // Item 2: Annual
  page.drawText(`Annual Service Subscription (${customer.segment || 'Enterprise'})`, {
    x: 60, y: yPos, size: 9, font: boldFont
  });
  yPos -= 11;
  page.drawText('Full platform access, AI analytics, and 24/7 technical support', {
    x: 60, y: yPos, size: 8, font, color: rgb(0.3, 0.3, 0.3)
  });
  yPos += 11;
  page.drawText('1', { x: 355, y: yPos, size: 9, font });
  const annualRate = (customer.annual_rate || 0).toLocaleString();
  page.drawText(`${currency} ${annualRate}`, { x: 400, y: yPos, size: 9, font });
  page.drawText(`${currency} ${annualRate}`, { x: 470, y: yPos, size: 9, font });
  yPos -= 30;

  // Totals
  page.drawLine({
    start: { x: 50, y: yPos }, end: { x: width - 50, y: yPos },
    thickness: 1, color: rgb(0.8, 0.8, 0.8)
  });
  yPos -= 15;

  const subtotal = (customer.setup_fee || 0) + (customer.annual_rate || 0);
  page.drawText('Subtotal:', { x: 400, y: yPos, size: 9, font: boldFont });
  page.drawText(`${currency} ${subtotal.toLocaleString()}`, { x: 470, y: yPos, size: 9, font });
  yPos -= 15;

  page.drawText('Tax (0%):', { x: 400, y: yPos, size: 9, font: boldFont });
  page.drawText(`${currency} 0.00`, { x: 470, y: yPos, size: 9, font });
  yPos -= 20;

  page.drawLine({
    start: { x: 390, y: yPos }, end: { x: width - 50, y: yPos },
    thickness: 2, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 15;

  page.drawRectangle({
    x: 390, y: yPos - 5, width: width - 440, height: 18,
    color: rgb(0, 0.4, 0.8)
  });
  
  page.drawText('TOTAL:', { x: 400, y: yPos, size: 11, font: boldFont, color: rgb(1, 1, 1) });
  const total = (customer.contract_size || 0).toLocaleString();
  page.drawText(`${currency} ${total}`, { x: 470, y: yPos, size: 11, font: boldFont, color: rgb(1, 1, 1) });
  yPos -= 30;

  // Payment terms
  page.drawLine({
    start: { x: 50, y: yPos }, end: { x: width - 50, y: yPos },
    thickness: 1, color: rgb(0.8, 0.8, 0.8)
  });
  yPos -= 20;

  page.drawText('PAYMENT TERMS & CONDITIONS', {
    x: 50, y: yPos, size: 11, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  yPos -= 18;

  const terms = [
    `Payment Terms: Net ${customer.payment_terms_days || 14} days from invoice date`,
    'Payment Method: Bank transfer or approved payment gateway',
    'Late Payment: 2% interest per month on overdue amounts',
    'Quote Validity: 30 days from issue date'
  ];

  for (const term of terms) {
    page.drawText(`• ${term}`, { x: 60, y: yPos, size: 8, font });
    yPos -= 12;
  }

  yPos -= 15;
  page.drawText('Thank you for your business!', {
    x: 50, y: yPos, size: 10, font: boldFont
  });

  return pdfDoc;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[DOC-GEN] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const requestBody: DocumentGenerationRequest = await req.json();
    const { customer_id, document_types, options } = requestBody;

    console.log('[DOC-GEN] Starting generation for customer:', customer_id, 'types:', document_types);

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('[DOC-GEN] Customer fetch error:', customerError);
      throw new Error('Customer not found');
    }

    console.log('[DOC-GEN] Customer retrieved:', customer.name);

    // Fetch and embed logo
    let logoImage: any = null;
    if (options?.include_logo !== false && customer.logo) {
      try {
        const { data: logoData, error: logoError } = await supabase.storage
          .from('customer-avatars')
          .download(customer.logo);
        
        if (!logoError && logoData) {
          const logoBytes = new Uint8Array(await logoData.arrayBuffer());
          
          // Try PNG first, then JPG
          const tempDoc = await PDFDocument.create();
          try {
            logoImage = await tempDoc.embedPng(logoBytes);
          } catch {
            try {
              logoImage = await tempDoc.embedJpg(logoBytes);
            } catch (err) {
              console.warn('[DOC-GEN] Logo format not supported:', err);
            }
          }
          
          console.log('[DOC-GEN] Logo loaded successfully');
        }
      } catch (logoErr) {
        console.warn('[DOC-GEN] Logo loading failed:', logoErr);
      }
    }

    const results = [];
    const errors = [];

    // Document generators
    const generators: Record<string, (customer: any, logo: any) => Promise<PDFDocument>> = {
      proposal: generateProposalPDF,
      service_agreement: generateServiceAgreementPDF,
      sla: generateSLAPDF,
      quotation: generateQuotationPDF
    };

    for (const docType of document_types) {
      try {
        console.log(`[DOC-GEN] Generating ${docType}...`);
        
        const pdfDoc = await generators[docType](customer, logoImage);
        const pdfBytes = await pdfDoc.save();
        
        console.log(`[DOC-GEN] PDF generated, size: ${pdfBytes.byteLength} bytes`);
        
        // Upload to storage
        const fileName = `${customer_id}/${docType}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(fileName);

        // Insert record into database
        const { error: dbError } = await supabase
          .from('generated_documents')
          .insert({
            customer_id,
            document_type: docType,
            file_path: fileName,
            format: 'pdf',
            generated_by: user.id,
            metadata: {
              customer_name: customer.name,
              generated_with_logo: !!logoImage,
              file_size: pdfBytes.byteLength
            }
          });

        if (dbError) {
          console.error('[DOC-GEN] Database insert error:', dbError);
        }

        results.push({
          type: docType,
          file_path: fileName,
          download_url: publicUrl,
          generated_at: new Date().toISOString()
        });

        console.log(`[DOC-GEN] Successfully generated ${docType}`);
      } catch (docError) {
        console.error(`[DOC-GEN] Error generating ${docType}:`, docError);
        errors.push(`${docType}: ${docError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: results.length > 0,
        documents: results,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[DOC-GEN] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        documents: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});