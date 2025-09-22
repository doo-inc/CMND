import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  file_path: string;
  document_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string;
}

interface CustomerDocumentsProps {
  customerId: string;
}

export const CustomerDocuments = ({ customerId }: CustomerDocumentsProps) => {
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['customer-documents', customerId],
    queryFn: async () => {
      console.log('CustomerDocuments: Fetching documents for customer:', customerId);
      console.log('CustomerDocuments: Auth user:', await supabase.auth.getUser());
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CustomerDocuments: Error fetching documents:', error);
        console.error('CustomerDocuments: Full error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('CustomerDocuments: Fetched documents:', data?.length || 0);
      console.log('CustomerDocuments: Documents data:', data);
      return data as Document[];
    },
    enabled: !!customerId,
  });

  const downloadDocument = async (document: Document) => {
    try {
      console.log('CustomerDocuments: Downloading document:', document.file_path);
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) {
        console.error('CustomerDocuments: Error downloading document:', error);
        toast({
          title: "Error",
          description: "Failed to download document",
          variant: "destructive"
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Document downloaded successfully"
      });
    } catch (error) {
      console.error('CustomerDocuments: Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Loading customer documents...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>No documents have been uploaded for this customer yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">{doc.name}</h4>
                  <div className="text-sm text-muted-foreground">
                    <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                    {doc.file_size > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </>
                    )}
                    <span className="mx-2">•</span>
                    <span>Uploaded {formatDate(doc.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};