import { useId, useState } from "react";

export default function CollapsiblePanel({
  ariaLabel,
  children,
  className = "",
  defaultExpanded = false,
  headerRight,
  subtitle,
  summary,
  title,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = useId();
  const panelClassName = ["collapsible-panel", expanded ? "is-expanded" : "is-collapsed", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={panelClassName}>
      <header className="collapsible-panel__header">
        <div className="collapsible-panel__heading">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
          {summary ? <div className="collapsible-panel__summary">{summary}</div> : null}
        </div>
        <div className="collapsible-panel__actions">
          {headerRight}
          <button
            aria-controls={bodyId}
            aria-expanded={expanded}
            aria-label={ariaLabel || `${title} ${expanded ? "접기" : "펼치기"}`}
            className="collapsible-panel__toggle"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
            </svg>
          </button>
        </div>
      </header>
      <div className="collapsible-panel__body" hidden={!expanded} id={bodyId}>
        {children}
      </div>
    </section>
  );
}
