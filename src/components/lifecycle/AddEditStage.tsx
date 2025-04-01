
import React from "react";
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
import { CalendarIcon, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LifecycleStageProps } from "./LifecycleStage";

interface AddEditStageProps {
  stage?: LifecycleStageProps;
  isEditing?: boolean;
  onSave: (stage: Partial<LifecycleStageProps>) => void;
  customerId?: string;
}

export function AddEditStage({ stage, isEditing = false, onSave, customerId }: AddEditStageProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(stage?.name || "");
  const [status, setStatus] = React.useState(stage?.status || "not-started");
  const [ownerId, setOwnerId] = React.useState(stage?.owner?.id || "");
  const [date, setDate] = React.useState<Date | undefined>(
    stage?.deadline ? new Date(stage.deadline) : undefined
  );
  const [notes, setNotes] = React.useState(stage?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast.error("Stage name is required");
      return;
    }
    
    const updatedStage: Partial<LifecycleStageProps> = {
      name,
      status: status as LifecycleStageProps["status"],
      owner: {
        id: ownerId,
        name: getOwnerName(ownerId),
        role: getOwnerRole(ownerId)
      },
      notes,
      ...(date && { deadline: format(date, "yyyy-MM-dd") }),
    };
    
    onSave(updatedStage);
    toast.success(isEditing ? "Stage updated successfully" : "Stage added successfully");
    setOpen(false);
  };
  
  const getOwnerName = (id: string) => {
    switch(id) {
      case "user-001": return "Ahmed Abdullah";
      case "user-002": return "Fatima Hassan";
      case "user-003": return "Khalid Al-Farsi";
      case "user-004": return "Mohammed Rahman";
      default: return "Unknown";
    }
  };
  
  const getOwnerRole = (id: string) => {
    switch(id) {
      case "user-001": return "Account Executive";
      case "user-002": return "Customer Success Manager";
      case "user-003": return "Finance Manager";
      case "user-004": return "Integration Engineer";
      default: return "Unknown";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button size="sm" className="glass-button animate-fade-in">
            <Plus className="h-4 w-4 mr-1" /> Add Stage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Stage" : "Add New Stage"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Make changes to the customer lifecycle stage." 
                : "Create a new customer lifecycle stage."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Stage Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter stage name" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user-001">Ahmed Abdullah (Account Executive)</SelectItem>
                  <SelectItem value="user-002">Fatima Hassan (Customer Success Manager)</SelectItem>
                  <SelectItem value="user-003">Khalid Al-Farsi (Finance Manager)</SelectItem>
                  <SelectItem value="user-004">Mohammed Rahman (Integration Engineer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes here"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{isEditing ? "Save Changes" : "Add Stage"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
