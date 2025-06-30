
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "lucide-react";

interface UpdateDateDialogProps {
  customerId: string;
  customerName: string;
  currentDate?: string | null;
  onUpdateDate: (customerId: string, newDate: string, customerName: string) => void;
}

export const UpdateDateDialog: React.FC<UpdateDateDialogProps> = ({
  customerId,
  customerName,
  currentDate,
  onUpdateDate
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onUpdateDate(customerId, formattedDate, customerName);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="flex items-center gap-2 w-full">
          <Calendar className="h-4 w-4" />
          Update Date
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Subscription Date</DialogTitle>
          <DialogDescription>
            Update the subscription end date for {customerName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Subscription End Date</label>
            <DatePicker
              date={selectedDate}
              onDateChange={setSelectedDate}
              placeholder="Select new date"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedDate}>
            Update Date
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
