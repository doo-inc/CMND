import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { linkContractToPartnership, calculateContractValue } from "@/utils/partnershipRevenue";

interface ContractWithCustomer {
  id: string;
  name: string;
  customer_id: string;
  status?: string | null;
  customer?: {
    id: string;
    name: string;
    logo?: string | null;
  };
  [key: string]: any;
}

interface LinkContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnershipId: string;
  partnershipName: string;
  availableContracts: ContractWithCustomer[];
  onContractLinked: () => void;
}

export const LinkContractDialog = ({
  open,
  onOpenChange,
  partnershipId,
  partnershipName,
  availableContracts,
  onContractLinked,
}: LinkContractDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const filteredContracts = availableContracts.filter((contract) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.name.toLowerCase().includes(searchLower) ||
      contract.customer?.name.toLowerCase().includes(searchLower)
    );
  });

  const handleLinkContract = async (contractId: string, contractName: string) => {
    setIsLinking(true);
    try {
      await linkContractToPartnership(contractId, partnershipId);
      toast.success(`Contract "${contractName}" linked to ${partnershipName}`);
      onContractLinked();
      onOpenChange(false);
      setSearchTerm("");
    } catch (error) {
      toast.error("Failed to link contract");
      console.error(error);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Contract to {partnershipName}</DialogTitle>
          <DialogDescription>
            Select a contract to link to this partnership. Only contracts not already linked to other partnerships are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or contract name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No contracts found matching your search" : "No available contracts to link"}
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contract.customer?.name || "Unknown Customer"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>{contract.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-primary">
                          ${calculateContractValue(contract).toLocaleString()}
                        </span>
                        {contract.status && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                            {contract.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLinkContract(contract.id, contract.name)}
                    disabled={isLinking}
                  >
                    Link
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
