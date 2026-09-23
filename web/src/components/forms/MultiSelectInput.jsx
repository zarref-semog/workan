import { useCallback, useRef, useState } from "react";
import { FloatingPanel } from './FloatingPanel';
import { Check, ChevronDown, X } from "lucide-react";
import { FormField } from "./FormField";

export function MultiSelectInput({
  label,
  options,
  value = [],
  onChange,
  placeholder = "Selecione...",
  hint,
}) {
  const [open, setOpen] = useState(false);
  const normalizedOptions = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  const trigger = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = (option) =>
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  return (
    <FormField label={label} hint={hint}>
      <div className="multi-select">
        <button
          ref={trigger}
          className="form-control multi-select-trigger"
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
        >
          {value.length ? (
            <span className="multi-values">
              {value.map((item) => (
                <span key={item}>
                  {normalizedOptions.find((option) => option.value === item)?.label || item}
                  <X
                    size={11}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(item);
                    }}
                  />
                </span>
              ))}
            </span>
          ) : (
            <span className="multi-placeholder">{placeholder}</span>
          )}
          <ChevronDown size={16} />
        </button>
        {open && (
          <FloatingPanel anchorRef={trigger} onClose={close} maxHeight={240} className="multi-select-menu" role="listbox" aria-label={label} aria-multiselectable="true">
            {normalizedOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={value.includes(option.value)}
                className={value.includes(option.value) ? "selected" : ""}
                onClick={() => toggle(option.value)}
              >
                <span className="checkbox-box">
                  <Check size={13} />
                </span>
                {option.label}
              </button>
            ))}
          </FloatingPanel>
        )}
      </div>
    </FormField>
  );
}
