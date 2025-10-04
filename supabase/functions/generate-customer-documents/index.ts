import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb } from "https://cdn.skypack.dev/pdf-lib@1.17.1";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody: DocumentGenerationRequest = await req.json();
    const { customer_id, document_types, options } = requestBody;

    console.log('Generating documents for customer:', customer_id, 'types:', document_types);

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    console.log('Customer data retrieved:', customer.name);

    // Fetch customer logo if exists
    let logoBytes: Uint8Array | null = null;
    if (options?.include_logo !== false && customer.logo) {
      try {
        const { data: logoData, error: logoError } = await supabase.storage
          .from('customer-avatars')
          .download(customer.logo);
        
        if (!logoError && logoData) {
          logoBytes = new Uint8Array(await logoData.arrayBuffer());
          console.log('Logo loaded successfully');
        }
      } catch (logoErr) {
        console.warn('Logo loading failed:', logoErr);
      }
    }

    const results = [];
    const errors = [];

    // Template mapping
    const templateMap: Record<string, string> = {
      proposal: 'proposal_template.pdf',
      service_agreement: 'service_agreement_template.pdf',
      sla: 'sla_template.pdf',
      quotation: 'quotation_template.pdf'
    };

    for (const docType of document_types) {
      try {
        console.log(`Processing ${docType}...`);
        
        // Fetch template from public/templates
        const templateUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/storage/v1/object/public/customer-documents/templates/${templateMap[docType]}`;
        
        // For now, we'll use a simpler approach - fetch the original template and add an overlay
        const templatePath = `templates/${templateMap[docType]}`;
        
        // Load base template (we'll fetch from public directory via URL)
        const baseTemplateUrl = `https://vnhwhyufevcixgelsujb.supabase.co/storage/v1/object/public/customer-documents/${templatePath}`;
        
        let pdfDoc: PDFDocument;
        try {
          const templateResponse = await fetch(baseTemplateUrl);
          if (!templateResponse.ok) {
            // If template not in storage, we'll create a basic PDF
            pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 size
            page.drawText(`${docType.toUpperCase()} - Template Not Found`, {
              x: 50,
              y: 800,
              size: 16,
            });
          } else {
            const templateBytes = await templateResponse.arrayBuffer();
            pdfDoc = await PDFDocument.load(templateBytes);
          }
        } catch (fetchErr) {
          console.warn(`Template fetch failed for ${docType}, creating new PDF:`, fetchErr);
          pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595, 842]);
          page.drawText(`${docType.toUpperCase()}`, {
            x: 50,
            y: 800,
            size: 20,
          });
        }

        // Embed logo if available
        if (logoBytes) {
          try {
            const logoImage = await pdfDoc.embedPng(logoBytes).catch(() => 
              pdfDoc.embedJpg(logoBytes)
            );
            
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            
            // Logo positioning based on document type
            const logoPositions: Record<string, { x: number; y: number; width: number; height: number }> = {
              proposal: { x: 250, y: 750, width: 100, height: 50 },
              service_agreement: { x: 30, y: 750, width: 100, height: 50 },
              sla: { x: 30, y: 750, width: 100, height: 50 },
              quotation: { x: 450, y: 750, width: 100, height: 50 }
            };
            
            const pos = logoPositions[docType] || { x: 50, y: 750, width: 100, height: 50 };
            
            firstPage.drawImage(logoImage, {
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height,
            });
            
            console.log(`Logo embedded for ${docType}`);
          } catch (logoEmbedErr) {
            console.warn(`Logo embedding failed for ${docType}:`, logoEmbedErr);
          }
        }

        // Add customer data as overlay text (simplified version)
        const firstPage = pdfDoc.getPages()[0];
        const fontSize = 10;
        
        // Add customer information overlay
        const overlayData = {
          proposal: [
            { text: `Customer: ${customer.name}`, x: 50, y: 700 },
            { text: `Contact: ${customer.contact_name || 'N/A'}`, x: 50, y: 685 },
            { text: `Email: ${customer.contact_email || 'N/A'}`, x: 50, y: 670 },
            { text: `Value: ${customer.currency || 'BD'} ${customer.contract_size || 0}`, x: 50, y: 655 },
          ],
          service_agreement: [
            { text: `Party B: ${customer.name}`, x: 50, y: 700 },
            { text: `Registration: ${customer.company_registration_number || 'N/A'}`, x: 50, y: 685 },
            { text: `Address: ${customer.legal_address || 'N/A'}`, x: 50, y: 670 },
            { text: `Representative: ${customer.representative_name || 'N/A'} (${customer.representative_title || 'N/A'})`, x: 50, y: 655 },
          ],
          sla: [
            { text: `Customer: ${customer.name}`, x: 50, y: 700 },
            { text: `Support Tier: ${customer.segment || 'Enterprise'}`, x: 50, y: 685 },
            { text: `Contact: ${customer.contact_name || 'N/A'}`, x: 50, y: 670 },
          ],
          quotation: [
            { text: `Customer: ${customer.name}`, x: 50, y: 700 },
            { text: `Date: ${new Date().toLocaleDateString()}`, x: 50, y: 685 },
            { text: `Setup Fee: ${customer.currency || 'BD'} ${customer.setup_fee || 0}`, x: 50, y: 670 },
            { text: `Annual Rate: ${customer.currency || 'BD'} ${customer.annual_rate || 0}`, x: 50, y: 655 },
            { text: `Total: ${customer.currency || 'BD'} ${customer.contract_size || 0}`, x: 50, y: 640 },
            { text: `Payment Terms: ${customer.payment_terms_days || 14} days`, x: 50, y: 625 },
          ],
        };

        const dataToOverlay = overlayData[docType as keyof typeof overlayData] || [];
        
        for (const item of dataToOverlay) {
          firstPage.drawText(item.text, {
            x: item.x,
            y: item.y,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        }

        // Save PDF
        const pdfBytes = await pdfDoc.save();
        
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
              generated_with_logo: !!logoBytes,
              template: templateMap[docType]
            }
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
        }

        results.push({
          type: docType,
          file_path: fileName,
          download_url: publicUrl,
          generated_at: new Date().toISOString()
        });

        console.log(`Successfully generated ${docType}`);
      } catch (docError) {
        console.error(`Error generating ${docType}:`, docError);
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
    console.error('Fatal error:', error);
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
