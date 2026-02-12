interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    "on-time": "bg-status-success/15 text-status-success border-status-success/30",
    "Present": "bg-status-success/15 text-status-success border-status-success/30",
    "Absent": "bg-status-danger/15 text-status-danger border-status-danger/30",
    "Late": "bg-status-warning/15 text-status-warning border-status-warning/30",
    "Left Early": "bg-status-warning/15 text-status-warning border-status-warning/30",
    "Overtime": "bg-accent/15 text-accent border-accent/30",
    "late": "bg-status-warning/15 text-status-warning border-status-warning/30",
    "early-out": "bg-status-warning/15 text-status-warning border-status-warning/30",
    "missed": "bg-status-danger/15 text-status-danger border-status-danger/30",
    "unscheduled": "bg-status-info/15 text-status-info border-status-info/30",
    "no-clock-out": "bg-status-danger/15 text-status-danger border-status-danger/30",
    "high": "bg-status-danger/15 text-status-danger border-status-danger/30",
    "medium": "bg-status-warning/15 text-status-warning border-status-warning/30",
    "low": "bg-status-info/15 text-status-info border-status-info/30",
  };

  const sizeStyles = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span className={`inline-flex items-center rounded-full border font-medium capitalize ${styles[status] || styles["on-time"]} ${sizeStyles}`}>
      {status.replace(/-/g, ' ')}
    </span>
  );
}
