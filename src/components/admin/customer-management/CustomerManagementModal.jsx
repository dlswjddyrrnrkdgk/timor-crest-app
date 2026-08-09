import { useEffect, useRef } from "react";
import AdminIcon from "../AdminIcon.jsx";

export default function CustomerManagementModal({ children, closeLabel, description, onClose, title, titleId }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => dialog?.querySelector(focusableSelector)?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  return (
    <div className="crm-cm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <div aria-describedby={description ? `${titleId}-description` : undefined} aria-labelledby={titleId} aria-modal="true" className="crm-cm-modal" onMouseDown={(event) => event.stopPropagation()} ref={dialogRef} role="dialog">
        <header className="crm-cm-modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={`${titleId}-description`}>{description}</p> : null}
          </div>
          <button aria-label={closeLabel} className="crm-cm-modal__close" onClick={onClose} type="button"><AdminIcon name="close" size={16} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}
