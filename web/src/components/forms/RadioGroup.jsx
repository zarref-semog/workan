import { FormField } from './FormField';

export function RadioGroup({ label, name, value, options, onChange }) {
  return (
    <FormField label={label}>
      <div className="radio-group" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label className={`radio-option ${value === option.value ? 'selected' : ''}`} key={option.value}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)}/>
            <span className="radio-mark"/>
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          </label>
        ))}
      </div>
    </FormField>
  );
}
