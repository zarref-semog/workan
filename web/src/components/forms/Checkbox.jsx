import { Check } from "lucide-react";

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  ...inputProps
}) {
  return (
    <label className="checkbox-control">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        {...inputProps}
      />
      <span className="checkbox-box">
        <Check size={13} />
      </span>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}
