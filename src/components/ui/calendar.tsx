
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  compact?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  compact = false,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.defaultMonth || new Date()
  );

  // Generate year options (10 years back, 10 years forward)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  
  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(monthIndex));
    setCurrentMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(parseInt(year));
    setCurrentMonth(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    // Check if onSelect exists and mode is single before calling
    if ('onSelect' in props && props.onSelect && props.mode === "single") {
      (props.onSelect as (date: Date | undefined) => void)(today);
    }
  };

  const handleClear = () => {
    // Check if onSelect exists and mode is single before calling
    if ('onSelect' in props && props.onSelect && props.mode === "single") {
      (props.onSelect as (date: Date | undefined) => void)(undefined);
    }
  };

  const containerPadding = compact ? "p-2" : "p-3";
  const headerSpacing = compact ? "mb-2" : "mb-4";
  const quickButtonsSpacing = compact ? "mb-2" : "mb-3";
  const selectSize = compact ? "w-[90px] h-7 text-xs" : "w-[110px] h-8";
  const yearSelectSize = compact ? "w-[70px] h-7 text-xs" : "w-[80px] h-8";
  const quickButtonSize = compact ? "h-6 text-xs px-2" : "h-7 text-xs";

  return (
    <div className={cn(containerPadding, "pointer-events-auto")}>
      {/* Header with Month/Year Selectors */}
      <div className={cn("flex items-center justify-center space-x-2", headerSpacing)}>
        <Select value={currentMonth.getMonth().toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className={selectSize}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {monthOptions.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {compact ? month.slice(0, 3) : month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={currentMonth.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className={yearSelectSize}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Action Buttons */}
      <div className={cn("flex items-center justify-between", quickButtonsSpacing)}>
        <Button
          variant="outline"
          size="sm"
          className={quickButtonSize}
          onClick={handleToday}
        >
          Today
        </Button>
        {(props.mode === "single" && "selected" in props && props.selected) && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(quickButtonSize, "text-muted-foreground")}
            onClick={handleClear}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Calendar */}
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("pointer-events-auto", className)}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: cn(
            "text-muted-foreground rounded-md font-normal text-[0.8rem]",
            compact ? "w-8" : "w-9"
          ),
          row: "flex w-full mt-2",
          cell: cn(
            "text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            compact ? "h-8 w-8" : "h-9 w-9"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            compact ? "h-8 w-8 text-xs" : "h-9 w-9"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ ...props }) => {
            if (props.orientation === "left") {
              return <ChevronLeft className="h-4 w-4" />;
            }
            return <ChevronRight className="h-4 w-4" />;
          },
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
