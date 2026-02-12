import { useState, useEffect, useMemo } from "react";
import { useGetEmployeesQuery, useGetAttendanceQuery, useSubmitBulkAttendanceMutation } from "@/store/api/apiSlice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Clock,
    Search, Calendar, ChevronLeft, Save, Loader2,
    UserCheck, UserX, Info
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";

type Status = "Present" | "Absent" | "Late";

export default function MarkAttendance() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [search, setSearch] = useState("");
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: Status; notes: string }>>({});
    const [isModified, setIsModified] = useState(false);

    const { data: employees, isLoading: isEmployeesLoading } = useGetEmployeesQuery();
    const { data: existingAttendance } = useGetAttendanceQuery({
        start_date: selectedDate,
        end_date: selectedDate
    });

    const [submitBulk, { isLoading: isSubmitting }] = useSubmitBulkAttendanceMutation();

    // Initialize/Update map when data loads
    useEffect(() => {
        if (employees) {
            const newMap: Record<string, { status: Status; notes: string }> = {};
            employees.forEach(emp => {
                const key = `${emp.first_name}-${emp.last_name}`;
                // Default to Present
                newMap[key] = { status: "Present", notes: "" };
            });

            // Override with existing records
            if (existingAttendance) {
                existingAttendance.forEach(record => {
                    const key = `${record.employee_first_name}-${record.employee_last_name}`;
                    if (newMap[key]) {
                        newMap[key] = {
                            status: (record.status as Status) || "Present",
                            notes: record.notes || ""
                        };
                    }
                });
            }
            setAttendanceMap(newMap);
            setIsModified(false);
        }
    }, [employees, existingAttendance, selectedDate]);

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp =>
            emp.full_name.toLowerCase().includes(search.toLowerCase())
        );
    }, [employees, search]);

    const handleStatusChange = (firstName: string, lastName: string, status: Status) => {
        const key = `${firstName}-${lastName}`;
        setAttendanceMap(prev => ({
            ...prev,
            [key]: { ...prev[key], status }
        }));
        setIsModified(true);
    };

    const handleNoteChange = (firstName: string, lastName: string, notes: string) => {
        const key = `${firstName}-${lastName}`;
        setAttendanceMap(prev => ({
            ...prev,
            [key]: { ...prev[key], notes }
        }));
        setIsModified(true);
    };

    const handleSubmit = async () => {
        try {
            const records = Object.entries(attendanceMap).map(([key, data]) => {
                const [first_name, last_name] = key.split("-");
                return {
                    first_name,
                    last_name,
                    status: data.status,
                    notes: data.notes
                };
            });

            await submitBulk({
                business_date: selectedDate,
                records
            }).unwrap();

            toast.success("Attendance saved successfully!");
            setIsModified(false);
            navigate("/attendance");
        } catch (error) {
            console.error("Failed to save attendance:", error);
            toast.error("Failed to save attendance");
        }
    };

    const stats = useMemo(() => {
        const counts = { Present: 0, Absent: 0, Late: 0 };
        Object.values(attendanceMap).forEach(v => {
            if (v.status in counts) counts[v.status as keyof typeof counts]++;
        });
        return counts;
    }, [attendanceMap]);

    if (isEmployeesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Loading directory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/attendance")}
                        className="rounded-full hover:bg-secondary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mark Attendance</h1>
                        <p className="text-sm text-muted-foreground">Manual check-in for the team</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            max={format(new Date(), "yyyy-MM-dd")}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-9 bg-secondary/50 border-border/50 h-10 w-[180px]"
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isModified || isSubmitting}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-lg shadow-primary/20"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Attendance
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.entries(stats) as [Status, number][]).map(([status, count]) => (
                    <div key={status} className="glass-card p-3 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-muted-foreground mb-1">{status}</span>
                        <span className="text-xl font-bold">{count}</span>
                    </div>
                ))}
            </div>

            {/* Main Form */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background/50 border-border/50 h-10"
                        />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Showing {filteredEmployees.length} of {employees?.length} employees
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/10 border-b border-border/50">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold">Employee</th>
                                <th className="px-6 py-4 text-center font-semibold">Status</th>
                                <th className="px-6 py-4 text-left font-semibold">Notes / Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredEmployees.map((emp) => {
                                const key = `${emp.first_name}-${emp.last_name}`;
                                const current = attendanceMap[key] || { status: "Present", notes: "" };

                                return (
                                    <tr key={key} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <span className="font-medium text-foreground">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1.5 bg-secondary/30 p-1 rounded-xl w-fit mx-auto border border-border/50">
                                                {(["Present", "Absent", "Late"] as Status[]).map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleStatusChange(emp.first_name, emp.last_name, s)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                              ${current.status === s
                                                                ? s === "Present" ? "bg-status-success text-white shadow-md shadow-status-success/20"
                                                                    : s === "Absent" ? "bg-status-danger text-white shadow-md shadow-status-danger/20"
                                                                        : "bg-status-warning text-white shadow-md shadow-status-warning/20"
                                                                : "hover:bg-background text-muted-foreground"
                                                            }`}
                                                    >
                                                        {s === "Present" && <UserCheck className="h-3.5 w-3.5" />}
                                                        {s === "Absent" && <UserX className="h-3.5 w-3.5" />}
                                                        {s === "Late" && <Clock className="h-3.5 w-3.5" />}
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Input
                                                placeholder="Add note..."
                                                value={current.notes}
                                                onChange={(e) => handleNoteChange(emp.first_name, emp.last_name, e.target.value)}
                                                className="bg-background/50 border-border/50 h-9 text-xs"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
