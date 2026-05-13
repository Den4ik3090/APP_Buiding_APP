import React, { useState, useEffect } from "react";
import "./LiveClock.css";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const dateStr = now.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const blinkClass = now.getSeconds() % 2 === 0 ? "live-clock__sep" : "live-clock__sep live-clock__sep--dim";

  return (
    <div className="live-clock" aria-label={`Текущее время: ${hours}:${minutes}:${seconds}`}>
      <div className="live-clock__time-row">
        <span className="live-clock__digits">{hours}</span>
        <span className={blinkClass}>:</span>
        <span className="live-clock__digits">{minutes}</span>
        <span className="live-clock__sep live-clock__sep--sm">{":"}</span>
        <span className="live-clock__seconds">{seconds}</span>
      </div>
      <div className="live-clock__date">{dateStr}</div>
    </div>
  );
}
