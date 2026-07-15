export function FlagMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`flag-mark ${compact ? "flag-mark-compact" : ""}`} aria-hidden="true">
      <i className="flag-cloth" />
      <i className="flag-pole" />
      <i className="flag-base" />
    </span>
  );
}
