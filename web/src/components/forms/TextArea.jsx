import { FormField } from "./FormField";

export function TextArea({
  label,
  hint,
  error,
  required,
  rows = 4,
  ...textareaProps
}) {
  const id = textareaProps.id ?? textareaProps.name;
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        className="form-control"
        id={id}
        rows={rows}
        required={required}
        {...textareaProps}
      />
    </FormField>
  );
}
