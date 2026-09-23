import { Check } from "lucide-react";

export function Toast({ message }) {
  return message ? (
    <div className="toast">
      <Check size={18} />
      {message}
    </div>
  ) : null;
}
