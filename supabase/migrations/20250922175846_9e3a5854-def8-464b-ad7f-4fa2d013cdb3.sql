-- Insert the existing Dome Design documents that are in storage but missing from database
INSERT INTO documents (customer_id, name, file_path, document_type, file_size, uploaded_by) VALUES
('f624f9b0-cabe-48ed-aea9-5e9981f68c79', 'DOME Invoice.pdf', 'customers/customer-f624f9b0-cabe-48ed-aea9-5e9981f68c79-1758563834534-DOME Invoice.pdf', 'invoice', 125765, NULL),
('f624f9b0-cabe-48ed-aea9-5e9981f68c79', 'Dome Service Ageement.docx', 'customers/customer-f624f9b0-cabe-48ed-aea9-5e9981f68c79-1758563838735-Dome Service Ageement.docx', 'contract', 303647, NULL);