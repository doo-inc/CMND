import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { unlinkContractFromPartnership, calculateContractValue } from "@/utils/partnershipRevenue";

interface ContractWithCustomer {
  id: string;
  name: string;
  customer_id: string;
  status?: string | null;
  start_date?: string;
  customer?: {
    id: string;
    name: string;
  };
  [key: string]: any;
}

interface LinkedContractsTableProps {
  contracts: ContractWithCustomer[];
  onContractUnlinked: () => void;
}

export const LinkedContractsTable = ({ contracts, onContractUnlinked }: LinkedContractsTableProps) => {
  const [unlinkingContractId, setUnlinkingContractId] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlinkContract = async () => {
    if (!unlinkingContractId) return;

    setIsUnlinking(true);
    try {
      await unlinkContractFromPartnership(unlinkingContractId);
      toast.success("Contract unlinked from partnership");
      onContractUnlinked();
      setUnlinkingContractId(null);
    } catch (error) {
      toast.error("Failed to unlink contract");
      console.error(error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'expired':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No contracts linked yet. Click "Link Contract" above to get started.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contract Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell>
                  <Link
                    to={`/customers/${contract.customer_id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    {contract.customer?.name || "Unknown Customer"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{contract.name}</TableCell>
                <TableCell className="font-semibold">
                  ${calculateContractValue(contract).toLocaleString()}
                </TableCell>
                <TableCell>
                  {contract.status && (
                    <Badge variant="secondary" className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {contract.start_date ? format(new Date(contract.start_date), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnlinkingContractId(contract.id)}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!unlinkingContractId} onOpenChange={(open) => !open && setUnlinkingContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this contract from the partnership? This will remove the revenue attribution but won't delete the contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkContract} disabled={isUnlinking}>
              {isUnlinking ? "Unlinking..." : "Unlink Contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
