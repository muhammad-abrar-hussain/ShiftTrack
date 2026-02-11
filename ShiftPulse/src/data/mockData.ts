export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface ClockSession {
  clockIn: string;
  clockOut: string | null;
}

export interface BreakSession {
  start: string;
  end: string;
  duration: number; // hours
}

export interface ShiftEntry {
  id: string;
  employeeId: string;
  businessDate: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledHours: number;
  actualHours: number;
  breakHours: number;
  overtime: number;
  clockSessions: ClockSession[];
  breakSessions: BreakSession[];
  status: 'on-time' | 'late' | 'early-out' | 'missed' | 'unscheduled' | 'no-clock-out';
  shiftType: 'morning' | 'evening' | 'night';
  compliance: number; // 0-100
}

export interface Alert {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export const employees: Employee[] = [
  { id: "e1", name: "Scarlett Acuna", role: "Line Cook", initials: "SA" },
  { id: "e2", name: "Marcus Chen", role: "Server", initials: "MC" },
  { id: "e3", name: "Priya Patel", role: "Sous Chef", initials: "PP" },
  { id: "e4", name: "David Okafor", role: "Bartender", initials: "DO" },
  { id: "e5", name: "Emma Rodriguez", role: "Host", initials: "ER" },
  { id: "e6", name: "James Wilson", role: "Line Cook", initials: "JW" },
  { id: "e7", name: "Sofia Martinez", role: "Server", initials: "SM" },
  { id: "e8", name: "Liam Novak", role: "Dishwasher", initials: "LN" },
  { id: "e9", name: "Aria Kim", role: "Pastry Chef", initials: "AK" },
  { id: "e10", name: "Noah Thompson", role: "Manager", initials: "NT" },
  { id: "e11", name: "Zara Hughes", role: "Server", initials: "ZH" },
  { id: "e12", name: "Carlos Rivera", role: "Prep Cook", initials: "CR" },
];

function generateShifts(): ShiftEntry[] {
  const shifts: ShiftEntry[] = [];
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 1, 11 - i);
    return d.toISOString().split("T")[0];
  });

  const shiftTemplates = [
    { type: 'morning' as const, schedStart: '06:00', schedEnd: '14:00', hours: 8 },
    { type: 'evening' as const, schedStart: '14:00', schedEnd: '22:00', hours: 8 },
    { type: 'night' as const, schedStart: '22:00', schedEnd: '06:00', hours: 8 },
  ];

  let sid = 0;
  for (const emp of employees) {
    for (const date of dates) {
      // ~80% chance employee works each day
      if (Math.random() > 0.8) {
        // Missed shift (10% of skipped)
        if (Math.random() < 0.3) {
          const tmpl = shiftTemplates[Math.floor(Math.random() * 2)];
          shifts.push({
            id: `s${sid++}`,
            employeeId: emp.id,
            businessDate: date,
            scheduledStart: `${date}T${tmpl.schedStart}:00`,
            scheduledEnd: `${date}T${tmpl.schedEnd}:00`,
            scheduledHours: tmpl.hours,
            actualHours: 0,
            breakHours: 0,
            overtime: 0,
            clockSessions: [],
            breakSessions: [],
            status: 'missed',
            shiftType: tmpl.type,
            compliance: 0,
          });
        }
        continue;
      }

      const tmpl = shiftTemplates[Math.floor(Math.random() * 2)];
      const lateMin = Math.random() < 0.15 ? Math.floor(Math.random() * 30) + 5 : 0;
      const earlyOutMin = Math.random() < 0.1 ? Math.floor(Math.random() * 45) + 10 : 0;
      const overtimeMin = Math.random() < 0.2 ? Math.floor(Math.random() * 90) + 15 : 0;

      const actualHours = Math.max(0, tmpl.hours - (lateMin + earlyOutMin) / 60 + overtimeMin / 60);
      const breakHours = Math.random() < 0.85 ? (0.25 + Math.random() * 0.75) : 0;
      const breakTooLong = breakHours > 0.9;

      let status: ShiftEntry['status'] = 'on-time';
      if (lateMin > 10) status = 'late';
      else if (earlyOutMin > 15) status = 'early-out';

      const compliance = Math.max(0, Math.min(100,
        100 - Math.abs(actualHours - tmpl.hours) * 8 - lateMin * 0.5 - earlyOutMin * 0.3
      ));

      const schedStartH = parseInt(tmpl.schedStart.split(':')[0]);
      const inH = schedStartH + Math.floor(lateMin / 60);
      const inM = lateMin % 60;
      const outH = (schedStartH + tmpl.hours + Math.floor(overtimeMin / 60) - Math.floor(earlyOutMin / 60) + 24) % 24;

      const clockIn = `${date}T${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}:00`;
      const clockOut = `${date}T${String(outH).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;

      const breakSessions: BreakSession[] = breakHours > 0 ? [{
        start: `${date}T${String((schedStartH + 4) % 24).padStart(2, '0')}:00:00`,
        end: `${date}T${String((schedStartH + 4) % 24).padStart(2, '0')}:${String(Math.floor(breakHours * 60)).padStart(2, '0')}:00`,
        duration: breakHours,
      }] : [];

      // Occasionally add split shifts
      const isSplit = Math.random() < 0.08;

      shifts.push({
        id: `s${sid++}`,
        employeeId: emp.id,
        businessDate: date,
        scheduledStart: `${date}T${tmpl.schedStart}:00`,
        scheduledEnd: `${date}T${tmpl.schedEnd}:00`,
        scheduledHours: tmpl.hours,
        actualHours: Math.round(actualHours * 100) / 100,
        breakHours: Math.round(breakHours * 100) / 100,
        overtime: Math.round((overtimeMin / 60) * 100) / 100,
        clockSessions: isSplit ? [
          { clockIn, clockOut: `${date}T${String((schedStartH + 4) % 24).padStart(2, '0')}:00:00` },
          { clockIn: `${date}T${String((schedStartH + 5) % 24).padStart(2, '0')}:00:00`, clockOut },
        ] : [{ clockIn, clockOut }],
        breakSessions,
        status,
        shiftType: tmpl.type,
        compliance: Math.round(compliance),
      });
    }
  }
  return shifts;
}

export const shifts: ShiftEntry[] = generateShifts();

export function getEmployeeStats(employeeId: string) {
  const empShifts = shifts.filter(s => s.employeeId === employeeId);
  const totalScheduled = empShifts.reduce((a, s) => a + s.scheduledHours, 0);
  const totalActual = empShifts.reduce((a, s) => a + s.actualHours, 0);
  const totalBreak = empShifts.reduce((a, s) => a + s.breakHours, 0);
  const totalOvertime = empShifts.reduce((a, s) => a + s.overtime, 0);
  const lateCount = empShifts.filter(s => s.status === 'late').length;
  const missedCount = empShifts.filter(s => s.status === 'missed').length;
  const avgCompliance = empShifts.length > 0
    ? empShifts.reduce((a, s) => a + s.compliance, 0) / empShifts.length : 0;
  const workedShifts = empShifts.filter(s => s.actualHours > 0);
  const avgBreak = workedShifts.length > 0
    ? totalBreak / workedShifts.length : 0;
  const avgShiftLength = workedShifts.length > 0
    ? totalActual / workedShifts.length : 0;

  return {
    totalScheduled: Math.round(totalScheduled * 10) / 10,
    totalActual: Math.round(totalActual * 10) / 10,
    totalBreak: Math.round(totalBreak * 10) / 10,
    totalOvertime: Math.round(totalOvertime * 10) / 10,
    lateCount,
    missedCount,
    avgCompliance: Math.round(avgCompliance),
    attendance: empShifts.length > 0
      ? Math.round(((empShifts.length - missedCount) / empShifts.length) * 100) : 0,
    avgBreak: Math.round(avgBreak * 100) / 100,
    avgShiftLength: Math.round(avgShiftLength * 10) / 10,
    shifts: empShifts,
  };
}

export function getTodayStats() {
  const today = '2026-02-11';
  const todayShifts = shifts.filter(s => s.businessDate === today);
  const workedToday = todayShifts.filter(s => s.actualHours > 0);
  return {
    totalEmployees: new Set(workedToday.map(s => s.employeeId)).size,
    totalLaborHours: Math.round(workedToday.reduce((a, s) => a + s.actualHours, 0) * 10) / 10,
    totalScheduledHours: Math.round(todayShifts.reduce((a, s) => a + s.scheduledHours, 0) * 10) / 10,
    totalBreakHours: Math.round(workedToday.reduce((a, s) => a + s.breakHours, 0) * 10) / 10,
    totalOvertime: Math.round(workedToday.reduce((a, s) => a + s.overtime, 0) * 10) / 10,
    missedShifts: todayShifts.filter(s => s.status === 'missed').length,
    lateClockIns: todayShifts.filter(s => s.status === 'late').length,
    earlyClockOuts: todayShifts.filter(s => s.status === 'early-out').length,
    onShiftNow: Math.floor(workedToday.length * 0.4),
  };
}

export function getDailyTrend() {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 1, 11 - (13 - i));
    return d.toISOString().split("T")[0];
  });

  return dates.map(date => {
    const dayShifts = shifts.filter(s => s.businessDate === date);
    const worked = dayShifts.filter(s => s.actualHours > 0);
    return {
      date: date.slice(5),
      scheduled: Math.round(dayShifts.reduce((a, s) => a + s.scheduledHours, 0) * 10) / 10,
      actual: Math.round(worked.reduce((a, s) => a + s.actualHours, 0) * 10) / 10,
      breaks: Math.round(worked.reduce((a, s) => a + s.breakHours, 0) * 10) / 10,
      overtime: Math.round(worked.reduce((a, s) => a + s.overtime, 0) * 10) / 10,
    };
  });
}

export function getLaborByEmployee() {
  return employees.map(emp => {
    const stats = getEmployeeStats(emp.id);
    return {
      name: emp.name.split(' ')[0],
      fullName: emp.name,
      actual: stats.totalActual,
      scheduled: stats.totalScheduled,
      overtime: stats.totalOvertime,
    };
  }).sort((a, b) => b.actual - a.actual);
}

export function getHeatmapData() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data: { day: string; hour: number; value: number }[] = [];

  for (const day of days) {
    for (const hour of hours) {
      // Restaurant pattern: busy lunch (11-14) and dinner (18-22)
      let base = 1;
      if (hour >= 11 && hour <= 14) base = 6 + Math.random() * 4;
      else if (hour >= 18 && hour <= 22) base = 8 + Math.random() * 4;
      else if (hour >= 8 && hour <= 23) base = 2 + Math.random() * 3;
      else base = Math.random() * 2;
      // Weekends busier
      if (day === 'Fri' || day === 'Sat') base *= 1.3;
      data.push({ day, hour, value: Math.round(base * 10) / 10 });
    }
  }
  return data;
}

export function generateAlerts(): Alert[] {
  const alertTypes = [
    { type: 'Late Clock-in', severity: 'medium' as const, suggestion: 'Review scheduling or address tardiness pattern' },
    { type: 'Early Clock-out', severity: 'medium' as const, suggestion: 'Verify with employee, adjust schedule if needed' },
    { type: 'Missed Shift', severity: 'high' as const, suggestion: 'Contact employee immediately, arrange coverage' },
    { type: 'Excessive Break', severity: 'low' as const, suggestion: 'Remind employee of break policy' },
    { type: 'No Break Taken', severity: 'medium' as const, suggestion: 'Ensure compliance with labor law break requirements' },
    { type: 'Unscheduled Shift', severity: 'low' as const, suggestion: 'Update schedule to reflect actual working pattern' },
    { type: 'Missing Clock-out', severity: 'high' as const, suggestion: 'Contact employee, manually adjust timecard' },
    { type: 'Excessive Overtime', severity: 'medium' as const, suggestion: 'Review staffing levels, redistribute workload' },
  ];

  const alerts: Alert[] = [];
  let aid = 0;
  for (const shift of shifts) {
    const emp = employees.find(e => e.id === shift.employeeId)!;
    if (shift.status === 'late') {
      alerts.push({
        id: `a${aid++}`, employeeId: shift.employeeId, employeeName: emp.name,
        date: shift.businessDate, ...alertTypes[0],
        message: `${emp.name} clocked in late on ${shift.businessDate}`,
      });
    }
    if (shift.status === 'missed') {
      alerts.push({
        id: `a${aid++}`, employeeId: shift.employeeId, employeeName: emp.name,
        date: shift.businessDate, ...alertTypes[2],
        message: `${emp.name} missed their scheduled shift on ${shift.businessDate}`,
      });
    }
    if (shift.breakHours > 0.9) {
      alerts.push({
        id: `a${aid++}`, employeeId: shift.employeeId, employeeName: emp.name,
        date: shift.businessDate, ...alertTypes[3],
        message: `${emp.name} took ${Math.round(shift.breakHours * 60)}min break (exceeds 45min policy)`,
      });
    }
    if (shift.actualHours > 0 && shift.breakHours === 0 && shift.scheduledHours >= 6) {
      alerts.push({
        id: `a${aid++}`, employeeId: shift.employeeId, employeeName: emp.name,
        date: shift.businessDate, ...alertTypes[4],
        message: `${emp.name} worked ${shift.actualHours.toFixed(1)}h without a break`,
      });
    }
    if (shift.overtime > 1) {
      alerts.push({
        id: `a${aid++}`, employeeId: shift.employeeId, employeeName: emp.name,
        date: shift.businessDate, ...alertTypes[7],
        message: `${emp.name} worked ${shift.overtime.toFixed(1)}h overtime`,
      });
    }
  }
  return alerts.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity] || b.date.localeCompare(a.date);
  }).slice(0, 50);
}

export const alerts = generateAlerts();

export const insights = [
  { text: "Break time increased 18% this week", trend: "up" as const, type: "warning" as const },
  { text: "3 employees worked unscheduled shifts", trend: "neutral" as const, type: "info" as const },
  { text: "Scarlett Acuna has the highest overtime this month", trend: "up" as const, type: "warning" as const },
  { text: "Average schedule accuracy: 86%", trend: "neutral" as const, type: "success" as const },
  { text: "Late clock-ins down 12% vs last week", trend: "down" as const, type: "success" as const },
];
