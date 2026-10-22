import { Card, PageHeader } from "@/components/ui";

export default function SharePage() {
  return (
    <>
      <PageHeader
        title="Share Studio"
        lede="Compose a selectively disclosed, opportunity-specific dossier for your review and export."
      />
      <Card>
        <p>
          <strong>Not built yet — Phase 1.</strong> Dossier composition, redaction preview and PDF/JSON
          export are scheduled for the Phase 1 vertical slice. Nothing is ever shared from this browser
          without an explicit action, and everything defaults to private.
        </p>
      </Card>
    </>
  );
}
