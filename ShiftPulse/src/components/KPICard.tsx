import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  tooltip?: string;
}

export function KPICard({ title, value, subtitle, icon, trend, trendValue, variant = "default", tooltip }: KPICardProps) {
  const variantStyles = {
    default: "border-border/50",
    success: "border-status-success/30",
    warning: "border-status-warning/30",
    danger: "border-status-danger/30",
  };

  const iconBg = {
    default: "bg-secondary",
    success: "bg-status-success/15",
    warning: "bg-status-warning/15",
    danger: "bg-status-danger/15",
  };

  const trendColors = {
    up: "text-status-success",
    down: "text-status-danger",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={`glass-card p-4 ${variantStyles[variant]} animate-slide-up group/card`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg ${iconBg[variant]} flex items-center justify-center`}>
          {icon}
        </div>

        <div className="flex items-center gap-2">
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs ${trendColors[trend]}`}>
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span className="font-medium">{trendValue}</span>
            </div>
          )}

          {tooltip && (
            <div className="relative group/tooltip">
              <Info className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-primary transition-colors cursor-help" />
              <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded border border-border/50 shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all z-50">
                {tooltip}
                <div className="absolute bottom-full right-2 border-8 border-transparent border-b-popover" />
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground animate-count-up">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground/70 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
