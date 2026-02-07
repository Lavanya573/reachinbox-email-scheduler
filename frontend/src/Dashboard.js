import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import ScheduleForm from './components/ScheduleForm';
import EmailList from './components/EmailList';
import Statistics from './components/Statistics';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEmails();
    fetchStats();
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchEmails();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/emails`);
      setEmails(response.data.data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/emails/stats/summary`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleScheduleEmail = async (formData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/emails/schedule`, formData);
      setMessage({
        type: 'success',
        text: `Email scheduled successfully! ID: ${response.data.data.id}`,
      });
      fetchEmails();
      fetchStats();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to schedule email',
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduledEmails = emails.filter(e => e.status === 'scheduled');
  const sentEmails = emails.filter(e => e.status === 'sent');

  return (
    <div className="dashboard">
      <header className="header">
        <h1>📧 Email Job Scheduler</h1>
        <p>Production-grade email scheduling with BullMQ &amp; Redis</p>
      </header>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {stats && <Statistics stats={stats} />}

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule Email
        </button>
        <button
          className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled ({scheduledEmails.length})
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent ({sentEmails.length})
        </button>
      </nav>

      <main className="content">
        {activeTab === 'schedule' && (
          <ScheduleForm onSubmit={handleScheduleEmail} loading={loading} />
        )}
        {activeTab === 'scheduled' && (
          <EmailList emails={scheduledEmails} title="Scheduled Emails" />
        )}
        {activeTab === 'sent' && (
          <EmailList emails={sentEmails} title="Sent Emails" />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
