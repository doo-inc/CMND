
import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { CalendarIcon, Plus, Upload } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface ContractDialogProps {
  customerId?: string | null;
  contract?: {
    id: string;
    name: string;
    status: string;
    type?: string;
    value: number;
    start_date: string;
    end_date: string;
    contract_number?: string;
  };
  isEditing?: boolean;
  onSuccess: (action: 'created' | 'updated', contractData?: any) => void;
  trigger?: React.ReactNode;
}

export function AddContractDialog({ 
  customerId, 
  contract, 
  isEditing = false, 
  onSuccess,
  trigger
}: ContractDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(contract?.name || "");
  const [contractNumber, setContractNumber] = useState(contract?.contract_number || "");
  const [type, setType] = useState(contract?.type || "Service Agreement");
  const [status, setStatus] = useState(contract?.status || "draft");
  const [startDate, setStartDate] = useState<Date | undefined>(
    contract?.start_date ? new Date(contract.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    contract?.end_date ? new Date(contract.end_date) : undefined
  );
  const [value, setValue] = useState(contract?.value?.toString() || "");
  const [document, setDocument] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  // Fetch customers when dialog opens and no customerId is provided
  useEffect(() => {
    if (open && !customerId) {
      fetchCustomers();
    }
  }, [open, customerId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching customers:", error);
        toast.error("Failed to load customers");
        return;
      }
      
      setCustomers(data || []);
    } catch (err) {
      console.error("Error in fetchCustomers:", err);
      toast.error("Failed to load customers");
    }
  };
  
  const handleSubmit = async () => {
    const finalCustomerId = customerId || selectedCustomerId;
    
    if (!finalCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!name) {
      toast.error("Contract name is required");
      return;
    }

    // Validate dates for active contracts
    if (status === "active" && (!startDate || !endDate)) {
      toast.error("Active contracts must have both start and end dates");
      return;
    }

    if (startDate && endDate && endDate <= startDate) {
      toast.error("End date must be after start date");
      return;
    }
    
    try {
      const contractData = {
        customer_id: finalCustomerId,
        name,
        contract_number: contractNumber || null,
        status,
        value: value ? parseInt(value, 10) : 0,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        terms: type || "Service Agreement"
      };
      
      let result;
      
      if (isEditing && contract?.id) {
        result = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contract.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("contracts")
          .insert(contractData)
          .select()
          .single();
      }
      
      if (result.error) {
        console.error("Error saving contract:", result.error);
        if (result.error.code === '23505' && result.error.message.includes('contract_number')) {
          toast.error("Contract number already exists. Please use a unique contract number.");
        } else {
          toast.error(isEditing ? "Failed to update contract" : "Failed to create contract");
        }
        return;
      }
      
      toast.success(isEditing ? "Contract updated successfully" : "Contract added successfully");
      resetForm();
      setOpen(false);
      
      // Pass the action type and contract data to allow targeted updates
      onSuccess(isEditing ? 'updated' : 'created', result.data);
    } catch (err) {
      console.error("Error in saving contract:", err);
      toast.error("An unexpected error occurred");
    }
  };
  
  const resetForm = () => {
    if (!isEditing) {
      setName("");
      setContractNumber("");
      setType("Service Agreement");
      setStatus("draft");
      setStartDate(undefined);
      setEndDate(undefined);
      setValue("");
      setDocument(null);
      setDocumentName("");
      setSelectedCustomerId("");
    }
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
        {trigger || (
          <Button className={isEditing ? "h-8 text-xs" : ""} variant={isEditing ? "ghost" : "default"} size={isEditing ? "sm" : "default"}>
            {isEditing ? "Edit" : <><Plus className="h-4 w-4 mr-2" /> Add Contract</>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Contract" : "Add New Contract"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Make changes to the existing contract." 
              : "Create a new contract for this customer."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!customerId && (
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer*</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="name">Contract Name*</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual License Agreement"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="contract_number">Contract Number</Label>
            <Input 
              id="contract_number" 
              value={contractNumber} 
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="e.g. CNT-2024-001"
            />
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEditing ? "Update Contract" : "Add Contract"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
