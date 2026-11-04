import CrudPage from "@/components/CrudPage";

export default function SubjectsPage() {
  return (
    <CrudPage
      title="Matières"
      apiPath="/api/subjects"
      columns={[
        { key: "name", label: "Nom", render: (r: any) => <span className="font-semibold">{r.name}</span> },
        { key: "code", label: "Code" },
        { key: "coefficient", label: "Coefficient" },
      ]}
      fields={[
        { name: "school_id", label: "École ID", required: true },
        { name: "name", label: "Nom", required: true },
        { name: "code", label: "Code", required: true },
        { name: "coefficient", label: "Coefficient", type: "number", default: 1.0 },
      ]}
    />
  );
}
