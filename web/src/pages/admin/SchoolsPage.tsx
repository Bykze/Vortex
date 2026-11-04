import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";

export default function SchoolsPage() {
  return (
    <CrudPage
      title="Écoles"
      apiPath="/api/schools"
      columns={[
        { key: "name", label: "Nom", render: (r: any) => <span className="font-semibold">{r.name}</span> },
        { key: "code", label: "Code" },
        { key: "city", label: "Ville" },
        { key: "email", label: "Email" },
      ]}
      fields={[
        { name: "name", label: "Nom", required: true },
        { name: "code", label: "Code", required: true },
        { name: "address", label: "Adresse" },
        { name: "city", label: "Ville" },
        { name: "phone", label: "Téléphone" },
        { name: "email", label: "Email" },
      ]}
    />
  );
}
