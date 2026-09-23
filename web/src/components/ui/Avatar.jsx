export function Avatar({ person, small = false }) {
  return (
    <span
      className={`avatar ${small ? "small" : ""}`}
      style={{ background: "var(--teal)", color: "#fff" }}
    >
      {person?.initials || person?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"}
    </span>
  );
}
