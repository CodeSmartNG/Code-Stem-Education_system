// src/components/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { apiCall, getCurrentUser } from '../utils/storageAPI';
import './ChatPage.css';

const POLL_INTERVAL = 3000;       // fetch messages every 3s
const HEARTBEAT_INTERVAL = 20000; // heartbeat every 20s
const ONLINE_POLL = 10000;        // refresh online users every 10s

const ChatPage = ({ currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState(null);

  const messagesEndRef = useRef(null);
  const lastTimestampRef = useRef(null);

  // ============================================
  // FETCH MESSAGES
  // ============================================
  const fetchMessages = async (initial = false) => {
    try {
      const since = lastTimestampRef.current;
      const url = since
        ? `/chat/messages?room=general&since=${encodeURIComponent(since)}`
        : '/chat/messages?room=general';

      const response = await apiCall(url);
      const newMessages = response.messages || [];

      if (initial) {
        setMessages(newMessages);
        if (newMessages.length > 0) {
          lastTimestampRef.current = newMessages[newMessages.length - 1].createdAt;
        }
      } else if (newMessages.length > 0) {
        setMessages((prev) => {
          // Avoid duplicates by _id
          const existingIds = new Set(prev.map((m) => m._id));
          const unique = newMessages.filter((m) => !existingIds.has(m._id));
          return [...prev, ...unique];
        });
        lastTimestampRef.current = newMessages[newMessages.length - 1].createdAt;
      }

      setLastFetched(new Date());
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  // ============================================
  // SEND MESSAGE
  // ============================================
  const sendMessage = async () => {
    if (!newText.trim() || sending) return;
    setSending(true);
    setError('');

    try {
      await apiCall('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          text: newText.trim(),
          room: 'general',
        }),
      });
      setNewText('');
      await fetchMessages(false);
    } catch (err) {
      console.error('Send error:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // DELETE MESSAGE
  // ============================================
  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await apiCall(`/chat/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.map((m) =>
        m._id === id ? { ...m, deleted: true, text: '[deleted]' } : m
      ));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ============================================
  // HEARTBEAT
  // ============================================
  const sendHeartbeat = async () => {
    try {
      await apiCall('/chat/heartbeat', { method: 'POST' });
    } catch (err) {
      // silent
    }
  };

  // ============================================
  // FETCH ONLINE USERS
  // ============================================
  const fetchOnlineUsers = async () => {
    try {
      const response = await apiCall('/chat/online-users');
      setOnlineUsers(response.users || []);
    } catch (err) {
      // silent
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchMessages(true);
    fetchOnlineUsers();
    sendHeartbeat();

    const msgTimer = setInterval(() => fetchMessages(false), POLL_INTERVAL);
    const heartTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    const onlineTimer = setInterval(fetchOnlineUsers, ONLINE_POLL);

    return () => {
      clearInterval(msgTimer);
      clearInterval(heartTimer);
      clearInterval(onlineTimer);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canDelete = (msg) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'teacher') return true;
    return msg.sender === currentUser.id || msg.sender === currentUser._id;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="chat-page">
      <div className="chat-main">
        <div className="chat-header">
          <h2>💬 General Chat</h2>
          <span className="chat-status">
            {onlineUsers.length} online
          </span>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>No messages yet. Say hello! 👋</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`chat-message ${msg.senderRole} ${
                msg.sender === currentUser?.id || msg.sender === currentUser?._id
                  ? 'own'
                  : ''
              }`}
            >
              <div className="chat-message-header">
                <span className="chat-sender">{msg.senderName}</span>
                <span className={`chat-role-badge ${msg.senderRole}`}>
                  {msg.senderRole}
                </span>
                <span className="chat-time">{formatTime(msg.createdAt)}</span>
                {canDelete(msg) && !msg.deleted && (
                  <button
                    className="chat-delete-btn"
                    onClick={() => deleteMessage(msg._id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {msg.replyTo && (
                <div className="chat-reply-preview">
                  ↪ {msg.replyTo.senderName}: {msg.replyTo.text?.slice(0, 60)}
                </div>
              )}

              <div className={`chat-text ${msg.deleted ? 'deleted' : ''}`}>
                {msg.text}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="chat-input-bar">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            maxLength={1000}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newText.trim() || sending}
            className="chat-send-btn"
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>

      <div className="chat-sidebar">
        <h3>🟢 Online Users</h3>
        {onlineUsers.length === 0 ? (
          <p className="chat-empty-small">No one else online</p>
        ) : (
          <ul className="online-list">
            {onlineUsers.map((u) => (
              <li key={u.userId}>
                <span className={`online-dot ${u.role}`} />
                <span className="online-name">{u.userName}</span>
                <span className={`online-role ${u.role}`}>{u.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
