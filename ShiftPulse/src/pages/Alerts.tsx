import { StatusBadge } from "@/components/StatusBadge";
import { useState, useMemo } from "react";
import {
  AlertTriangle, Clock, Coffee, LogIn, UserX, Timer, Filter,
  Loader2, AlertCircle, Info, Calendar
} from "lucide-react";
import { useGetAlertsQuery } from "@/store/api/apiSlice";
import { RangeFilter } from "@/components/RangeFilter";
import { format, subDays } from "date-fns";

const typeIcons: Record<string, any> = {
  'Late Clock-in': LogIn,
  'Missed Shift': UserX,
  'Excessive Break': Coffee,
  'No Break Taken': Coffee,
  'Excessive Overtime': Timer,
  'Missing Clock-out': Clock,
  'Early Clock-out': Clock,
  'Unscheduled Shift': AlertTriangle,
};

export default function Alerts() {
  const [range, setRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 30 Days"
  });

  const [filter, setFilter] = useState<string>("all");

  const { data: alerts = [], isLoading, isError, refetch } = useGetAlertsQuery({
    start_date: range.start,
    end_date: range.end
  });

  const filtered = useMemo(() => {
    return filter === "all" ? alerts : alerts.filter(a => a.severity === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    all: alerts.length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  }), [alerts]);

  const severities = ["all", "high", "medium", "low"];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Scanning shift data for anomalies...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-status-danger">
        <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
        <p className="font-bold">Error loading alerts</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alerts & Anomalies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detected {alerts.length} issues in the last {range.label.toLowerCase()}
          </p>
        </div>
        <RangeFilter initialRange="30d" onRangeChange={(start, end, label) => setRange({ start, end, label })} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {severities.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
            >
              {s} ({counts[s as keyof typeof counts]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Updates automatically when new data is parsed</span>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(alert => {
          const Icon = typeIcons[alert.type] || AlertTriangle;
          return (
            <div
              key={alert.id}
              className={`glass-card p-4 flex items-start gap-4 transition-all hover:border-border group ${alert.severity === 'high' ? 'border-l-2 border-l-status-danger' :
                alert.severity === 'medium' ? 'border-l-2 border-l-status-warning' :
                  'border-l-2 border-l-status-info'
                }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${alert.severity === 'high' ? 'bg-status-danger/10' :
                alert.severity === 'medium' ? 'bg-status-warning/10' :
                  'bg-status-info/10'
                }`}>
                <Icon className={`h-5 w-5 ${alert.severity === 'high' ? 'text-status-danger' :
                  alert.severity === 'medium' ? 'text-status-warning' :
                    'text-status-info'
                  }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-semibold text-sm">{alert.employeeName}</span>
                  <StatusBadge status={alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'info'} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded font-medium">
                    {alert.type}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="font-mono">{alert.date}</span>
                  </span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-xs font-medium text-primary/80 italic">
                    {alert.suggestion}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 glass-card border-dashed">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Filter className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground font-medium">No alerts found for this criteria.</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-primary text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
