import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";

import SchoolsPage from "@/pages/admin/SchoolsPage";
import AcademicYearsPage from "@/pages/admin/AcademicYearsPage";
import ClassesPage from "@/pages/admin/ClassesPage";
import SubjectsPage from "@/pages/admin/SubjectsPage";
import RulesPage from "@/pages/admin/RulesPage";
import TenantsPage from "@/pages/admin/TenantsPage";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import SettingsPage from "@/pages/admin/SettingsPage";

import GradesPage from "@/pages/teachers/GradesPage";
import AttendancePage from "@/pages/teachers/AttendancePage";
import EnrollmentsPage from "@/pages/teachers/EnrollmentsPage";

import StudentsPage from "@/pages/students/StudentsPage";
import StudentDetailPage from "@/pages/students/StudentDetailPage";
import ImportPage from "@/pages/students/ImportPage";

import RiskMonitorPage from "@/pages/monitoring/RiskMonitorPage";
import InterventionsPage from "@/pages/monitoring/InterventionsPage";
import AuditLogPage from "@/pages/monitoring/AuditLogPage";

import MyGradesPage from "@/pages/student/MyGradesPage";
import MyAttendancePage from "@/pages/student/MyAttendancePage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/admin/schools" element={<SchoolsPage />} />
        <Route path="/admin/years" element={<AcademicYearsPage />} />
        <Route path="/admin/classes" element={<ClassesPage />} />
        <Route path="/admin/subjects" element={<SubjectsPage />} />
        <Route path="/admin/rules" element={<RulesPage />} />
        <Route path="/admin/tenants" element={<TenantsPage />} />
        <Route path="/admin/payments" element={<PaymentsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />

        <Route path="/teachers/grades" element={<GradesPage />} />
        <Route path="/teachers/attendance" element={<AttendancePage />} />
        <Route path="/teachers/enrollments" element={<EnrollmentsPage />} />

        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/students/import" element={<ImportPage />} />

        <Route path="/monitoring/risk" element={<RiskMonitorPage />} />
        <Route path="/monitoring/interventions" element={<InterventionsPage />} />
        <Route path="/monitoring/audit" element={<AuditLogPage />} />

        <Route path="/my/grades" element={<MyGradesPage />} />
        <Route path="/my/attendance" element={<MyAttendancePage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
