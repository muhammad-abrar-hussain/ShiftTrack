export interface ShiftPunch {
    id: number;
    shift_summary_id: number;
    start_datetime: string;
    end_datetime: string;
    duration_minutes: number | null;
    created_at: string;
}

export interface ShiftSummary {
    id: number;
    employee_first_name: string;
    employee_last_name: string;
    business_date: string;
    start_time: string | null;
    end_time: string | null;
    actual_working_hours: number | null;
    scheduled_working_hours: number | null;
    scheduled_break_hours: number | null;
    break_hours: number | null;
    created_at: string;
    updated_at: string;
    punches?: ShiftPunch[];
}

export interface Employee {
    first_name: string;
    last_name: string;
    full_name: string;
}

export interface EmployeeStats extends Employee {
    total_scheduled: number;
    total_actual: number;
    total_break: number;
    shift_count: number;
    overtime: number;
}

export interface EmployeeTrend {
    date: string;
    scheduled: number;
    actual: number;
    break: number;
}

export interface Alert {
    id: string;
    type: string;
    employeeName: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    date: string;
    suggestion: string;
}
