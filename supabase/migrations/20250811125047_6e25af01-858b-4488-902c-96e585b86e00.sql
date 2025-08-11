-- Insert the uploaded document with NULL uploaded_by to avoid FK constraint
INSERT INTO documents (
  customer_id,
  name,
  file_path,
  document_type,
  file_size,
  uploaded_by
) VALUES (
  'd151764a-34d7-4cd0-989f-57c94642b06c',
  'Nana proposal.pdf',
  'customers/customer-d151764a-34d7-4cd0-989f-57c94642b06c-1754916448800-Nana proposal.pdf',
  'Proposal',
  11885267,
  NULL
);