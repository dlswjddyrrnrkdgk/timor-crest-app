import AdminIcon from "../AdminIcon.jsx";
import { buildCalendarMonth, formatEventDateKey, getCalendarDayDots } from "../../../services/adminCustomerManagementModel.js";

export default function ScheduleCalendar({ events, language, month, onMonthChange, onSelectDate, selectedDate, t }) {
  const calendar = buildCalendarMonth(month.year, month.month);
  const todayKey = formatEventDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { month: "long", year: "numeric" }).format(new Date(month.year, month.month, 1));

  function selectToday() {
    const today = new Date();
    onSelectDate(formatEventDateKey(today));
    onMonthChange({ year: today.getFullYear(), month: today.getMonth() });
  }

  return (
    <div className="crm-cm-schedule-calendar">
      <div className="crm-cm-schedule-calendar__header">
        <div className="crm-cm-schedule-calendar__month-controls"><button aria-label={t("Previous Month")} className="crm-cm-calendar-nav" onClick={() => moveMonth(month, -1, onMonthChange)} type="button"><AdminIcon name="chevron" size={14} /></button><strong>{monthLabel}</strong><button aria-label={t("Next Month")} className="crm-cm-calendar-nav crm-cm-calendar-nav--next" onClick={() => moveMonth(month, 1, onMonthChange)} type="button"><AdminIcon name="chevron" size={14} /></button></div>
        <button className="crm-cm-calendar-today" onClick={selectToday} type="button">{t("Today")}</button>
      </div>
      <div className="crm-cm-schedule-calendar__weekdays" aria-hidden="true">{(language === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["일", "월", "화", "수", "목", "금", "토"]).map((day) => <span key={day}>{day}</span>)}</div>
      <div className="crm-cm-schedule-calendar__grid" role="grid" aria-label={monthLabel}>
        {calendar.cells.map((day, index) => {
          if (!day) return <span className="crm-cm-calendar-day crm-cm-calendar-day--empty" key={`empty-${index}`} />;
          const dateKey = `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dots = getCalendarDayDots(events, dateKey);
          const classes = ["crm-cm-calendar-day", dateKey === todayKey ? "is-today" : "", dateKey === selectedDate ? "is-selected" : "", dots.length ? "has-events" : ""].filter(Boolean).join(" ");
          return <button aria-label={`${dateKey}${dots.length ? `, ${dots.length} ${t("Upcoming")}` : ""}`} className={classes} key={dateKey} onClick={() => onSelectDate(dateKey)} role="gridcell" type="button"><span>{day}</span>{dots.length ? <i className="crm-cm-calendar-dots" aria-hidden="true">{dots.map((dot) => <b className={`is-${dot.type} is-${dot.status}`} key={`${dot.type}-${dot.status}`} />)}</i> : null}</button>;
        })}
      </div>
    </div>
  );
}

function moveMonth(month, offset, onMonthChange) {
  const next = new Date(month.year, month.month + offset, 1);
  onMonthChange({ year: next.getFullYear(), month: next.getMonth() });
}
