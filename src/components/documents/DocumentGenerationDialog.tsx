import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DOCUMENT_LABELS } from "@/types/documents";

interface DocumentGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { id: 'proposal', label: DOCUMENT_LABELS.proposal, description: 'Customer proposal with pricing and features' },
  { id: 'service_agreement', label: DOCUMENT_LABELS.service_agreement, description: 'Legal service agreement contract' },
  { id: 'sla', label: DOCUMENT_LABELS.sla, description: 'Service level agreement with uptime guarantees' },
  { id: 'quotation', label: DOCUMENT_LABELS.quotation, description: 'Invoice/quotation with line items' },
] as const;

export const DocumentGenerationDialog = ({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess
}: DocumentGenerationDialogProps) => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(['proposal', 'service_agreement', 'sla', 'quotation']);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<Array<{ type: string; download_url: string }>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(d => d !== docId)
        : [...prev, docId]
    );
  };

  const handleGenerate = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document type to generate.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedDocuments([]);
    setErrors([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-customer-documents', {
        body: {
          customer_id: customerId,
          document_types: selectedDocuments,
          format: 'pdf',
          options: {
            include_logo: includeLogo
          }
        }
      });

      if (error) throw error;

      if (data.success && data.documents.length > 0) {
        setGeneratedDocuments(data.documents);
        toast({
          title: "Documents generated successfully!",
          description: `${data.documents.length} document(s) created for ${customerName}`,
        });
        onSuccess?.();
      }

      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
        toast({
          title: "Some documents failed",
          description: `${data.errors.length} document(s) encountered errors`,
          variant: "destructive"
        });
      }

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

    } catch (error) {
      console.error('Document generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate documents. Please try again.",
        variant: "destructive"
      });
      setErrors([error.message || 'Unknown error']);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setGeneratedDocuments([]);
      setErrors([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Customer Documents</DialogTitle>
          <DialogDescription>
            Select document types to generate for <strong>{customerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Document Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Documents</Label>
            {DOCUMENT_TYPES.map(doc => (
              <div key={doc.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={doc.id}
                  checked={selectedDocuments.includes(doc.id)}
                  onCheckedChange={() => handleDocumentToggle(doc.id)}
                  disabled={isGenerating}
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={doc.id} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {doc.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {doc.description}
                  </p>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Checkbox
              id="include-logo"
              checked={includeLogo}
              onCheckedChange={(checked) => setIncludeLogo(!!checked)}
              disabled={isGenerating}
            />
            <Label 
              htmlFor="include-logo" 
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Include customer logo in documents
            </Label>
          </div>

          {/* Results */}
          {generatedDocuments.length > 0 && (
            <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Successfully Generated</span>
              </div>
              {generatedDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-900 rounded border">
                  <span className="text-sm font-medium">
                    {DOCUMENT_LABELS[doc.type as keyof typeof DOCUMENT_LABELS]}
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(doc.download_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                <AlertCircle className="h-5 w-5" />
                <span>Errors Occurred</span>
              </div>
              {errors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            {generatedDocuments.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          {generatedDocuments.length === 0 && (
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || selectedDocuments.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate ${selectedDocuments.length} Document${selectedDocuments.length !== 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
