import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ChurnConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  customerName: string;
  isProcessing?: boolean;
}

export const ChurnConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  customerName,
  isProcessing = false 
}: ChurnConfirmationDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Mark Customer as Churned</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to mark <strong>{customerName}</strong> as churned?
            </p>
            <p className="text-sm text-muted-foreground">
              This will:
            </p>
            <ul className="text-sm text-muted-foreground ml-4 list-disc space-y-1">
              <li>Update the customer status to "churned"</li>
              <li>Set the churn date to today</li>
              <li>Remove them from active customer metrics</li>
              <li>This action can be reversed by editing the customer</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? "Processing..." : "Mark as Churned"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};