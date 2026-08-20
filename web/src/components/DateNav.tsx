import { useRef } from "react";
import { addDays, todayLocalDate } from "../lib/diary";
import "./DateNav.css";

export default function DateNav({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isToday = date === todayLocalDate();

  return (
    <div className="date-nav">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label="วันก่อนหน้า">
        ←
      </button>
      <button
        type="button"
        className="date-nav-label"
        onClick={() => {
          const input = inputRef.current;
          if (!input) return;
          if (typeof input.showPicker === "function") input.showPicker();
          else input.focus();
        }}
      >
        {new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        {isToday && <span className="date-nav-today-badge">วันนี้</span>}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="date-nav-input-hidden"
        aria-label="เลือกวันที่"
      />
      <button type="button" onClick={() => onChange(addDays(date, 1))} aria-label="วันถัดไป">
        →
      </button>
    </div>
  );
}
