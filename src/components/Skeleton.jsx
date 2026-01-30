// src/components/Skeleton.jsx
import React from 'react';
import '../style/Skeleton.css'; // Создадим ниже


const SkeletonLoader = ({ rows = 8 }) => (
  <div className="skeleton-container">
    <div className="skeleton-header">
      <div className="skeleton-title"></div>
      <div className="skeleton-buttons">
        <div className="skeleton-btn"></div>
        <div className="skeleton-btn"></div>
      </div>
    </div>
    
    <div className="skeleton-table">
      {Array(rows).fill().map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-photo"></div>
          <div className="skeleton-cell"></div>
          <div className="skeleton-cell short"></div>
          <div className="skeleton-cell"></div>
          <div className="skeleton-cell short"></div>
          <div className="skeleton-actions">
            <div className="skeleton-btn-small"></div>
            <div className="skeleton-btn-small"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonLoader;
