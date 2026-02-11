import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetEmployeeTrendQuery, useGetShiftsQuery } from "@/store/api/apiSlice";
import { RangeFilter } from "@/components/RangeFilter";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft, Clock, Coffee, Timer, TrendingUp,
  CalendarCheck, AlertTriangle, Loader2, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";
import type { ShiftSummary } from "@/types/api";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-2.5 border border-border/50 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }}>{e.name}: <span className="font-mono">{e.value}</span></p>
      ))}
    </div>
  );
};

export default function EmployeeDetail() {
  const { id: lastName } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [range, setRange] = useState({
    start: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 15 Days"
  });

  const [tableRange, setTableRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 30 Days"
  });
  const [showAll, setShowAll] = useState(false);

  const {
    data: trend,
    isLoading: isTrendLoading,
    isError: isTrendError
  } = useGetEmployeeTrendQuery({
    last_name: lastName || "",
    start_date: range.start,
    end_date: range.end
  }, { skip: !lastName });

  const {
    data: recentShifts,
    isLoading: isShiftsLoading,
    isError: isShiftsError
  } = useGetShiftsQuery({
    employee_last_name: lastName || "",
    start_date: tableRange.start,
    end_date: tableRange.end
  }, { skip: !lastName });

  const stats = useMemo(() => {
    if (!trend || trend.length === 0) return null;

    const totalActual = trend.reduce((sum, day) => sum + Number(day.actual || 0), 0);
    const totalScheduled = trend.reduce((sum, day) => sum + Number(day.scheduled || 0), 0);
    const totalBreak = trend.reduce((sum, day) => sum + Number(day.break || 0), 0);
    const shiftCount = trend.length;
    const avgShiftLength = shiftCount > 0 ? totalActual / shiftCount : 0;
    const avgBreak = shiftCount > 0 ? totalBreak / shiftCount : 0;
    const attendance = trend.length > 0 ? (shiftCount / trend.length) * 100 : 0;
    const compliance = totalScheduled > 0 ? Math.min(100, (totalActual / totalScheduled) * 100) : 100;

    return {
      totalActual: totalActual.toFixed(1),
      avgShiftLength: avgShiftLength.toFixed(1),
      avgBreakMin: (avgBreak * 60).toFixed(0),
      overtime: Math.max(0, totalActual - totalScheduled).toFixed(1),
      attendance: attendance.toFixed(0),
      compliance: compliance.toFixed(0),
      shiftCount
    };
  }, [trend]);

  const chartData = useMemo(() => {
    if (!trend) return [];
    return trend.map(day => ({
      ...day,
      scheduled: Number(day.scheduled || 0),
      actual: Number(day.actual || 0),
      break: Number(day.break || 0),
      date: typeof day.date === 'string' ? day.date.slice(5) : '??-??' // MM-DD
    }));
  }, [trend]);

  if (!lastName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
        <p>No employee selected.</p>
      </div>
    );
  }

  if (isTrendLoading || isShiftsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading employee profile...</p>
      </div>
    );
  }

  if (isTrendError || isShiftsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-status-danger space-y-4">
        <AlertCircle className="h-10 w-10 opacity-50" />
        <div className="text-center">
          <p className="font-bold">Failed to load profile</p>
          <p className="text-sm opacity-70">Check if the backend API is running.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const firstShift = recentShifts?.[0];
  const firstName = firstShift?.employee_first_name || "";
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  const displayedShifts = showAll ? recentShifts : recentShifts?.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/employees")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </button>

        <RangeFilter
          onRangeChange={(start, end, label) => setRange({ start, end, label })}
        />
      </div>

      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary border border-primary/20">
          {initials || "??"}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{firstName} {lastName}</h2>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Compliance Score</span>
          <span className={`text-2xl font-bold ${Number(stats?.compliance || 0) >= 90 ? 'text-status-success' :
            Number(stats?.compliance || 0) >= 75 ? 'text-status-warning' :
              'text-status-danger'
            }`}>
            {stats?.compliance || 0}%
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Total Hours"
          value={`${stats?.totalActual || 0}h`}
          icon={<Clock className="h-4 w-4 text-primary" />}
          tooltip="Total actual labor hours worked by this employee during the selected period."
        />
        <KPICard
          title="Avg Shift"
          value={`${stats?.avgShiftLength || 0}h`}
          icon={<Timer className="h-4 w-4 text-accent" />}
          tooltip="The average length of a single shift for this employee."
        />
        <KPICard
          title="Avg Break"
          value={`${stats?.avgBreakMin || 0}m`}
          icon={<Coffee className="h-4 w-4 text-chart-3" />}
          tooltip="Average break duration (minutes) across all shifts in this period."
        />
        <KPICard
          title="Overtime"
          value={`${stats?.overtime || 0}h`}
          icon={<TrendingUp className="h-4 w-4 text-status-warning" />}
          variant={Number(stats?.overtime || 0) > 5 ? "warning" : "default"}
          tooltip="Total hours worked beyond the scheduled amount for this employee."
        />
        <KPICard
          title="Shifts Worked"
          value={stats?.shiftCount || 0}
          icon={<AlertTriangle className="h-4 w-4 text-status-info" />}
          tooltip="Total number of distinct shifts worked during this period."
        />
        <KPICard
          title="Attendance"
          value={`${stats?.attendance || 0}%`}
          icon={<CalendarCheck className="h-4 w-4 text-status-success" />}
          variant="success"
          tooltip="A general attendance/compliance score based on scheduled vs actual performance."
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold">Hours Trend</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{range.label}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" name="Scheduled" dataKey="scheduled" stroke="hsl(175,65%,42%)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              <Area type="monotone" name="Actual" dataKey="actual" stroke="hsl(38,92%,50%)" fill="url(#ga)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold">Break Time per Shift</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{range.label}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="break" name="Break (h)" fill="hsl(280,60%,55%)" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shift History */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Recent Shifts</h3>
          <div className="flex items-center gap-2">
            <RangeFilter
              initialRange="30d"
              onRangeChange={(start, end, label) => setTableRange({ start, end, label })}
            />
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border/50 text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              {showAll ? "Show 10" : "Show All"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Scheduled</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Actual</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Break</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">OT</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {displayedShifts?.map((s: ShiftSummary) => {
                const actual = Number(s.actual_working_hours || 0);
                const scheduled = Number(s.scheduled_working_hours || 0);
                const breaker = Number(s.break_hours || 0);
                const overtime = Math.max(0, actual - scheduled).toFixed(1);
                const compliance = scheduled > 0 ? Math.min(100, (actual / scheduled) * 100).toFixed(0) : "100";

                // Determine Shift Type
                let shiftType = "Morning";
                if (s.start_time) {
                  const hour = parseInt(s.start_time.split(":")[0]);
                  if (hour >= 4 && hour < 11) shiftType = "Morning";
                  else if (hour >= 11 && hour < 16) shiftType = "Afternoon";
                  else if (hour >= 16 && hour < 21) shiftType = "Evening";
                  else shiftType = "Night";
                }

                return (
                  <tr key={s.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs">{s.business_date}</td>
                    <td className="py-2.5 px-3 capitalize text-muted-foreground">{shiftType}</td>
                    <td className="py-2.5 px-3 font-mono">{scheduled.toFixed(1)}h</td>
                    <td className="py-2.5 px-3 font-mono font-medium">{actual.toFixed(1)}h</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {breaker > 0 ? `${(breaker * 60).toFixed(0)}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {Number(overtime) > 0 ? <span className="text-status-warning">{overtime}h</span> : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={actual > 0 ? "on-time" : "missed"} />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-10 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${Number(compliance) >= 85 ? 'bg-status-success' :
                              Number(compliance) >= 70 ? 'bg-status-warning' :
                                'bg-status-danger'
                              }`}
                            style={{ width: `${compliance}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{compliance}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!recentShifts || recentShifts.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    No shift history found for this employee.
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
