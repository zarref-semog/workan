import { ErrorToast } from "../ui/ErrorToast";
export function FormField({ id, label, hint, error, required, children }) {
  return (
    <div className={`form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <ErrorToast message={error} />
      ) : (
        hint && <small className="field-hint">{hint}</small>
      )}
    </div>
  );
}
