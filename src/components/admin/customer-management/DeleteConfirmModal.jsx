import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";

export default function DeleteConfirmModal({ busy, closeLabel, error, message, onClose, onConfirm, title, titleId, warning }) {
  return (
    <CustomerManagementModal closeLabel={closeLabel} onClose={onClose} title={title} titleId={titleId}>
      <div className="crm-cm-modal__body">
        <div className="crm-cm-modal__warning"><AdminIcon name="trash" size={18} /><p>{message}</p></div>
        {error ? <p className="crm-cm-modal__error" role="alert">{error}</p> : null}
        <p className="crm-cm-modal__hint">{warning}</p>
        <div className="crm-cm-modal__actions">
          <button className="secondary-button" disabled={busy} onClick={onClose} type="button">{closeLabel}</button>
          <button className="crm-cm-modal__danger" disabled={busy} onClick={onConfirm} type="button"><AdminIcon name="trash" size={14} />{busy ? "..." : title}</button>
        </div>
      </div>
    </CustomerManagementModal>
  );
}
