import { useCallback, useRef, useState } from "react";
import { FloatingPanel } from './FloatingPanel';

export function CustomSelect({
  id,
  value,
  options,
  placeholder = "Selecione...",
  onChange,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const selected = options.find((option) => option.value === value);
  const select = (option) => {
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className="custom-select">
      <button
        ref={trigger}
        id={id}
        aria-label={ariaLabel}
        type="button"
        className={`select-selected ${open ? "select-arrow-active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected?.label ?? placeholder}
      </button>
      {open && <FloatingPanel anchorRef={trigger} onClose={close} maxHeight={220}
        className="select-items"
        role="listbox"
        aria-labelledby={id}
      >
        {options.map((option) => (
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            className={option.value === value ? "same-as-selected" : ""}
            key={option.value}
            onClick={() => select(option)}
          >
            {option.label}
          </button>
        ))}
      </FloatingPanel>}
    </div>
  );
}
