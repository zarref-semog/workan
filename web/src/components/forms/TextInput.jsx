import { FormField } from "./FormField";
import { DateInput } from "./DateInput";

export function TextInput({
  label,
  hint,
  error,
  required,
  className = "",
  ...inputProps
}) {
  const id = inputProps.id ?? inputProps.name;
  if (inputProps.type === "date") return <DateInput label={label} hint={hint} error={error} required={required} {...inputProps} />;
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        className={`form-control ${className}`}
        id={id}
        required={required}
        {...inputProps}
      />
    </FormField>
  );
}

export function NumberInput({ label, hint, error, required, ...inputProps }) {
  return (
    <TextInput
      type="number"
      inputMode="numeric"
      label={label}
      hint={hint}
      error={error}
      required={required}
      {...inputProps}
    />
  );
}
