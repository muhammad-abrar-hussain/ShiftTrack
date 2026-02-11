import { useState } from "react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Calendar } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TimeRange = "7d" | "15d" | "30d" | "3m" | "6m" | "1y";

interface RangeFilterProps {
    initialRange?: TimeRange;
    onRangeChange: (startDate: string, endDate: string, label: string) => void;
}

const rangeOptions = [
    { value: "7d", label: "Last Week" },
    { value: "15d", label: "Last 15 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "3m", label: "Last 3 Months" },
    { value: "6m", label: "Last 6 Months" },
    { value: "1y", label: "Last Year" },
];

export function RangeFilter({ initialRange = "15d", onRangeChange }: RangeFilterProps) {
    const [currentRange, setCurrentRange] = useState<TimeRange>(initialRange);

    const handleSelect = (range: TimeRange, label: string) => {
        setCurrentRange(range);
        const endDate = new Date();
        let startDate: Date;

        switch (range) {
            case "7d": startDate = subDays(endDate, 7); break;
            case "15d": startDate = subDays(endDate, 15); break;
            case "30d": startDate = subMonths(endDate, 1); break;
            case "3m": startDate = subMonths(endDate, 3); break;
            case "6m": startDate = subMonths(endDate, 6); break;
            case "1y": startDate = subYears(endDate, 1); break;
            default: startDate = subDays(endDate, 15);
        }

        onRangeChange(
            format(startDate, "yyyy-MM-dd"),
            format(endDate, "yyyy-MM-dd"),
            label
        );
    };

    const currentLabel = rangeOptions.find(opt => opt.value === currentRange)?.label || "Select Range";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border/50 text-xs font-medium hover:bg-secondary/80 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{currentLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border/50">
                {rangeOptions.map((opt) => (
                    <DropdownMenuItem
                        key={opt.value}
                        onClick={() => handleSelect(opt.value as TimeRange, opt.label)}
                        className="text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer"
                    >
                        {opt.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
