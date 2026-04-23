import React from 'react';

function StatusBadge({ expired, warning, days }) {
  // Определяем статус согласно плану
  if (expired) {
    return (
      <span className="badge badge-expired">
        🔴 Просрочен ({days} дн.)
      </span>
    );
  }

  if (warning) {
    return (
      <span className="badge badge-warning">
        🟡 Скоро истекает ({days} дн.)
      </span>
    );
  }

  return (
    <span className="badge badge-valid">
      🟢 Актуален ({days} дн.)
    </span>
  );
}

export default StatusBadge;