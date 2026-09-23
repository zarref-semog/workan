
export function Badge({ children, color }) {
  return (
    <span
      className="badge"
      style={{ "--badge": color ?? "var(--teal)" }}
    >
      {children}
    </span>
  );
}
