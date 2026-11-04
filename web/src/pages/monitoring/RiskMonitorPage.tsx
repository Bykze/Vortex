import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";

const riskColors: Record<string, string> = { low: "green", moderate: "yellow", high: "red", critical: "red" };

export default function RiskMonitorPage() {
  return (
    <CrudPage
      title="Système d'alerte précoce (EWS)"
      apiPath="/api/risk-scores"
      columns={[
        { key: "last_name", label: "Élève", render: (r: any) => <span className="font-semibold">{r.last_name} {r.first_name}</span> },
        { key: "matricule", label: "Matricule" },
        { key: "risk_level", label: "Niveau", render: (r: any) => <Badge color={riskColors[r.risk_level] || "gray"}>{r.risk_level}</Badge> },
        { key: "risk_score", label: "Score" },
        { key: "attendance_rate", label: "Assiduité", render: (r: any) => `${r.attendance_rate?.toFixed(0)}%` },
        { key: "absence_count", label: "Absences" },
      ]}
      fields={[
        { name: "student_id", label: "Élève ID", required: true },
        { name: "academic_year_id", label: "Année académique ID", required: true },
        { name: "risk_level", label: "Niveau", type: "select", options: [
          { value: "low", label: "Faible" }, { value: "moderate", label: "Modéré" },
          { value: "high", label: "Élevé" }, { value: "critical", label: "Critique" },
        ], default: "low" },
        { name: "risk_score", label: "Score (0-100)", type: "number", default: 0 },
        { name: "grade_trend", label: "Tendance notes", type: "number", default: 0 },
        { name: "attendance_rate", label: "Assiduité (%)", type: "number", default: 100 },
        { name: "late_count", label: "Retards", type: "number", default: 0 },
        { name: "absence_count", label: "Absences", type: "number", default: 0 },
      ]}
    />
  );
}
