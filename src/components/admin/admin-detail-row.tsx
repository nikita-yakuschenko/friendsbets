export {
  RecordCard as AdminRecordCard,
  RecordCardDetails as AdminCardDetails,
  RecordCardFooter as AdminCardFooter,
  RecordCardTitle as AdminCardTitle,
  RecordCardEmpty as AdminCardEmpty,
  RecordDetailRow as AdminDetailRow,
  RECORD_CARD_EMPTY_CLASS as ADMIN_LIST_EMPTY_CLASS,
} from "@/components/ui/record-card";

export function AdminSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium uppercase tracking-wide text-brand-muted">
      {children}
    </h2>
  );
}
