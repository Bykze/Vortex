export type UserRole = "super_admin" | "direction" | "staff" | "teacher" | "student" | "guardian";

export type StudentStatus =
  | "pre_admission" | "orientation" | "active" | "special_status"
  | "graduated" | "transferred" | "expelled";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
}

export interface School {
  id: string; tenant_id: string; name: string; code: string;
  address?: string; city?: string; phone?: string; email?: string;
}

export interface AcademicYear {
  id: string; tenant_id: string; school_id: string; name: string;
  start_date: string; end_date: string; is_current: boolean;
}

export interface ClassRoom {
  id: string; tenant_id: string; school_id: string; academic_year_id: string;
  name: string; level: string; capacity: number;
}

export interface Subject {
  id: string; tenant_id: string; school_id: string; name: string;
  code: string; coefficient: number;
}

export interface ClassSubject {
  id: string; tenant_id: string; class_id: string; subject_id: string;
  teacher_id?: string; subject_name?: string; subject_code?: string;
  class_name?: string; teacher_name?: string; coefficient?: number;
}

export interface Student {
  id: string; tenant_id: string; school_id: string; class_id?: string;
  user_id?: string; matricule: string; first_name: string; last_name: string;
  date_of_birth?: string; gender?: string; phone?: string; address?: string;
  status: StudentStatus; enrollment_date: string; previous_education?: string;
}

export interface GradeItem {
  id: string; tenant_id: string; class_subject_id: string; academic_year_id: string;
  title: string; grade_type: string; max_score: number; weight: number;
  period_closed: boolean;
}

export interface Grade {
  id: string; grade_item_id: string; student_id: string; score: number;
  is_absent: boolean; comment?: string; graded_by?: string; graded_at: string;
}

export interface AttendanceSession {
  id: string; tenant_id: string; class_subject_id: string;
  session_date: string; created_by?: string;
}

export interface AttendanceRecord {
  id: string; session_id: string; student_id: string;
  status: "present" | "absent" | "late" | "excused"; notes?: string;
}

export interface RiskScore {
  id: string; student_id: string; academic_year_id: string;
  risk_level: "low" | "moderate" | "high" | "critical";
  risk_score: number; grade_trend: number; attendance_rate: number;
  late_count: number; absence_count: number; assessed_at: string;
  first_name?: string; last_name?: string; matricule?: string;
}

export interface Intervention {
  id: string; student_id: string; academic_year_id: string;
  intervention_type: string; description?: string;
  status: "proposed" | "approved" | "active" | "completed" | "cancelled";
  assigned_to?: string; start_date?: string; end_date?: string; outcome?: string;
  first_name?: string; last_name?: string; matricule?: string;
}

export interface ProgressionRule {
  id: string; tenant_id: string; school_id?: string; rule_key: string;
  rule_name: string; rule_value: Record<string, unknown>; is_active: boolean;
}

export interface TenantSettings {
  tenant_id: string; plan: string; max_students: number;
  max_teachers: number; ai_enabled: boolean; school_name?: string;
  school_logo_url?: string; locale: string;
}

export interface Tenant {
  id: string; name: string; slug: string; plan: string;
  status: string; expires_at?: string;
}

export interface DashboardStats {
  students?: number; teachers?: number; classes?: number;
  subjects?: number; atRisk?: number; activeInterventions?: number;
}

export interface Guardian {
  id: string; student_id: string; full_name: string;
  phone?: string; email?: string; relation?: string;
}

export interface Enrollment {
  id: string; student_id: string; class_subject_id: string;
  academic_year_id: string; status: string; subject_name?: string;
}
