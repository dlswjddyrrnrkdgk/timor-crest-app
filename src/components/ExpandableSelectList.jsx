import { useState } from "react";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { formatItemCount } from "../i18n/translations.js";
import { getVisibleExpandableItems } from "../services/expandableSelectModel.js";

export default function ExpandableSelectList({
  defaultCollapsed = true,
  emptyMessage = "등록된 항목이 없습니다.",
  getItemId = (item) => item.id,
  items = [],
  maxHeight = 320,
  onSelect,
  renderActions,
  renderItem,
  renderPreviewItem,
  selectedId = "",
  title,
}) {
  const { language, t } = useLanguage();
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const visibleItems = getVisibleExpandableItems({ expanded, getItemId, items, selectedId });
  const listId = `expandable-list-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={`expandable-select ${expanded ? "is-expanded" : ""}`}>
      <header className="expandable-select-header">
        <div>
          <h2>{title}</h2>
          <small>{formatItemCount(items.length, language)}</small>
        </div>
        <button
          aria-controls={listId}
          aria-expanded={expanded}
          aria-label={`${title} ${expanded ? t("접기") : t("펼치기")}`}
          className="expand-toggle-button"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </header>
      <div
        className="expandable-select-list"
        id={listId}
        style={expanded ? { maxHeight } : undefined}
      >
        {visibleItems.length ? (
          visibleItems.map((item) => {
            const itemId = getItemId(item);
            const selected = itemId === selectedId;
            const preview = !expanded && Boolean(renderPreviewItem);
            return (
              <div className={`expandable-select-row ${preview ? "is-preview" : ""}`} key={itemId}>
                <button
                  className={`admin-record-card ${selected ? "is-selected" : ""}`}
                  onClick={() => onSelect?.(item)}
                  type="button"
                >
                  {preview ? renderPreviewItem(item, { selected }) : renderItem(item, { selected })}
                </button>
                {renderActions ? <div className="expandable-select-actions">{renderActions(item)}</div> : null}
              </div>
            );
          })
        ) : (
          <p>{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}
