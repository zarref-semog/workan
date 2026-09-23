import { useEffect, useId, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import { CustomSelect } from "../forms/CustomSelect";

export function FilterMenu({ children, active = false, onReset }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector("select, input, button")?.focus();
    const outside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="filter-menu" ref={container} onBlur={(event) => {
      // Clicking a checkbox label can briefly clear focus before activating its input.
      // Outside pointer clicks are handled separately; only close for a known outside focus target.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !event.relatedTarget.closest('[data-floating-panel]')) setOpen(false);
    }}>
      <button type="button" ref={trigger} className={`board-options-trigger filter-trigger${active ? " active" : ""}`}
        aria-label={active ? "Filtros (ativos)" : "Filtros"}
        title="Filtros" aria-expanded={open} aria-controls={id} aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}>
        <Filter size={19} />
        {active && <span className="filter-active-dot" />}
      </button>
      {open && <div className="filter-popover" id={id} ref={panel} role="dialog" aria-label="Filtros">
        <header><strong>Filtros</strong><button type="button" aria-label="Fechar filtros" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={17} /></button></header>
        {children}
        <button type="button" className="filter-reset" onClick={onReset}>Restaurar padrão</button>
      </div>}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  const id = useId();
  return <div className="filter-select-field">
    <label htmlFor={id}>{label}</label>
    <CustomSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options.map(([value, label]) => ({ value, label }))}
    />
  </div>;
}
