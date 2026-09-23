import { ArrowLeft } from "lucide-react";

export function PageHead({ eyebrow, title, subtitle, action, onBack }) {
  return (
    <div className="page-head">
      <div>
        {onBack && (
          <button className="back" onClick={onBack}>
            <ArrowLeft size={17} /> Voltar
          </button>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="head-actions">{action}</div>}
    </div>
  );
}

export function PanelTitle({ title, subtitle, action }) {
  return (
    <div className="panel-title">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
