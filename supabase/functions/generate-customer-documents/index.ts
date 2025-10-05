import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DOO Brand Colors
const DOO_PINK = rgb(0.91, 0.47, 0.98);
const DOO_PURPLE = rgb(0.61, 0.53, 0.96);
const DOO_DARK = rgb(0.13, 0.13, 0.13);
const DOO_GRAY = rgb(0.5, 0.5, 0.5);
const DOO_WHITE = rgb(1, 1, 1);

const PRICING_PLANS = [
  { name: "Starter", responses: "5,000", price: "3,000" },
  { name: "Growth", responses: "10,000", price: "5,400" },
  { name: "Pro", responses: "25,000", price: "10,500" },
  { name: "Scale", responses: "50,000", price: "18,000" },
  { name: "Enterprise", responses: "100,000", price: "30,000" },
  { name: "Large Enterprise", responses: "250,000", price: "Custom" }
];

async function drawGradientHeader(page: any, logoBytes: Uint8Array, pdfDoc: any) {
  const { width, height } = page.getSize();
  
  // Draw gradient background (simulate with overlapping rectangles)
  for (let i = 0; i < 50; i++) {
    const ratio = i / 50;
    const r = 0.91 - (ratio * 0.30);
    const g = 0.47 + (ratio * 0.06);
    const b = 0.98 - (ratio * 0.02);
    
    page.drawRectangle({
      x: 0,
      y: height - 120 + (i * 2.4),
      width: width,
      height: 2.4,
      color: rgb(r, g, b),
      opacity: 0.3,
    });
  }
  
  // Embed and draw logo
  try {
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoScale = 0.15;
    const logoWidth = logoImage.width * logoScale;
    const logoHeight = logoImage.height * logoScale;
    
    page.drawImage(logoImage, {
      x: 40,
      y: height - 100,
      width: logoWidth,
      height: logoHeight,
    });
  } catch (error) {
    console.error('Error embedding logo:', error);
  }
}

function drawFooter(page: any, text: string, font: any) {
  const { width } = page.getSize();
  
  page.drawText('DOO Technologies | CR: 173610-1', {
    x: 40,
    y: 30,
    size: 9,
    font: font,
    color: DOO_GRAY,
  });
  
  page.drawText(text, {
    x: width - 150,
    y: 30,
    size: 9,
    font: font,
    color: DOO_GRAY,
  });
}

