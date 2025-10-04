// Document generation types
export interface GeneratedDocument {
  id: string;
  customer_id: string;
  document_type: 'proposal' | 'service_agreement' | 'sla' | 'quotation';
  file_path: string;
  format: 'pdf' | 'docx';
  generated_at: string;
  generated_by?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export type GeneratedDocumentInsert = Omit<GeneratedDocument, 'id' | 'created_at' | 'updated_at' | 'generated_at'>;
export type GeneratedDocumentUpdate = Partial<GeneratedDocumentInsert>;

export interface DocumentGenerationRequest {
  customer_id: string;
  document_types: Array<'proposal' | 'service_agreement' | 'sla' | 'quotation'>;
  format: 'pdf' | 'docx';
  options?: {
    include_logo?: boolean;
    custom_fields?: Record<string, any>;
  };
}

export interface DocumentGenerationResponse {
  success: boolean;
  documents: Array<{
    type: string;
    file_path: string;
    download_url: string;
    generated_at: string;
  }>;
  errors?: string[];
}

export const DOCUMENT_LABELS = {
  proposal: 'Customer Proposal',
  service_agreement: 'Service Agreement',
  sla: 'Service Level Agreement',
  quotation: 'Invoice/Quotation'
} as const;
