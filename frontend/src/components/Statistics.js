import React from 'react';
import './Statistics.css';

function Statistics({ stats }) {
  return (
    <div className="stats-container">
      <div className="stat-card scheduled">
        <div className="stat-icon">⏱️</div>
        <div className="stat-content">
          <div className="stat-value">{stats.scheduled}</div>
          <div className="stat-label">Scheduled</div>
        </div>
      </div>

      <div className="stat-card sent">
        <div className="stat-icon">✉️</div>
        <div className="stat-content">
          <div className="stat-value">{stats.sent}</div>
          <div className="stat-label">Sent</div>
        </div>
      </div>

      <div className="stat-card failed">
        <div className="stat-icon">⚠️</div>
        <div className="stat-content">
          <div className="stat-value">{stats.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>

      <div className="stat-card total">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
