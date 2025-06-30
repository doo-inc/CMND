
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/components/documents/DocumentUpload";
import { useToast } from "@/hooks/use-toast";

export function useDocumentManager(entityId?: string, entityType: "customer" | "partnership" = "customer") {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load existing documents
  useEffect(() => {
    if (!entityId) return;

    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const tableName = entityType === "customer" ? "documents" : "partnership_documents";
        const columnName = entityType === "customer" ? "customer_id" : "partnership_id";

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq(columnName, entityId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading documents:', error);
          return;
        }

        if (data) {
          const mappedDocuments: Document[] = data.map(doc => ({
            id: doc.id,
            name: doc.name,
            file_path: doc.file_path,
            document_type: doc.document_type,
            file_size: doc.file_size,
            created_at: doc.created_at
          }));
          setDocuments(mappedDocuments);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [entityId, entityType]);

  // Save documents to database
  const saveDocuments = async (entityId: string, documentsToSave: Document[]) => {
    try {
      const tableName = entityType === "customer" ? "documents" : "partnership_documents";
      const columnName = entityType === "customer" ? "customer_id" : "partnership_id";

      // Get existing documents in database
      const { data: existingDocs } = await supabase
        .from(tableName)
        .select('id, file_path')
        .eq(columnName, entityId);

      const existingFilePaths = new Set(existingDocs?.map(doc => doc.file_path) || []);
      const newDocuments = documentsToSave.filter(doc => !doc.id && !existingFilePaths.has(doc.file_path));

      // Insert new documents
      if (newDocuments.length > 0) {
        if (entityType === "customer") {
          const documentsToInsert = newDocuments.map(doc => ({
            customer_id: entityId,
            name: doc.name,
            file_path: doc.file_path,
            document_type: doc.document_type,
            file_size: doc.file_size
          }));

          const { error } = await supabase
            .from('documents')
            .insert(documentsToInsert);

          if (error) {
            console.error('Error saving documents:', error);
            toast({
              title: "Error saving documents",
              description: "Some documents may not have been saved properly.",
              variant: "destructive"
            });
          }
        } else {
          const documentsToInsert = newDocuments.map(doc => ({
            partnership_id: entityId,
            name: doc.name,
            file_path: doc.file_path,
            document_type: doc.document_type,
            file_size: doc.file_size
          }));

          const { error } = await supabase
            .from('partnership_documents')
            .insert(documentsToInsert);

          if (error) {
            console.error('Error saving documents:', error);
            toast({
              title: "Error saving documents",
              description: "Some documents may not have been saved properly.",
              variant: "destructive"
            });
          }
        }
      }

      // Update existing documents (for document type changes)
      const existingDocsToUpdate = documentsToSave.filter(doc => doc.id);
      for (const doc of existingDocsToUpdate) {
        const { error } = await supabase
          .from(tableName)
          .update({
            document_type: doc.document_type,
            name: doc.name
          })
          .eq('id', doc.id);

        if (error) {
          console.error('Error updating document:', error);
        }
      }

    } catch (error) {
      console.error('Error in saveDocuments:', error);
      toast({
        title: "Error",
        description: "Failed to save documents.",
        variant: "destructive"
      });
    }
  };

  return {
    documents,
    setDocuments,
    isLoading,
    saveDocuments
  };
}
