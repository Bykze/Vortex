import CrudPage from "@/components/CrudPage";

export default function PaymentsPage() {
  return (
    <CrudPage
      title="Paiements (SaaS)"
      apiPath="/api/tenants"
      canCreate={false}
      columns={[
        { key: "name", label: "École", render: (r: any) => <span className="font-semibold">{r.name}</span> },
        { key: "plan", label: "Plan" },
        { key: "status", label: "Statut" },
        { key: "expires_at", label: "Expiration", render: (r: any) => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
      ]}
      fields={[]}
    />
  );
}
