
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarIcon, Plus, Upload } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { customers } from "@/data/mockData";

export interface ContractData {
  id: string;
  customer: string;
  customerId?: string;
  status: "active" | "pending" | "expired" | "draft";
  type: string;
  startDate: string;
  endDate: string;
  value: string;
  documentUrl?: string;
  documentName?: string;
}

interface AddEditContractProps {
  contract?: ContractData;
  isEditing?: boolean;
  onSave: (contract: Partial<ContractData>) => void;
}

export function AddEditContract({ contract, isEditing = false, onSave }: AddEditContractProps) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(contract?.customerId || "");
  const [type, setType] = useState(contract?.type || "Service Agreement");
  const [status, setStatus] = useState(contract?.status || "draft");
  const [startDate, setStartDate] = useState<Date | undefined>(
    contract?.startDate && contract.startDate !== "-" ? new Date(contract.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    contract?.endDate && contract.endDate !== "-" ? new Date(contract.endDate) : undefined
  );
  const [value, setValue] = useState(contract?.value?.replace("$", "") || "");
  const [document, setDocument] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState(contract?.documentName || "");
  const [documentUrl, setDocumentUrl] = useState(contract?.documentUrl || "");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error("Customer is required");
      return;
    }
    
    // In a real app, you would upload the document to your storage
    // and get a URL back. Here we just simulate it
    let updatedDocumentUrl = documentUrl;
    if (document) {
      // In a real app, this would be an API call to upload the file
      // For now, we'll just pretend we have a URL
      updatedDocumentUrl = URL.createObjectURL(document);
    }
    
    const customerName = customers.find(c => c.id === customerId)?.name || "";
    
    const updatedContract: Partial<ContractData> = {
      customer: customerName,
      customerId,
      type,
      status: status as ContractData["status"],
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : "-",
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : "-",
      value: `$${value}`,
      documentUrl: updatedDocumentUrl,
      documentName: document ? document.name : documentName,
    };
    
    onSave(updatedContract);
    toast.success(isEditing ? "Contract updated successfully" : "Contract added successfully");
    setOpen(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocument(file);
      setDocumentName(file.name);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button className="glass-button">
            <Plus className="h-4 w-4 mr-2" /> New Contract
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Contract" : "Create New Contract"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Make changes to the existing contract." 
                : "Fill in the details to create a new contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Contract Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service Agreement">Service Agreement</SelectItem>
                  <SelectItem value="Implementation">Implementation</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="License">License</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="value">Contract Value ($)</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="Enter contract value"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="document">Upload Contract Document</Label>
              <div className="flex flex-col gap-2">
                <label 
                  htmlFor="document-upload" 
                  className="cursor-pointer flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-md text-sm"
                >
                  <Upload className="h-4 w-4" />
                  {documentName ? "Change Document" : "Upload Document"}
                </label>
                <input 
                  id="document-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {documentName && (
                  <div className="text-sm flex items-center justify-between bg-primary/5 p-2 rounded">
                    <span className="truncate">{documentName}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setDocument(null);
                        setDocumentName("");
                        setDocumentUrl("");
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Update Contract" : "Create Contract"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
