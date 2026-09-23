import { FormField } from "./FormField";
import { CustomSelect } from "./CustomSelect";

export function SelectInput({
  label,
  options,
  hint,
  error,
  required,
  placeholder,
  value,
  onChange,
  id,
  name,
}) {
  const controlId = id ?? name;
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  return (
    <FormField
      id={controlId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <CustomSelect
        id={controlId}
        value={value}
        options={normalizedOptions}
        placeholder={placeholder}
        onChange={(nextValue) =>
          onChange?.({ target: { value: nextValue, name } })
        }
      />
    </FormField>
  );
}
