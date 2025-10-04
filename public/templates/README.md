# Document Templates

This folder contains the PDF templates used for generating customer documents.

## Templates Included

1. **proposal_template.pdf** - Customer Proposal (7 pages)
   - Company overview, features, pricing
   
2. **service_agreement_template.pdf** - Service Agreement (4 pages)
   - Legal contract with terms and conditions
   
3. **sla_template.pdf** - Service Level Agreement (4 pages)
   - SLA with uptime guarantees and support levels
   
4. **quotation_template.pdf** - Invoice/Quotation (1 page)
   - Billing details with itemized breakdown

## Usage

These templates are used by the `generate-customer-documents` edge function to create customized documents for customers. The edge function:

1. Loads the base template PDF
2. Overlays customer-specific data
3. Embeds the customer logo (if available)
4. Saves the generated document to Supabase Storage

## Important Notes

For the edge function to access these templates, they need to be uploaded to the Supabase Storage bucket `customer-documents` under the `templates/` folder.

### To upload templates to storage:

1. Go to Supabase Dashboard → Storage → customer-documents bucket
2. Create a folder named `templates`
3. Upload all 4 PDF files from this directory to that folder

Alternatively, the edge function has a fallback that creates basic PDFs with customer data overlays if templates are not found in storage.
