import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Overview from "./pages/Overview";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import ShiftAnalytics from "./pages/ShiftAnalytics";
import Alerts from "./pages/Alerts";
import Attendance from "./pages/Attendance";
import MarkAttendance from "./pages/MarkAttendance";
import Upload from "./pages/Upload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/shift-analytics" element={<ShiftAnalytics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/mark" element={<MarkAttendance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
