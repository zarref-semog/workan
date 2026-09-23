export function ColorField({ label, value, onChange }) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className="form-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
