import CrudPage from "@/components/CrudPage";

export default function ClassesPage() {
  return (
    <CrudPage
      title="Classes"
      apiPath="/api/classes"
      columns={[
        { key: "name", label: "Nom", render: (r: any) => <span className="font-semibold">{r.name}</span> },
        { key: "level", label: "Niveau" },
        { key: "capacity", label: "Capacité" },
      ]}
      fields={[
        { name: "school_id", label: "École ID", required: true },
        { name: "academic_year_id", label: "Année académique ID", required: true },
        { name: "name", label: "Nom", required: true, default: "6ème A" },
        { name: "level", label: "Niveau", required: true, default: "college" },
        { name: "capacity", label: "Capacité", type: "number", default: 40 },
      ]}
    />
  );
}
