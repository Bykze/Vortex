import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";

export default function AcademicYearsPage() {
  return (
    <CrudPage
      title="Années académiques"
      apiPath="/api/academic-years"
      columns={[
        { key: "name", label: "Nom", render: (r: any) => <span className="font-semibold">{r.name}</span> },
        { key: "start_date", label: "Début" },
        { key: "end_date", label: "Fin" },
        { key: "is_current", label: "Statut", render: (r: any) => r.is_current ? <Badge color="green">En cours</Badge> : <Badge color="gray">Inactif</Badge> },
      ]}
      fields={[
        { name: "school_id", label: "École ID", required: true },
        { name: "name", label: "Nom", required: true, default: "2026-2027" },
        { name: "start_date", label: "Date de début", type: "date", required: true },
        { name: "end_date", label: "Date de fin", type: "date", required: true },
        { name: "is_current", label: "En cours", type: "select", options: [{ value: "true", label: "Oui" }, { value: "false", label: "Non" }], default: "true" },
      ]}
    />
  );
}
