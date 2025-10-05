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
  page1.drawText(`This Service Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} ("Effective Date")`, { x: 50, y, font, size: 10, maxWidth: 495, color: rgb(0, 0, 0) });
  y -= 18;
  page1.drawText('by and between:', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  y -= 30;
  page1.drawText('Party A: DOO Technology Solutions, a company incorporated under the laws of the Kingdom', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('of Bahrain, with commercial registration number 173610-1 having its principal place of business', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('at Office 39, Building 111, Road 385, Block 304, Manama Center, Kingdom of Bahrain', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('("Service Provider"); and', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText(`Party B: ${customer.name}, ${customer.company_registration_number ? 'Company Registration No.: ' + customer.company_registration_number : ''}`, { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText(`Located at: ${customer.legal_address || 'N/A'}`, { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText(`Represented herein by: ${customer.representative_name || customer.contact_name || 'N/A'} ("Client").`, { x: 50, y, font, size: 10, maxWidth: 495 });
  
  y -= 30;
  page1.drawText('Collectively referred to as the "Parties" and individually as a "Party."', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText('1. Scope of Services', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('The Service Provider shall deliver artificial intelligence (AI) solutions, systems, and related', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('services as described in Schedule A (Services Description).', { x: 50, y, font, size: 10 });
  y -= 20;
  page1.drawText('Any additional services outside the agreed scope shall be subject to a separate written', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('agreement or addendum.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page1.drawText('2. Term & Duration', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('This Agreement shall commence on the Effective Date and shall remain in force for 12', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('months unless earlier terminated in accordance with this Agreement.', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 20;
  page1.drawText('The Agreement may be renewed upon mutual written agreement of the Parties.', { x: 50, y, font, size: 10, maxWidth: 495 });
  
  y -= 30;
  page1.drawText('3. Fees & Payment', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page1.drawText('The Client shall pay the Service Provider the fees specified in Schedule B (Fees & Payment', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('Terms).', { x: 50, y, font, size: 10 });
  y -= 20;
  page1.drawText(`Payment shall be made within ${customer.payment_terms_days || 14} days of receipt of a valid invoice.`, { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page1.drawText('Each Party shall bear its own costs not expressly covered under this Agreement.', { x: 50, y, font, size: 10, maxWidth: 495 });
  drawFooter(page1, font, 1);

  // Page 2
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  y = 720;
  
  page2.drawText('4. Intellectual Property', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page2.drawText('All pre-existing intellectual property of each Party shall remain their respective property. Unless', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('otherwise agreed, any AI systems, models, or software developed by the Service Provider under', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('this Agreement shall remain the intellectual property of the Service Provider. The Client shall', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('receive a non-exclusive, non-transferable license to use the deliverables solely for internal', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('business purposes.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page2.drawText('5. Confidentiality', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page2.drawText('Each Party agrees to keep confidential all proprietary or sensitive information received during', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('the course of this Agreement. Confidentiality obligations shall survive termination of this', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('Agreement for a period of 2 years.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page2.drawText('6. Warranties & Disclaimers', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page2.drawText('The Service Provider warrants that it will perform the Services with reasonable skill and care.', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('The Service Provider does not warrant that AI systems will be error-free or guarantee specific', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('outcomes. However, such expected outcomes are mentioned in Schedule C (Expected Outcomes).', { x: 50, y, font, size: 10, maxWidth: 495 });
  
  y -= 30;
  page2.drawText('7. Limitation of Liability', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page2.drawText('Neither Party shall be liable for indirect, incidental, or consequential damages. The Service', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText("Provider's total liability under this Agreement shall not exceed the total fees paid by the Client", { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('in the duration of the agreement preceding the claim.', { x: 50, y, font, size: 10, maxWidth: 495 });
  
  y -= 30;
  page2.drawText('8. Termination', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page2.drawText("Either Party may terminate this Agreement by giving 30 days' written notice. Either Party may", { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('terminate this Agreement immediately by written notice if the other Party commits a material', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('breach, becomes insolvent, or engages in fraud, gross negligence, willful misconduct, or', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page2.drawText('unlawful conduct.', { x: 50, y, font, size: 10 });
  drawFooter(page2, font, 2);

  // Page 3
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  y = 720;
  
  page3.drawText('9. Governing Law & Dispute Resolution', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page3.drawText('This Agreement shall be governed by the laws of the Kingdom of Bahrain. Any disputes shall be', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page3.drawText('resolved amicably between the Parties, failing which they shall be submitted to the exclusive', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page3.drawText('jurisdiction of the courts of the Kingdom of Bahrain.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page3.drawText('10. Miscellaneous', { x: 50, y, font: boldFont, size: 12 });
  y -= 20;
  page3.drawText('This Agreement constitutes the entire agreement between the Parties and supersedes all prior', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page3.drawText('understandings. Amendments must be in writing and signed by both Parties. Neither Party may', { x: 50, y, font, size: 10, maxWidth: 495 });
  y -= 16;
  page3.drawText('assign its rights or obligations without prior written consent of the other Party.', { x: 50, y, font, size: 10, maxWidth: 495 });
  
  y -= 60;
  page3.drawText('SIGNATURES', { x: 50, y, font: boldFont, size: 14 });
  y -= 40;
  page3.drawText('Party A: DOO Technology Solutions', { x: 50, y, font: boldFont, size: 11 });
  y -= 30;
  page3.drawText('Signature: _______________________', { x: 50, y, font, size: 10 });
  y -= 25;
  page3.drawText('Date: _______________________', { x: 50, y, font, size: 10 });
  
  y -= 50;
  page3.drawText(`Party B: ${customer.name}`, { x: 50, y, font: boldFont, size: 11 });
  y -= 30;
  page3.drawText('Signature: _______________________', { x: 50, y, font, size: 10 });
  y -= 25;
  page3.drawText('Date: _______________________', { x: 50, y, font, size: 10 });
  drawFooter(page3, font, 3);

  return pdfDoc;
}

async function generateSLA(customer: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  // Page 1
  const page1 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page1, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page1.getSize();
  const titleText = 'Service Level Agreement (SLA)';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 20);
  const titleX = (pageWidth - titleWidth) / 2;
  page1.drawText(titleText, { x: titleX, y: 720, font: boldFont, size: 20, color: rgb(0, 0, 0) });
  
  const customerText = `DOO Enterprise SLA for ${customer.name}`;
  const customerTextWidth = font.widthOfTextAtSize(customerText, 14);
  const customerX = (pageWidth - customerTextWidth) / 2;
  page1.drawText(customerText, { x: customerX, y: 695, font, size: 14, color: rgb(0, 0, 0) });
  
  let y = 660;
  page1.drawText('1. Overview', { x: 50, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  y -= 25;
  page1.drawText(`This Service Level Agreement ("SLA") defines the standards of service and support that ${customer.name}`, { x: 50, y, font, size: 10, maxWidth: 495, color: rgb(0, 0, 0) });
  y -= 16;
  page1.drawText('will receive from DOO Technology Solutions ("DOO"). It ensures maximum platform availability,', { x: 50, y, font, size: 10, maxWidth: 495, color: rgb(0, 0, 0) });
  y -= 16;
  page1.drawText(`rapid issue response, and a consistently high-quality experience for ${customer.name}'s customers.`, { x: 50, y, font, size: 10, maxWidth: 495, color: rgb(0, 0, 0) });
  
  y -= 30;
  page1.drawText('2. Service Commitment', { x: 50, y, font: boldFont, size: 14 });
  y -= 30;
  page1.drawText('Metric', { x: 80, y, font: boldFont, size: 10 });
  page1.drawText('Commitment', { x: 300, y, font: boldFont, size: 10 });
  y -= 20;
  page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1 });
  y -= 20;
  page1.drawText('Service Uptime', { x: 80, y, font, size: 10 });
  page1.drawText('99.999% Monthly Uptime Guarantee', { x: 300, y, font, size: 10 });
  y -= 20;
  page1.drawText('Initial Response Time', { x: 80, y, font, size: 10 });
  page1.drawText('Within 1 hour for all support tickets', { x: 300, y, font, size: 10 });
  y -= 20;
  page1.drawText('Support Availability', { x: 80, y, font, size: 10 });
  page1.drawText('24/7/365', { x: 300, y, font, size: 10 });
  y -= 30;
  page1.drawText('Service uptime is measured across DOO-managed services and channels, excluding', { x: 50, y, font, size: 9, maxWidth: 495 });
  y -= 14;
  page1.drawText('scheduled maintenance windows or client-side infrastructure issues.', { x: 50, y, font, size: 9, maxWidth: 495 });
  drawFooter(page1, font, 1);

  // Page 2
  const page2 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page2, dooLogoBytes, customerLogoBytes, pdfDoc);
  y = 720;
  
  page2.drawText('3. Support and Severity Levels', { x: 50, y, font: boldFont, size: 14 });
  y -= 30;
  page2.drawText('Severity', { x: 60, y, font: boldFont, size: 9 });
  page2.drawText('Description', { x: 150, y, font: boldFont, size: 9 });
  page2.drawText('Response', { x: 340, y, font: boldFont, size: 9 });
  page2.drawText('Resolution', { x: 440, y, font: boldFont, size: 9 });
  y -= 18;
  page2.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1 });
  y -= 18;
  
  page2.drawText('Critical (1)', { x: 60, y, font, size: 8 });
  page2.drawText('Platform down, major disruption', { x: 150, y, font, size: 8 });
  page2.drawText('1 hour', { x: 340, y, font, size: 8 });
  page2.drawText('4 hours', { x: 440, y, font, size: 8 });
  y -= 16;
  
  page2.drawText('High (2)', { x: 60, y, font, size: 8 });
  page2.drawText('Major functionality impaired', { x: 150, y, font, size: 8 });
  page2.drawText('1 hour', { x: 340, y, font, size: 8 });
  page2.drawText('8 hours', { x: 440, y, font, size: 8 });
  y -= 16;
  
  page2.drawText('Medium (3)', { x: 60, y, font, size: 8 });
  page2.drawText('Partial loss, workaround available', { x: 150, y, font, size: 8 });
  page2.drawText('1 hour', { x: 340, y, font, size: 8 });
  page2.drawText('24 hours', { x: 440, y, font, size: 8 });
  y -= 16;
  
  page2.drawText('Low (4)', { x: 60, y, font, size: 8 });
  page2.drawText('Minor issues, cosmetic defects', { x: 150, y, font, size: 8 });
  page2.drawText('1 hour', { x: 340, y, font, size: 8 });
  page2.drawText('3 biz days', { x: 440, y, font, size: 8 });
  
  y -= 30;
  page2.drawText('4. Support Channels', { x: 50, y, font: boldFont, size: 14 });
  y -= 25;
  page2.drawText('• Email Support: Dedicated enterprise email (provided during onboarding)', { x: 50, y, font, size: 10 });
  y -= 18;
  page2.drawText('• Phone Support: Dedicated enterprise hotline (provided during onboarding)', { x: 50, y, font, size: 10 });
  y -= 18;
  page2.drawText('• DOO Support Portal: Access to ticketing, status updates, and knowledge base', { x: 50, y, font, size: 10 });
  y -= 18;
  page2.drawText('• Priority Escalation: Dedicated account manager for urgent issues', { x: 50, y, font, size: 10 });
  drawFooter(page2, font, 2);

  // Page 3
  const page3 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page3, dooLogoBytes, customerLogoBytes, pdfDoc);
  y = 720;
  
  page3.drawText('5. Scheduled Maintenance', { x: 50, y, font: boldFont, size: 14 });
  y -= 25;
  page3.drawText('• Clients will be notified at least 72 hours in advance for scheduled maintenance.', { x: 50, y, font, size: 10 });
  y -= 18;
  page3.drawText('• Maintenance will be scheduled during low-traffic periods when possible.', { x: 50, y, font, size: 10 });
  y -= 18;
  page3.drawText('• Scheduled maintenance will not be counted against the uptime commitment.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page3.drawText('6. Remedies', { x: 50, y, font: boldFont, size: 14 });
  y -= 25;
  page3.drawText('If DOO fails to meet the monthly uptime commitment, clients are eligible to receive service', { x: 50, y, font, size: 10 });
  y -= 16;
  page3.drawText('credits as follows:', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page3.drawText('Uptime Achieved', { x: 100, y, font: boldFont, size: 10 });
  page3.drawText('Service Credit', { x: 300, y, font: boldFont, size: 10 });
  y -= 20;
  page3.drawLine({ start: { x: 50, y }, end: { x: 450, y }, thickness: 1 });
  y -= 20;
  page3.drawText('99.9% - 99.999%', { x: 100, y, font, size: 10 });
  page3.drawText('5% of monthly fee', { x: 300, y, font, size: 10 });
  y -= 18;
  page3.drawText('99% - 99.89%', { x: 100, y, font, size: 10 });
  page3.drawText('10% of monthly fee', { x: 300, y, font, size: 10 });
  y -= 18;
  page3.drawText('Below 99%', { x: 100, y, font, size: 10 });
  page3.drawText('20% of monthly fee', { x: 300, y, font, size: 10 });
  
  y -= 30;
  page3.drawText('Service credits must be requested within 30 days of the end of the impacted month.', { x: 50, y, font, size: 9 });
  drawFooter(page3, font, 3);

  // Page 4
  const page4 = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page4, dooLogoBytes, customerLogoBytes, pdfDoc);
  y = 720;
  
  page4.drawText('7. Exclusions', { x: 50, y, font: boldFont, size: 14 });
  y -= 25;
  page4.drawText('This SLA does not cover:', { x: 50, y, font, size: 10 });
  y -= 22;
  page4.drawText('• Client-side network issues or third-party service failures.', { x: 50, y, font, size: 10 });
  y -= 18;
  page4.drawText('• Downtime due to force majeure events.', { x: 50, y, font, size: 10 });
  y -= 18;
  page4.drawText('• Service interruptions caused by client modifications without prior DOO approval.', { x: 50, y, font, size: 10 });
  
  y -= 30;
  page4.drawText('8. Continuous Improvement', { x: 50, y, font: boldFont, size: 14 });
  y -= 25;
  page4.drawText('DOO follows a continuous improvement model, integrating:', { x: 50, y, font, size: 10 });
  y -= 22;
  page4.drawText('• Regular system upgrades', { x: 50, y, font, size: 10 });
  y -= 18;
  page4.drawText('• Security enhancements', { x: 50, y, font, size: 10 });
  y -= 18;
  page4.drawText('• Performance optimization', { x: 50, y, font, size: 10 });
  drawFooter(page4, font, 4);

  return pdfDoc;
}

async function generateInvoice(customer: any, contract: any, pdfDoc: any, font: any, boldFont: any, dooLogoBytes: Uint8Array, customerLogoBytes: Uint8Array | null) {
  const page = pdfDoc.addPage([595, 842]);
  await drawProfessionalHeader(page, dooLogoBytes, customerLogoBytes, pdfDoc);
  
  const { width: pageWidth } = page.getSize();
  const titleText = 'QUOTATION';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 28);
  const titleX = (pageWidth - titleWidth) / 2;
  page.drawText(titleText, { x: titleX, y: 720, font: boldFont, size: 28, color: rgb(0, 0, 0) });
  
  let y = 670;
  page.drawText(`ADDRESSED TO: ${customer.contact_name || customer.name}`, { x: 50, y, font: boldFont, size: 11, color: rgb(0, 0, 0) });
  y -= 25;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('Issued by: DOO Technology Solutions', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('CR: 173610-1', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  // Table
  y -= 40;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText('Description', { x: 60, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  page.drawText('Qty', { x: 300, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  page.drawText('Price', { x: 370, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  page.drawText('Total', { x: 470, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  y -= 5;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0, 0, 0) });
  y -= 20;
  
  let subtotal = 0;
  const setupFee = contract?.setup_fee || customer.setup_fee || 0;
  const annualRate = contract?.annual_rate || customer.annual_rate || 0;
  
  if (setupFee > 0) {
    page.drawText('Setup Fee', { x: 60, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText('1', { x: 300, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText(formatCurrency(setupFee, customer.currency), { x: 370, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText(formatCurrency(setupFee, customer.currency), { x: 470, y, font, size: 10, color: rgb(0, 0, 0) });
    subtotal += setupFee;
    y -= 22;
  }
  
  if (annualRate > 0) {
    const serviceName = customer.text_plan ? `${customer.text_plan} Plan x 12 Months` : 'Annual Service Fee';
    page.drawText(serviceName, { x: 60, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText('1', { x: 300, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText(formatCurrency(annualRate, customer.currency), { x: 370, y, font, size: 10, color: rgb(0, 0, 0) });
    page.drawText(formatCurrency(annualRate, customer.currency), { x: 470, y, font, size: 10, color: rgb(0, 0, 0) });
    subtotal += annualRate;
    y -= 22;
  }
  
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText('Sub-total:', { x: 370, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  page.drawText(formatCurrency(subtotal, customer.currency), { x: 470, y, font: boldFont, size: 10, color: rgb(0, 0, 0) });
  
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 25;
  page.drawText('TOTAL', { x: 60, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  page.drawText(formatCurrency(subtotal, customer.currency), { x: 470, y, font: boldFont, size: 14, color: rgb(0, 0, 0) });
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) });
  
  // Payment Method
  y -= 40;
  page.drawText('Payment Method', { x: 50, y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
  y -= 25;
  page.drawText('Bank Name: Bahrain Islamic Bank', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('Account Name: DOO Technology Solutions', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('IBAN: BH97BIBB00100002211548', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('SWIFT: BIBBBHBMXXX', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  // Terms and Conditions
  y -= 40;
  page.drawText('Terms and Conditions', { x: 50, y, font: boldFont, size: 12, color: rgb(0, 0, 0) });
  y -= 22;
  page.drawText(`Please send payment within ${customer.payment_terms_days || 14} days of receiving this invoice.`, { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  // Signature
  y -= 60;
  page.drawText('Ali Mohsen', { x: 50, y, font: boldFont, size: 11, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('CEO', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  y -= 18;
  page.drawText('www.doo.ooo', { x: 50, y, font, size: 10, color: rgb(0, 0, 0) });
  
  drawFooter(page, font, 1);

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

    // Fetch the latest active contract for pricing
    const { data: contracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const latestContract = contracts && contracts.length > 0 ? contracts[0] : null;
    console.log('Latest contract:', latestContract ? `${latestContract.id} - ${latestContract.setup_fee}/${latestContract.annual_rate}` : 'none');

    // Fetch DOO logo
    const dooLogoUrl = 'https://cdn.prod.website-files.com/68ac62e7fc79b26131535066/68ad505697774505c5b64767_doo-logo.png';
    console.log('Fetching DOO logo from:', dooLogoUrl);
    const dooLogoResponse = await fetch(dooLogoUrl);
    if (!dooLogoResponse.ok) {
      throw new Error(`Failed to fetch DOO logo: ${dooLogoResponse.status}`);
    }
    const dooLogoBytes = new Uint8Array(await dooLogoResponse.arrayBuffer());
    console.log('DOO logo fetched successfully, size:', dooLogoBytes.length, 'bytes');

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
            await generateInvoice(customer, latestContract, pdfDoc, font, boldFont, dooLogoBytes, customerLogoBytes);
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
