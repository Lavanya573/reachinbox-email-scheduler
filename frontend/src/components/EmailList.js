import React from 'react';
import './EmailList.css';

function EmailList({ emails, title }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { class: 'badge-scheduled', icon: '⏱️' },
      sent: { class: 'badge-sent', icon: '✓' },
      failed: { class: 'badge-failed', icon: '✗' },
    };
    const config = statusMap[status] || statusMap.scheduled;
    return (
      <span className={`badge ${config.class}`}>
        {config.icon} {status}
      </span>
    );
  };

  if (emails.length === 0) {
    return (
      <div className="email-list">
        <h2>{title}</h2>
        <div className="empty-state">
          <p>No emails found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-list">
      <h2>{title}</h2>
      <div className="table-container">
        <table className="emails-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>To</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Created</th>
              <th>Scheduled</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <tr key={email.id}>
                <td className="id-cell">{email.id}</td>
                <td>{email.to_email}</td>
                <td className="subject-cell">{email.subject}</td>
                <td>{getStatusBadge(email.status)}</td>
                <td className="date-cell">{formatDate(email.created_at)}</td>
                <td className="date-cell">{formatDate(email.scheduled_time)}</td>
                <td className="date-cell">{formatDate(email.sent_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmailList;
