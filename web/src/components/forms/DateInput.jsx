import { useCallback, useId, useRef, useState } from "react";
import { FloatingPanel } from './FloatingPanel';
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { FormField } from "./FormField";

const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();

export function DateInput({ label, value, onChange, required, name, id, disabled, readOnly, hint, error }) {
  const generatedId = useId();
  const controlId = id || name || generatedId;
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDate(value));
  const close = useCallback(() => setOpen(false), []);
  const select = (next) => {
    onChange?.({ target: { value: next, name } });
    setOpen(false);
    trigger.current?.focus();
  };
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const selected = String(value || "").slice(0, 10);
  return <FormField id={controlId} label={label} hint={hint} error={error} required={required}>
    <div className="date-picker">
      <button ref={trigger} id={controlId} type="button" className="form-control date-trigger" disabled={disabled || readOnly}
        aria-haspopup="dialog" aria-expanded={open} onClick={() => { setMonth(parseDate(value)); setOpen(!open); }}>
        <span>{selected ? parseDate(selected).toLocaleDateString("pt-BR") : "Selecione uma data"}</span><Calendar size={17} />
      </button>
      {open && <FloatingPanel anchorRef={trigger} onClose={close} width={300} maxHeight={420} className="date-calendar" role="dialog" aria-label={`Selecionar ${label || "data"}`}>
        <header>
          <button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
          <strong aria-live="polite">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong>
          <button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
        </header>
        <div className="date-grid">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <small key={day}>{day}</small>)}
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
            const key = dateValue(date);
            return <button key={key} type="button" aria-label={date.toLocaleDateString("pt-BR")}
              aria-pressed={selected === key} aria-current={key === dateValue(new Date()) ? "date" : undefined}
              onClick={() => select(key)}>{index + 1}</button>;
          })}
        </div>
        <footer><button type="button" onClick={() => select(dateValue(new Date()))}>Hoje</button><button type="button" onClick={() => select("")}>Limpar</button></footer>
      </FloatingPanel>}
    </div>
  </FormField>;
}
