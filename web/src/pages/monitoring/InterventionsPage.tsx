import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";

const statusColors: Record<string, string> = {
  proposed: "blue", approved: "yellow", active: "green", completed: "gray", cancelled: "red",
};

export default function InterventionsPage() {
  return (
    <CrudPage
      title="Interventions & Remédiation"
      apiPath="/api/interventions"
      columns={[
        { key: "last_name", label: "Élève", render: (r: any) => <span className="font-semibold">{r.last_name} {r.first_name}</span> },
        { key: "intervention_type", label: "Type" },
        { key: "status", label: "Statut", render: (r: any) => <Badge color={statusColors[r.status] || "gray"}>{r.status}</Badge> },
        { key: "description", label: "Description", render: (r: any) => <span className="text-xs truncate">{r.description || "—"}</span> },
      ]}
      fields={[
        { name: "student_id", label: "Élève ID", required: true },
        { name: "academic_year_id", label: "Année académique ID", required: true },
        { name: "intervention_type", label: "Type", type: "select", options: [
          { value: "remediation", label: "Remédiation" }, { value: "tutoring", label: "Tutorat" },
          { value: "counseling", label: "Conseil" }, { value: "parent_notification", label: "Notification parents" },
          { value: "disciplinary", label: "Disciplinaire" }, { value: "rattrapage", label: "Rattrapage" },
        ], default: "remediation" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "status", label: "Statut", type: "select", options: [
          { value: "proposed", label: "Proposée" }, { value: "approved", label: "Approuvée" },
          { value: "active", label: "Active" }, { value: "completed", label: "Terminée" }, { value: "cancelled", label: "Annulée" },
        ], default: "proposed" },
        { name: "start_date", label: "Date début", type: "date" },
        { name: "end_date", label: "Date fin", type: "date" },
      ]}
    />
  );
}
