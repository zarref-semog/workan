export function FormRow({ children, columns = 2 }) {
  return (
    <div className="form-row" style={{ "--columns": columns }}>
      {children}
    </div>
  );
}
