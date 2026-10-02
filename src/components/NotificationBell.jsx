import React, { useState, useEffect, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../utils/storageAPI';
import './NotificationBell.css';

const NotificationBell = ({ currentUser, setCurrentView }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);

  // Load notifications
  const loadAll = async () => {
    try {
      const [list, count] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);
      setNotifications(list);
      setUnread(count.count);
    } catch (err) {
      console.error('Notification load error:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadAll();
    // poll every 60 seconds
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) loadAll();
  };

  const handleClick = async (n) => {
    if (!n.isRead) {
      await markNotificationRead(n._id);
      setNotifications((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.link) {
      // navigate — adapt to your routing
      if (n.link.startsWith('/')) {
        window.history.pushState({}, '', n.link);
        // or use your setCurrentView logic
      } else {
        window.location.href = n.link;
      }
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const iconForType = (type) => {
    switch (type) {
      case 'new_course': return '📚';
      case 'new_lesson': return '📖';
      case 'quiz_result': return '📝';
      case 'payment_confirmation': return '💳';
      case 'teacher_approval': return '✅';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h4>Notifications</h4>
            {unread > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: 32 }}>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notif-icon">{iconForType(n.type)}</div>
                  <div className="notif-content">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
