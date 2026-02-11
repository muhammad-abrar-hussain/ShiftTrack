import { useState, useMemo } from "react";
import { KPICard } from "@/components/KPICard";
import { RangeFilter } from "@/components/RangeFilter";
import {
  useGetOverviewSummaryQuery,
  useGetOverviewDailyQuery,
  useGetEmployeeStatsQuery
} from "@/store/api/apiSlice";
import {
  Users, Clock, CalendarCheck, Coffee, AlertTriangle, Timer,
  Loader2, AlertCircle, TrendingUp, TrendingDown, Info, CheckCircle,
  LayoutDashboard
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays } from "date-fns";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 border border-border/50 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-mono font-medium">{entry.value}h</span>
        </p>
      ))}
    </div>
  );
};

export default function Overview() {
  const [range, setRange] = useState({
    start: format(subDays(new Date(), 14), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 14 Days"
  });

  const apiParams = { start_date: range.start, end_date: range.end };

  const { data: summary, isLoading: isSummaryLoading } = useGetOverviewSummaryQuery(apiParams);
  const { data: dailyTrend, isLoading: isTrendLoading } = useGetOverviewDailyQuery(apiParams);
  const { data: laborByEmp, isLoading: isLaborLoading } = useGetEmployeeStatsQuery(apiParams);

  const isLoading = isSummaryLoading || isTrendLoading || isLaborLoading;

  const trendData = useMemo(() => {
    if (!dailyTrend) return [];
    return dailyTrend.map(d => ({
      ...d,
      date: typeof d.date === 'string' ? d.date.slice(5) : '??-??' // MM-DD
    }));
  }, [dailyTrend]);

  const topLabor = useMemo(() => {
    if (!laborByEmp) return [];
    return [...laborByEmp]
      .sort((a, b) => b.total_actual - a.total_actual)
      .slice(0, 10)
      .map(e => ({
        name: e.full_name,
        actual: e.total_actual,
        scheduled: e.total_scheduled,
        overtime: e.overtime
      }));
  }, [laborByEmp]);

  // Derived Insights from real data
  const insightsList = useMemo(() => {
    if (!summary || !laborByEmp || !dailyTrend) return [];
    const list = [];

    // 1. Highest Overtime Employee
    const sortedOT = [...laborByEmp].sort((a, b) => b.overtime - a.overtime);
    const topOT = sortedOT[0];
    if (topOT && topOT.overtime > 0) {
      list.push({
        type: 'warning',
        text: `${topOT.full_name} has the highest overtime (${topOT.overtime.toFixed(1)}h)`,
        trend: 'up'
      });
    }

    // 2. Best Compliance Employee
    const compliantEmps = [...laborByEmp].filter(e => e.total_scheduled > 0);
    const topComp = compliantEmps.sort((a, b) => (b.total_actual / b.total_scheduled) - (a.total_actual / a.total_scheduled))[0];
    if (topComp) {
      const compVal = ((topComp.total_actual / topComp.total_scheduled) * 100).toFixed(0);
      list.push({
        type: 'success',
        text: `${topComp.full_name} is highly compliant (${compVal}%)`,
        trend: 'none'
      });
    }

    // 3. Busiest Day
    const sortedDaily = [...dailyTrend].sort((a, b) => b.actual - a.actual);
    const busiestDay = sortedDaily[0];
    if (busiestDay) {
      list.push({
        type: 'info',
        text: `Busiest day: ${busiestDay.date.slice(5)} (${busiestDay.actual.toFixed(1)}h)`,
        trend: 'none'
      });
    }

    return list;
  }, [summary, laborByEmp, dailyTrend]);

  const insightIcons = {
    warning: <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />,
    info: <Info className="h-3.5 w-3.5 text-status-info" />,
    success: <CheckCircle className="h-3.5 w-3.5 text-status-success" />,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Analyzing workforce data...</p>
      </div>
    );
  }

  if (!summary || summary.total_shifts === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          </div>
          <RangeFilter onRangeChange={(start: string, end: string, label: string) => setRange({ start, end, label })} />
        </div>
        <div className="glass-card flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border-dashed border-2">
          <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground">No data available for this period</h3>
          <p className="max-w-xs text-center mt-1">Try selecting a different date range to view workforce analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 glow-primary/20">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time workforce analytics for {range.label}</p>
          </div>
        </div>
        <RangeFilter initialRange="15d" onRangeChange={(start: string, end: string, label: string) => setRange({ start, end, label })} />
      </div>

      {/* Insights Strip */}
      {insightsList.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {insightsList.map((ins: any, i: number) => (
            <div key={i} className="glass-card px-3 py-2 flex items-center gap-2 whitespace-nowrap shrink-0 text-xs">
              {(insightIcons as any)[ins.type]}
              <span className="text-foreground/80">{ins.text}</span>
              {ins.trend === "up" && <TrendingUp className="h-3 w-3 text-status-warning" />}
              {ins.trend === "down" && <TrendingDown className="h-3 w-3 text-status-success" />}
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          title="Employees"
          value={summary.total_employees}
          icon={<Users className="h-4 w-4 text-accent" />}
          tooltip="Total number of unique employees who clocked in during this period."
        />
        <KPICard
          title="Actual"
          value={`${summary.total_actual}h`}
          icon={<Clock className="h-4 w-4 text-primary" />}
          tooltip="Total labor hours actually worked and clocked by all employees."
        />
        <KPICard
          title="Scheduled"
          value={`${summary.total_scheduled}h`}
          icon={<CalendarCheck className="h-4 w-4 text-status-info" />}
          subtitle={`Var: ${summary.variance > 0 ? '+' : ''}${summary.variance}h`}
          tooltip="Total labor hours planned in the schedule. Variance shows Actual - Scheduled."
        />
        <KPICard
          title="Breaks"
          value={`${summary.total_break}h`}
          icon={<Coffee className="h-4 w-4 text-status-warning" />}
          tooltip="Total duration of all employee breaks recorded in the period."
        />
        <KPICard
          title="Overtime"
          value={`${summary.overtime}h`}
          icon={<Timer className="h-4 w-4 text-chart-3" />}
          variant={summary.overtime > 0 ? "warning" : "default"}
          tooltip="Hours worked beyond the scheduled amount. High overtime can indicate under-staffing."
        />
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scheduled vs Actual Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Scheduled vs Actual Hours Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gradScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(175, 65%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(175, 65%, 42%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area type="monotone" dataKey="scheduled" name="Scheduled" stroke="hsl(175, 65%, 42%)" fill="url(#gradScheduled)" strokeWidth={2} />
              <Area type="monotone" dataKey="actual" name="Actual" stroke="hsl(38, 92%, 50%)" fill="url(#gradActual)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Break & Overtime Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Break & Overtime Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gradBreak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area type="monotone" dataKey="breaks" name="Breaks" stroke="hsl(280, 60%, 55%)" fill="url(#gradBreak)" strokeWidth={2} />
              <Area type="monotone" dataKey="overtime" name="Overtime" stroke="hsl(0, 72%, 51%)" fill="url(#gradOT)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Labor by Employee Bar Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Top 10 Employees by Actual Labor Hours</h3>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={topLabor} layout="vertical" margin={{ left: 40, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="actual" name="Actual" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} barSize={12} />
            <Bar dataKey="scheduled" name="Scheduled" fill="hsl(175, 65%, 42%)" radius={[0, 4, 4, 0]} barSize={12} opacity={0.3} />
            <Bar dataKey="overtime" name="Overtime" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
