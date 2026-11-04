import CrudPage from "@/components/CrudPage";

export default function RulesPage() {
  return (
    <CrudPage
      title="Règles de progression"
      apiPath="/api/progression-rules"
      columns={[
        { key: "rule_name", label: "Règle", render: (r: any) => <span className="font-semibold">{r.rule_name}</span> },
        { key: "rule_key", label: "Clé", render: (r: any) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{r.rule_key}</code> },
        { key: "rule_value", label: "Valeur", render: (r: any) => <span className="text-xs">{JSON.stringify(r.rule_value)}</span> },
        { key: "is_active", label: "Statut", render: (r: any) => r.is_active ? "Active" : "Inactive" },
      ]}
      fields={[
        { name: "school_id", label: "École ID (optionnel)" },
        { name: "rule_key", label: "Clé technique", required: true, default: "passing_threshold" },
        { name: "rule_name", label: "Nom de la règle", required: true, default: "Seuil de passage" },
        { name: "rule_value", label: "Valeur (JSON)", type: "textarea", default: '{"passing_grade": 10, "max_repetitions": 2}' },
      ]}
    />
  );
}
