-- Insert the uploaded document that didn't get saved to the database
-- Using the most recent upload based on the storage data
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
  '6c25168d-d412-4e20-b794-9f1e76d6a66d'
);