import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DOCUMENT_LABELS } from "@/types/documents";
import { format } from "date-fns";

interface GeneratedDocumentsListProps {
  customerId: string;
  refreshTrigger?: number;
}

interface GeneratedDocument {
  id: string;
  document_type: string;
  file_path: string;
  generated_at: string;
  metadata: any;
}

export const GeneratedDocumentsList = ({ customerId, refreshTrigger }: GeneratedDocumentsListProps) => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Failed to load documents",
        description: "Could not retrieve document history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [customerId, refreshTrigger]);

  const handleDownload = async (doc: GeneratedDocument) => {
    try {
      const { data } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(doc.file_path);

      window.open(data.publicUrl, '_blank');
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the document",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (doc: GeneratedDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeletingId(doc.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('customer-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: "The document has been removed successfully"
      });

      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the document",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>Previously generated documents</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>Previously generated documents</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No documents generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document History</CardTitle>
        <CardDescription>{documents.length} document(s) generated</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => (
          <div 
            key={doc.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {DOCUMENT_LABELS[doc.document_type as keyof typeof DOCUMENT_LABELS] || doc.document_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generated {format(new Date(doc.generated_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(doc)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
              >
                {deletingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
