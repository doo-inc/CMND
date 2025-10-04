import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { DocumentGenerationDialog } from "./DocumentGenerationDialog";
import { GeneratedDocumentsList } from "./GeneratedDocumentsList";

interface DocumentGenerationPanelProps {
  customerId: string;
  customerName: string;
}

export const DocumentGenerationPanel = ({ customerId, customerName }: DocumentGenerationPanelProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Documents</h3>
          <p className="text-sm text-muted-foreground">
            Generate proposals, agreements, and invoices
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <FileText className="mr-2 h-5 w-5" />
          Generate Documents
        </Button>
      </div>

      <GeneratedDocumentsList 
        customerId={customerId} 
        refreshTrigger={refreshTrigger}
      />

      <DocumentGenerationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        customerName={customerName}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