async function generateProposal(customer: any, logoBytes: Uint8Array) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Page 1: Cover & Introduction
  let page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  page.drawText('CUSTOMER PROPOSAL', {
    x: 40,
    y: 680,
    size: 32,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  page.drawText(`Prepared for: ${customer.name}`, {
    x: 40,
    y: 640,
    size: 16,
    font: font,
    color: DOO_DARK,
  });
  
  page.drawText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
    x: 40,
    y: 615,
    size: 12,
    font: font,
    color: DOO_GRAY,
  });
  
  // Introduction
  const introY = 550;
  page.drawText('1. INTRODUCTION', {
    x: 40,
    y: introY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  const introText = `DOO Technologies is pleased to present this proposal for ${customer.name}. Our AI-powered\nsolution is designed to transform your business operations and enhance customer\nexperiences through cutting-edge artificial intelligence technology.`;
  
  let currentY = introY - 30;
  introText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 1 of 7', font);
  
  // Page 2: Company Overview
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('2. ABOUT DOO TECHNOLOGIES', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const aboutText = `DOO Technologies (CR: 173610-1) is a leading provider of AI-powered solutions,\nspecializing in intelligent automation and customer engagement platforms.\n\nOur mission is to empower businesses with state-of-the-art AI technology that\ndrives efficiency, reduces costs, and enhances customer satisfaction.\n\nKey Differentiators:\n• Advanced AI models trained on industry-specific data\n• Scalable infrastructure supporting millions of interactions\n• 99.9% uptime guarantee with enterprise-grade security\n• Dedicated support team and account management`;
  
  aboutText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: line.startsWith('•') ? font : font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 2 of 7', font);
  
  // Page 3: Solution Overview
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('3. SOLUTION OVERVIEW', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const solutionText = `Our AI Response Platform provides intelligent, context-aware responses to customer\ninquiries, automating support operations while maintaining high quality standards.\n\nCore Features:\n• Natural Language Processing (NLP) for human-like interactions\n• Multi-language support with automatic translation\n• Integration with existing CRM and ticketing systems\n• Real-time analytics and performance dashboards\n• Customizable AI training for your specific business needs\n• Mobile-responsive interface for on-the-go management\n\nBenefits:\n• Reduce response time by up to 90%\n• Handle 24/7 customer inquiries without additional staffing\n• Improve customer satisfaction scores\n• Lower operational costs while scaling support capacity`;
  
  solutionText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: line.startsWith('•') ? font : font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 3 of 7', font);
  
  // Page 4: Implementation Plan
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('4. IMPLEMENTATION PLAN', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const implementationText = `Phase 1: Discovery & Setup (Week 1-2)\n• Requirement gathering and system analysis\n• API integration planning\n• Initial AI model configuration\n\nPhase 2: Development & Training (Week 3-4)\n• Custom AI training with your data\n• System integration and testing\n• User acceptance testing (UAT)\n\nPhase 3: Deployment & Go-Live (Week 5-6)\n• Production deployment\n• Staff training sessions\n• Performance monitoring and optimization\n\nPhase 4: Ongoing Support\n• 24/7 technical support\n• Regular performance reviews\n• Continuous AI model improvements`;
  
  implementationText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: line.startsWith('•') || line.startsWith('Phase') ? boldFont : font,
      color: line.startsWith('Phase') ? DOO_PURPLE : DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 4 of 7', font);
  
  // Page 5: Pricing & Terms
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('5. INVESTMENT & PRICING', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const setupFee = customer.setup_fee || 300;
  const annualRate = customer.annual_rate || 10500;
  
  page.drawText(`Setup Fee: ${customer.currency || 'BD'} ${setupFee.toLocaleString()}`, {
    x: 40,
    y: currentY,
    size: 14,
    font: boldFont,
    color: DOO_DARK,
  });
  
  currentY -= 25;
  page.drawText(`Annual Subscription: ${customer.currency || 'BD'} ${annualRate.toLocaleString()}`, {
    x: 40,
    y: currentY,
    size: 14,
    font: boldFont,
    color: DOO_DARK,
  });
  
  currentY -= 40;
  const termsText = `Payment Terms:\n• Setup fee payable upon contract signing\n• Annual subscription billed ${customer.payment_terms_days || 14} days from go-live date\n• Payment accepted via bank transfer or check\n• Late payments subject to 1.5% monthly interest\n\nContract Terms:\n• Initial term: 12 months from go-live date\n• Auto-renewal unless 60 days written notice provided\n• Price lock guarantee for initial term\n• Flexible upgrade options available`;
  
  termsText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: line.startsWith('•') ? font : boldFont,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 5 of 7', font);
  
  // Page 6: Support & SLA Summary
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('6. SUPPORT & SERVICE LEVELS', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const supportText = `Support Coverage:\n• 24/7 technical support via email and phone\n• Dedicated account manager\n• Quarterly business reviews\n• Priority response for critical issues\n\nService Level Commitments:\n• 99.9% platform uptime guarantee\n• Critical issues: 1-hour response time\n• High priority: 4-hour response time\n• Standard issues: 24-hour response time\n\nTraining & Documentation:\n• Comprehensive user documentation\n• Video tutorials and knowledge base\n• Live training sessions for staff\n• Regular webinars on new features`;
  
  supportText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: line.endsWith(':') ? boldFont : font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 6 of 7', font);
  
  // Page 7: Next Steps & Signature
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('7. NEXT STEPS', {
    x: 40,
    y: currentY,
    size: 18,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const nextStepsText = `We are excited about the opportunity to work with ${customer.name}.\n\nTo proceed:\n1. Review this proposal and the attached Service Level Agreement\n2. Sign and return the Service Agreement\n3. Submit initial payment to begin implementation\n4. Schedule kickoff meeting with our implementation team\n\nThis proposal is valid for 30 days from the date above.\n\nThank you for considering DOO Technologies as your AI solutions partner.\nWe look forward to driving your digital transformation.`;
  
  nextStepsText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  currentY -= 40;
  page.drawText('For questions or clarifications, please contact:', {
    x: 40,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_DARK,
  });
  
  currentY -= 25;
  page.drawText('DOO Technologies', {
    x: 40,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  currentY -= 18;
  page.drawText('Email: info@doo.tech | Phone: +973-xxxx-xxxx', {
    x: 40,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  drawFooter(page, 'Page 7 of 7', font);
  
  return await pdfDoc.save();
}

async function generateSLA(customer: any, logoBytes: Uint8Array) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Page 1: Cover & Overview
  let page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  page.drawText('SERVICE LEVEL AGREEMENT', {
    x: 40,
    y: 680,
    size: 28,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  page.drawText(`Between DOO Technologies and ${customer.name}`, {
    x: 40,
    y: 640,
    size: 14,
    font: font,
    color: DOO_DARK,
  });
  
  page.drawText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
    x: 40,
    y: 615,
    size: 12,
    font: font,
    color: DOO_GRAY,
  });
  
  let currentY = 550;
  page.drawText('1. AGREEMENT OVERVIEW', {
    x: 40,
    y: currentY,
    size: 16,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const overviewText = `This Service Level Agreement ("SLA") is entered into by and between DOO Technologies\n(CR: 173610-1), hereinafter referred to as "Provider", and ${customer.name},\nhereinafter referred to as "Client".\n\nThis SLA governs the provision of AI Response Platform services and defines the\nservice levels, support commitments, and performance metrics that Provider commits\nto deliver to Client.\n\nEffective Date: ${new Date().toLocaleDateString('en-US')}\nTerm: 12 months from go-live date, auto-renewing annually`;
  
  overviewText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: font,
      color: DOO_DARK,
    });
    currentY -= 18;
  });
  
  drawFooter(page, 'Page 1 of 4', font);
  
  // Page 2: Service Availability & Performance
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('2. SERVICE AVAILABILITY COMMITMENT', {
    x: 40,
    y: currentY,
    size: 16,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const availabilityText = `2.1 Uptime Guarantee\nProvider commits to maintaining 99.9% platform uptime, measured monthly.\nUptime is calculated as: (Total minutes - Downtime minutes) / Total minutes × 100%\n\nExcluded from downtime calculations:\n• Scheduled maintenance windows (announced 48 hours in advance)\n• Client's internet connectivity issues\n• Force majeure events beyond Provider's control\n• Issues caused by Client's improper use or modifications\n\n2.2 Performance Standards\n• API response time: < 200ms for 95% of requests\n• AI response generation: < 2 seconds average\n• System capacity: Support for contracted response volume\n• Data backup: Daily automated backups with 30-day retention\n\n2.3 Monitoring\nProvider continuously monitors system health, performance metrics, and uptime\nusing enterprise-grade monitoring tools.`;
  
  availabilityText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 10,
      font: line.startsWith('2.') ? boldFont : font,
      color: DOO_DARK,
    });
    currentY -= 16;
  });
  
  drawFooter(page, 'Page 2 of 4', font);
  
  // Page 3: Support Services
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('3. SUPPORT SERVICES', {
    x: 40,
    y: currentY,
    size: 16,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const supportText = `3.1 Support Channels\nClient can access support through:\n• Email: support@doo.tech (24/7 monitored)\n• Phone: +973-xxxx-xxxx (Business hours: 8 AM - 6 PM Bahrain time)\n• Web Portal: support.doo.tech (24/7 self-service)\n• Dedicated account manager (assigned within 5 business days)\n\n3.2 Response Time Commitments\n\nCritical Priority (System Down / Major Impact)\n• Initial Response: Within 1 hour\n• Status Updates: Every 2 hours until resolved\n• Resolution Target: Within 4 hours\n\nHigh Priority (Significant Impact)\n• Initial Response: Within 4 hours\n• Status Updates: Every 8 hours\n• Resolution Target: Within 24 hours\n\nMedium Priority (Minor Impact)\n• Initial Response: Within 24 hours\n• Resolution Target: Within 5 business days\n\nLow Priority (General Inquiries)\n• Initial Response: Within 48 hours\n• Resolution Target: Within 10 business days\n\n3.3 Escalation Process\nIf issue resolution exceeds committed timeframes, Client may escalate through:\nLevel 1: Support Team → Level 2: Technical Lead → Level 3: VP of Operations`;
  
  supportText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 9,
      font: line.match(/^3\.|Priority|Level/) ? boldFont : font,
      color: DOO_DARK,
    });
    currentY -= 14;
  });
  
  drawFooter(page, 'Page 3 of 4', font);
  
  // Page 4: Service Credits & Terms
  page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  currentY = 700;
  page.drawText('4. SERVICE CREDITS', {
    x: 40,
    y: currentY,
    size: 16,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  const creditsText = `If Provider fails to meet the 99.9% uptime guarantee, Client is entitled to service\ncredits calculated as follows:\n\nMonthly Uptime          Service Credit\n99.0% - 99.9%          5% of monthly fee\n95.0% - 98.9%          15% of monthly fee\nBelow 95.0%            25% of monthly fee\n\nService credits are Client's sole remedy for uptime failures and must be claimed\nwithin 30 days of the incident.\n\n5. LIMITATIONS & EXCLUSIONS\n\nProvider is not liable for service interruptions caused by:\n• Third-party service failures (internet providers, cloud infrastructure)\n• Client's equipment, network, or software issues\n• Unauthorized access or security breaches not caused by Provider\n• Client's failure to follow documented procedures\n• Modifications to the system not performed by Provider\n\n6. AGREEMENT TERMS\n\nThis SLA remains in effect for the duration of the Service Agreement.\nProvider reserves the right to modify SLA terms with 60 days written notice.\nAny modifications materially reducing service levels require Client consent.`;
  
  creditsText.split('\n').forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 10,
      font: line.match(/^\d\./) ? boldFont : font,
      color: DOO_DARK,
    });
    currentY -= 16;
  });
  
  currentY -= 30;
  page.drawText('DOO Technologies | CR: 173610-1', {
    x: 40,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  drawFooter(page, 'Page 4 of 4', font);
  
  return await pdfDoc.save();
}

async function generateInvoice(customer: any, logoBytes: Uint8Array) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  await drawGradientHeader(page, logoBytes, pdfDoc);
  
  page.drawText('INVOICE / QUOTATION', {
    x: 40,
    y: 680,
    size: 28,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  // Invoice details
  let currentY = 630;
  page.drawText(`Invoice Date: ${new Date().toLocaleDateString('en-US')}`, {
    x: 40,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  currentY -= 20;
  page.drawText(`Invoice #: INV-${Date.now().toString().slice(-8)}`, {
    x: 40,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  currentY -= 20;
  page.drawText(`Due Date: ${new Date(Date.now() + (customer.payment_terms_days || 14) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')}`, {
    x: 40,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  // Company info box
  currentY = 630;
  page.drawText('FROM:', {
    x: 350,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 20;
  const fromInfo = [
    'DOO Technologies',
    'CR: 173610-1',
    'Kingdom of Bahrain',
    'Email: billing@doo.tech',
    'Phone: +973-xxxx-xxxx'
  ];
  
  fromInfo.forEach(line => {
    page.drawText(line, {
      x: 350,
      y: currentY,
      size: 10,
      font: font,
      color: DOO_DARK,
    });
    currentY -= 16;
  });
  
  // Bill to
  currentY = 530;
  page.drawText('BILL TO:', {
    x: 40,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 20;
  const billToInfo = [
    customer.name,
    customer.legal_address || customer.country || 'Address on file',
    customer.contact_name ? `Attn: ${customer.contact_name}` : '',
    customer.contact_email || '',
  ].filter(Boolean);
  
  billToInfo.forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 10,
      font: font,
      color: DOO_DARK,
    });
    currentY -= 16;
  });
  
  // Items table
  currentY = 420;
  
  // Table header
  page.drawRectangle({
    x: 40,
    y: currentY - 5,
    width: 515,
    height: 25,
    color: DOO_PURPLE,
    opacity: 0.1,
  });
  
  page.drawText('DESCRIPTION', {
    x: 50,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  page.drawText('QUANTITY', {
    x: 320,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  page.drawText('AMOUNT', {
    x: 450,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 30;
  
  // Determine selected plan (default to Pro if not specified)
  const selectedPlan = PRICING_PLANS[2]; // Pro plan
  const setupFee = customer.setup_fee || 300;
  const currency = customer.currency || 'BD';
  
  // Parse annual rate or use plan price
  let annualPrice = customer.annual_rate || 10500;
  if (typeof selectedPlan.price === 'string' && selectedPlan.price !== 'Custom') {
    annualPrice = parseInt(selectedPlan.price.replace(',', ''));
  }
  
  // Line items
  const lineItems = [
    {
      desc: `${selectedPlan.name} Plan - ${selectedPlan.responses} AI Responses/Year`,
      qty: '1',
      amount: annualPrice
    },
    {
      desc: 'Setup & Implementation Fee',
      qty: '1',
      amount: setupFee
    }
  ];
  
  lineItems.forEach(item => {
    page.drawText(item.desc, {
      x: 50,
      y: currentY,
      size: 10,
      font: font,
      color: DOO_DARK,
    });
    
    page.drawText(item.qty, {
      x: 335,
      y: currentY,
      size: 10,
      font: font,
      color: DOO_DARK,
    });
    
    page.drawText(`${currency} ${item.amount.toLocaleString()}`, {
      x: 450,
      y: currentY,
      size: 10,
      font: font,
      color: DOO_DARK,
    });
    
    currentY -= 25;
  });
  
  // Totals
  currentY -= 20;
  const subtotal = annualPrice + setupFee;
  const tax = 0; // Update if VAT applies
  const total = subtotal + tax;
  
  page.drawLine({
    start: { x: 40, y: currentY },
    end: { x: 555, y: currentY },
    thickness: 1,
    color: DOO_GRAY,
  });
  
  currentY -= 25;
  page.drawText('Subtotal:', {
    x: 380,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  page.drawText(`${currency} ${subtotal.toLocaleString()}`, {
    x: 450,
    y: currentY,
    size: 11,
    font: font,
    color: DOO_DARK,
  });
  
  currentY -= 25;
  page.drawText('Total Amount Due:', {
    x: 350,
    y: currentY,
    size: 12,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  page.drawText(`${currency} ${total.toLocaleString()}`, {
    x: 450,
    y: currentY,
    size: 12,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  // Payment info
  currentY -= 50;
  page.drawText('PAYMENT INFORMATION', {
    x: 40,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  currentY -= 25;
  const paymentInfo = [
    'Bank Transfer Details:',
    'Bank: [Bank Name]',
    'Account Name: DOO Technologies',
    'Account Number: [Account Number]',
    'IBAN: [IBAN Number]',
    'Swift Code: [Swift Code]',
    '',
    `Payment Terms: Net ${customer.payment_terms_days || 14} days`,
    'Late payments subject to 1.5% monthly interest charge'
  ];
  
  paymentInfo.forEach(line => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 9,
      font: line.endsWith(':') ? boldFont : font,
      color: DOO_DARK,
    });
    currentY -= 14;
  });
  
  currentY -= 10;
  page.drawText('Thank you for your business!', {
    x: 40,
    y: currentY,
    size: 11,
    font: boldFont,
    color: DOO_PURPLE,
  });
  
  drawFooter(page, 'Invoice', font);
  
  return await pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
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
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    // Fetch DOO logo
    const logoResponse = await fetch('https://vnhwhyufevcixgelsujb.supabase.co/storage/v1/object/public/customer-avatars/doo-logo.png');
    const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());

    const generatedDocs = [];
    const errors = [];

    for (const docType of document_types) {
      try {
        console.log(`[EDGE-FUNCTION] Generating ${docType}...`);
        
        let pdfBytes;
        switch (docType) {
          case 'proposal':
            pdfBytes = await generateProposal(customer, logoBytes);
            break;
          case 'sla':
            pdfBytes = await generateSLA(customer, logoBytes);
            break;
          case 'quotation':
            pdfBytes = await generateInvoice(customer, logoBytes);
            break;
          default:
            throw new Error(`Unknown document type: ${docType}`);
        }

        const fileName = `${customer_id}/${docType}_${Date.now()}.pdf`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get signed URL
        const { data: urlData } = await supabase.storage
          .from('customer-documents')
          .createSignedUrl(fileName, 3600);

        if (!urlData) {
          throw new Error('Failed to generate download URL');
        }

        // Insert record
        const { error: insertError } = await supabase
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
