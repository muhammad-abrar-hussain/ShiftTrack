import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetEmployeeStatsQuery } from "@/store/api/apiSlice";
import { RangeFilter } from "@/components/RangeFilter";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ChevronRight, Loader2, Users } from "lucide-react";
import { format, subDays } from "date-fns";

type SortKey = "name" | "scheduled" | "actual" | "overtime" | "shifts";

export default function Employees() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({
    start: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    label: "Last 15 Days"
  });
  const [sortBy, setSortBy] = useState<SortKey>("actual");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: employeeData, isLoading } = useGetEmployeeStatsQuery({
    start_date: range.start,
    end_date: range.end
  });

  const filteredAndSortedData = useMemo(() => {
    if (!employeeData) return [];

    return employeeData
      .filter(emp =>
        emp.full_name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const dir = sortDir === "desc" ? -1 : 1;
        switch (sortBy) {
          case "name": return dir * a.full_name.localeCompare(b.full_name);
          case "scheduled": return dir * (a.total_scheduled - b.total_scheduled);
          case "actual": return dir * (a.total_actual - b.total_actual);
          case "overtime": return dir * (a.overtime - b.overtime);
          case "shifts": return dir * (a.shift_count - b.shift_count);
          default: return 0;
        }
      });
  }, [employeeData, search, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      className="text-left py-4 px-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => toggleSort(sortKey)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortBy === sortKey ? 'text-primary' : 'text-muted-foreground/30'}`} />
      </span>
    </th>
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading employee analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employee Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyzing {employeeData?.length || 0} employees · {range.label}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border/50 h-10"
            />
          </div>
          <RangeFilter
            onRangeChange={(start, end, label) => setRange({ start, end, label })}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 bg-secondary/30">
              <tr>
                <SortHeader label="Employee Name" sortKey="name" />
                <SortHeader label="Scheduled Hours" sortKey="scheduled" />
                <SortHeader label="Actual Hours" sortKey="actual" />
                <th className="text-center py-4 px-4 text-xs font-medium text-muted-foreground">Break</th>
                <SortHeader label="Overtime" sortKey="overtime" />
                <SortHeader label="Total Shifts" sortKey="shifts" />
                <th className="text-right py-4 px-4 text-xs font-medium text-muted-foreground">Compliance</th>
                <th className="py-4 px-4" />
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((emp) => {
                const compliance = emp.total_scheduled > 0
                  ? Math.min(100, (emp.total_actual / emp.total_scheduled) * 100)
                  : 100;

                return (
                  <tr
                    key={`${emp.first_name}-${emp.last_name}`}
                    className="border-b border-border/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/employees/${emp.last_name}`)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 border border-primary/20">
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">{emp.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">
                      {emp.total_scheduled.toFixed(1)}h
                    </td>
                    <td className="py-4 px-4 font-mono font-medium text-foreground">
                      {emp.total_actual.toFixed(1)}h
                    </td>
                    <td className="py-4 px-4 font-mono text-center text-muted-foreground">
                      {(emp.total_break / (emp.shift_count || 1)).toFixed(2)}h
                    </td>
                    <td className="py-4 px-4">
                      {emp.overtime > 0 ? (
                        <span className="font-mono text-status-warning font-medium">+{emp.overtime.toFixed(1)}h</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">
                      {emp.shift_count}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-mono text-xs font-bold ${compliance >= 90 ? "text-status-success" :
                          compliance >= 75 ? "text-status-warning" :
                            "text-status-danger"
                          }`}>
                          {compliance.toFixed(0)}%
                        </span>
                        <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${compliance >= 90 ? "bg-status-success" :
                              compliance >= 75 ? "bg-status-warning" :
                                "bg-status-danger"
                              }`}
                            style={{ width: `${compliance}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-20" />
                      <p>No employees found matching your filters.</p>
                    </div>
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
