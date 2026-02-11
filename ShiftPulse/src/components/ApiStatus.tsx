import { useGetShiftsQuery } from "@/store/api/apiSlice";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function ApiStatus() {
    const { isLoading, isError, isSuccess } = useGetShiftsQuery({});

    if (isLoading) return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;

    if (isError) return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium border border-destructive/20">
            <WifiOff className="h-3 w-3" />
            <span>Backend Offline</span>
        </div>
    );

    if (isSuccess) return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-success/10 text-status-success text-[10px] font-medium border border-status-success/20">
            <Wifi className="h-3 w-3" />
            <span>Connected</span>
        </div>
    );

    return null;
}
