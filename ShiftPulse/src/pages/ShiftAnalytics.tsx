import { useState, useMemo } from "react";
import { useGetShiftAnalyticsQuery } from "@/store/api/apiSlice";
import { RangeFilter } from "@/components/RangeFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import {
  ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { AlertTriangle, Clock, Coffee, Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="glass-card p-2.5 border border-border/50 text-xs text-foreground">
      {d?.employee_name && <p className="font-medium mb-1">{d.employee_name}</p>}
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }}>{e.name}: <span className="font-mono">{typeof e.value === 'number' ? e.value.toFixed(2) : e.value}</span></p>
      ))}
    </div>
  );
};

export default function ShiftAnalytics() {
  const [range, setRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 30 Days"
  });

  const { data: analyticsData, isLoading, isError } = useGetShiftAnalyticsQuery({
    start_date: range.start,
    end_date: range.end
  });

  const violations = useMemo(() => {
    if (!analyticsData) return [];

    const v: { id: string; employee: string; date: string; type: string; severity: string; detail: string }[] = [];

    analyticsData.forEach(s => {
      // 1. No Break Violation (Worked > 6 hours without break)
      if (s.actual_hours >= 6 && s.break_hours === 0) {
        v.push({
          id: `${s.id}-nb`,
          employee: s.employee_name,
          date: s.date,
          type: 'No Break',
          severity: 'danger',
          detail: `Worked ${s.actual_hours.toFixed(1)}h without a recorded break`
        });
      }

      // 2. Long Break Violation (Exceeds Scheduled)
      if (s.break_hours > s.scheduled_break_hours + 0.05) {
        v.push({
          id: `${s.id}-lb`,
          employee: s.employee_name,
          date: s.date,
          type: 'Long Break',
          severity: 'warning',
          detail: `${(s.break_hours * 60).toFixed(0)}m break exceeds scheduled ${(s.scheduled_break_hours * 60).toFixed(0)}m`
        });
      }

      // 3. Short Break Violation (< 15 min but > 0)
      if (s.break_hours > 0 && s.break_hours < 0.15) {
        v.push({
          id: `${s.id}-sb`,
          employee: s.employee_name,
          date: s.date,
          type: 'Short Break',
          severity: 'warning',
          detail: `Only ${(s.break_hours * 60).toFixed(0)}m break taken`
        });
      }

      // 4. Split Shift Detection (> 1 clock session)
      if (s.punch_count > 1) {
        v.push({
          id: `${s.id}-sp`,
          employee: s.employee_name,
          date: s.date,
          type: 'Split Shift',
          severity: 'info',
          detail: `${s.punch_count} clock sessions (Potential Split)`
        });
      }
    });

    return v.sort((a, b) => b.date.localeCompare(a.date));
  }, [analyticsData]);

  const scatterData = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.filter(s => s.actual_hours > 0).map(s => ({
      shiftLength: s.actual_hours,
      breakTime: s.break_hours,
      employee_name: s.employee_name,
    }));
  }, [analyticsData]);

  const breakByEmployee = useMemo(() => {
    if (!analyticsData) return [];

    const empMap = new Map<string, { total: number; count: number }>();

    analyticsData.forEach(s => {
      if (s.actual_hours > 0 && s.break_hours > 0) {
        const current = empMap.get(s.employee_name) || { total: 0, count: 0 };
        empMap.set(s.employee_name, {
          total: current.total + s.break_hours,
          count: current.count + 1
        });
      }
    });

    return Array.from(empMap.entries())
      .map(([name, stats]) => ({
        name: name.split(' ')[0],
        fullName: name,
        avgBreak: (stats.total / stats.count) * 60
      }))
      .sort((a, b) => b.avgBreak - a.avgBreak);
  }, [analyticsData]);

  const avgBreakAll = useMemo(() => {
    if (!analyticsData) return '0';
    const breakShifts = analyticsData.filter(s => s.actual_hours > 0 && s.break_hours > 0);
    if (breakShifts.length === 0) return '0';
    const total = breakShifts.reduce((sum, s) => sum + s.break_hours, 0);
    return ((total / breakShifts.length) * 60).toFixed(0);
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Running split-shift & compliance engine...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-status-danger">
        <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
        <p className="font-bold">Error loading analytics</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-secondary rounded-lg text-foreground">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 glow-primary/20">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Shift & Break Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Found {analyticsData?.length} shifts · {range.label}</p>
          </div>
        </div>
        <RangeFilter initialRange="30d" onRangeChange={(start, end, label) => setRange({ start, end, label })} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Avg Break"
          value={`${avgBreakAll}m`}
          icon={<Coffee className="h-4 w-4 text-chart-3" />}
          tooltip="The average duration of breaks across all shifts. Target: 30-45 minutes."
        />
        <KPICard
          title="No Breaks"
          value={violations.filter(v => v.type === 'No Break').length}
          icon={<AlertTriangle className="h-4 w-4 text-status-danger" />}
          variant="danger"
          tooltip="Number of shifts worked >6 hours with 0 minutes of break time."
        />
        <KPICard
          title="Long Breaks"
          value={violations.filter(v => v.type === 'Long Break').length}
          icon={<Clock className="h-4 w-4 text-status-warning" />}
          variant="warning"
          tooltip="Shifts where break time exceeded the personal scheduled break time."
        />
        <KPICard
          title="Split Shifts"
          value={violations.filter(v => v.type === 'Split Shift').length}
          icon={<Clock className="h-4 w-4 text-status-info" />}
          tooltip="Shifts with multiple clock-in sessions, indicating fragmented work hours."
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground/90">Shift Length vs Break Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" vertical={false} />
              <XAxis type="number" dataKey="shiftLength" name="Shift (h)" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
              <YAxis type="number" dataKey="breakTime" name="Break (h)" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Scatter data={scatterData} fill="hsl(38,92%,50%)" fillOpacity={0.6}>
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={d.breakTime > 0.75 ? 'hsl(0,72%,51%)' : d.breakTime === 0 ? 'hsl(175,65%,42%)' : 'hsl(38,92%,50%)'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-foreground/90">Avg Break Time by Employee (min)</h3>
          <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            <div style={{ height: Math.max(300, breakByEmployee.length * 35) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakByEmployee} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    interval={0}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="avgBreak" name="Avg Break (min)" fill="hsl(280,60%,55%)" radius={[2, 8, 8, 2]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Violations Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4 text-foreground/90">Detected Policy Violations ({violations.length})</h3>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">Employee</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">Type</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">Severity</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">Detail</th>
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{v.employee}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{v.date}</td>
                  <td className="py-2.5 px-3 text-xs text-foreground/80">{v.type}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={v.severity} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs leading-relaxed">{v.detail}</td>
                </tr>
              ))}
              {violations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground italic">
                    No policy violations detected for the selected period. Great job!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
