import { useState, useMemo } from "react";
import { useGetAttendanceQuery, useGetAttendanceSummaryQuery } from "@/store/api/apiSlice";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
    Search, Users, Calendar,
    Clock, CheckCircle2,
    Filter, Download, ChevronRight,
    UserCheck, UserX, Clock4
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Attendance() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [range, setRange] = useState({
        start: format(new Date(), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
        label: "Today"
    });

    const { data: attendance, isLoading: isAttendanceLoading } = useGetAttendanceQuery({
        start_date: range.start,
        end_date: range.end
    });

    const { data: summary } = useGetAttendanceSummaryQuery({
        start_date: range.start,
        end_date: range.end
    });

    const filteredAttendance = useMemo(() => {
        if (!attendance) return [];
        return attendance.filter(record => {
            const matchesSearch = `${record.employee_first_name} ${record.employee_last_name}`
                .toLowerCase()
                .includes(search.toLowerCase());
            const matchesStatus = statusFilter === "all" || record.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [attendance, search, statusFilter]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Present": return <UserCheck className="h-4 w-4 text-status-success" />;
            case "Absent": return <UserX className="h-4 w-4 text-status-error" />;
            case "Late": return <Clock4 className="h-4 w-4 text-status-warning" />;
            default: return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Attendance</h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Monitoring attendance patterns for {range.label === "Today" ? "Today" : range.label}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Calendar className="h-4 w-4 text-primary" />
                        <input
                            type="date"
                            value={range.start}
                            onChange={(e) => {
                                const date = e.target.value;
                                const isToday = date === format(new Date(), "yyyy-MM-dd");
                                setRange({
                                    start: date,
                                    end: date,
                                    label: isToday ? "Today" : format(new Date(date), "MMM d, yyyy")
                                });
                            }}
                            className="bg-transparent border-none outline-none text-sm font-semibold text-foreground"
                            max={format(new Date(), "yyyy-MM-dd")}
                        />
                    </div>
                    <Link
                        to="/attendance/mark"
                        className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20"
                    >
                        <UserCheck className="h-4 w-4" />
                        Mark Attendance
                    </Link>
                    <button className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    title="Total Records"
                    value={summary?.total || 0}
                    icon={<Users className="h-4 w-4 text-primary" />}
                />
                <KPICard
                    title="Present"
                    value={summary?.present || 0}
                    icon={<CheckCircle2 className="h-4 w-4 text-status-success" />}
                    variant="success"
                />
                <KPICard
                    title="Absent"
                    value={summary?.absent || 0}
                    icon={<UserX className="h-4 w-4 text-status-danger" />}
                    variant="danger"
                />
                <KPICard
                    title="Late"
                    value={summary?.late || 0}
                    icon={<Clock4 className="h-4 w-4 text-status-warning" />}
                    variant="warning"
                />
            </div>

            {/* Main Content */}
            <div className="glass-card overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border/50 bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by employee name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background/50 border-border/50 h-10"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background/50 border border-border/50 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/10 border-b border-border/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold text-center">Date</th>
                                <th className="px-6 py-4 font-semibold text-center">Final Status</th>
                                <th className="px-6 py-4 font-semibold">Notes</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredAttendance.map((record) => (
                                <tr key={record.id} className="hover:bg-secondary/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                                                {record.employee_first_name[0]}{record.employee_last_name[0]}
                                            </div>
                                            <span className="font-medium text-foreground">
                                                {record.employee_first_name} {record.employee_last_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-center">
                                        {format(new Date(record.business_date), "MMM d, yyyy")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {getStatusIcon(record.status)}
                                            <StatusBadge status={record.status} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[200px] truncate">
                                        {record.notes || <span className="opacity-20 italic">No notes</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Link
                                                to={`/attendance/mark?date=${record.business_date}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/70 hover:text-primary transition-all hover:underline"
                                            >
                                                Edit
                                            </Link>
                                            <Link
                                                to={`/employees/${record.employee_last_name}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all hover:underline"
                                            >
                                                Details
                                                <ChevronRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredAttendance.length === 0 && !isAttendanceLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Filter className="h-8 w-8 opacity-20" />
                                            <p>No attendance records found.</p>
                                            <button
                                                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                                                className="text-primary text-xs font-semibold hover:underline mt-2"
                                            >
                                                Clear filters
                                            </button>
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
