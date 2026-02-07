import React, { useState } from 'react';
import './ScheduleForm.css';

function ScheduleForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
    scheduledTime: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.to) {
      newErrors.to = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.to)) {
      newErrors.to = 'Invalid email address';
    }

    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.body) {
      newErrors.body = 'Email body is required';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    } else {
      const scheduledTime = new Date(formData.scheduledTime).getTime() / 1000;
      const now = Math.floor(Date.now() / 1000);
      if (scheduledTime <= now) {
        newErrors.scheduledTime = 'Scheduled time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const scheduledTime = Math.floor(new Date(formData.scheduledTime).getTime() / 1000);

    onSubmit({
      to: formData.to,
      subject: formData.subject,
      body: formData.body,
      scheduledTime,
    });

    // Reset form
    setFormData({
      to: '',
      subject: '',
      body: '',
      scheduledTime: '',
    });
  };

  // Calculate minimum datetime (current time + 1 minute)
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const minDateTime = now.toISOString().slice(0, 16);

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <h2>Schedule a New Email</h2>

      <div className="form-group">
        <label htmlFor="to">Recipient Email</label>
        <input
          type="email"
          id="to"
          name="to"
          value={formData.to}
          onChange={handleChange}
          placeholder="recipient@example.com"
          className={errors.to ? 'error' : ''}
        />
        {errors.to && <span className="error-text">{errors.to}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="subject">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Email subject"
          className={errors.subject ? 'error' : ''}
        />
        {errors.subject && <span className="error-text">{errors.subject}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="body">Email Body</label>
        <textarea
          id="body"
          name="body"
          value={formData.body}
          onChange={handleChange}
          placeholder="Type your email message here..."
          rows="6"
          className={errors.body ? 'error' : ''}
        />
        {errors.body && <span className="error-text">{errors.body}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="scheduledTime">Scheduled Send Time</label>
        <input
          type="datetime-local"
          id="scheduledTime"
          name="scheduledTime"
          value={formData.scheduledTime}
          onChange={handleChange}
          min={minDateTime}
          className={errors.scheduledTime ? 'error' : ''}
        />
        {errors.scheduledTime && <span className="error-text">{errors.scheduledTime}</span>}
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Scheduling...' : 'Schedule Email'}
      </button>
    </form>
  );
}

export default ScheduleForm;
