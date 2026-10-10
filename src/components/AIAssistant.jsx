// src/components/AIAssistant.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '../utils/storageAPI';
import './AIAssistant.css';

const MAX_INPUT_LENGTH = 500;

const AIAssistant = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const previousUserIdRef = useRef(null);

  const userId = currentUser?._id || currentUser?.id || null;

  // ============================================
  // Reset chat when the logged-in user changes
  // ============================================
  useEffect(() => {
    const prevId = previousUserIdRef.current;
    if (prevId && prevId !== userId) {
      // Different user in the same tab — wipe everything
      setMessages([]);
      setInput('');
      setError('');
      setIsLoading(false);
    }
    previousUserIdRef.current = userId;
  }, [userId]);

  // ============================================
  // Load history from the server (per-user, source of truth)
  // ============================================
  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    setIsFetchingHistory(true);
    setError('');

    apiCall('/ai/history', { method: 'GET' })
      .then((response) => {
        if (cancelled) return;
        if (response?.success && Array.isArray(response.messages)) {
          setMessages(
            response.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('History load error:', err);
        // Non-fatal — user can still chat
      })
      .finally(() => {
        if (!cancelled) setIsFetchingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ============================================
  // Send message
  // ============================================
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !userId) return;

    setError('');
    setInput('');

    const userMessage = { role: 'user', content: text };
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await apiCall('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: optimisticMessages }),
        signal: controller.signal,
      });

      if (response?.success && response.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.reply },
        ]);
      } else {
        throw new Error(response?.message || 'No reply from AI');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('AI error:', err);
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, userId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const clearConversation = async () => {
    if (!window.confirm('Clear conversation?')) return;
    try {
      await apiCall('/ai/history', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
    setMessages([]);
    setError('');
  };

  const suggestions = {
    student: [
      'Explain HTML in simple terms',
      'What is a variable in JavaScript?',
      'Help me understand React hooks',
    ],
    teacher: [
      'Write a lesson description for a React course',
      'Create 3 quiz questions about HTML',
      'Suggest a course outline for Python basics',
    ],
    admin: [
      'How do I analyze user growth?',
      'Suggest improvements for the platform',
      'Write an announcement about new courses',
    ],
  };

  const role = currentUser?.role || 'student';
  const roleSuggestions = suggestions[role] || suggestions.student;

  if (!currentUser) return null;

  return (
    <>
      <button
        className="ai-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI Assistant"
        title="Ask AI"
      >
        <span className="ai-icon">🤖</span>
      </button>

      {isOpen && (
        <>
          <div className="ai-backdrop" onClick={() => setIsOpen(false)} />

          <div className="ai-panel" role="dialog" aria-label="AI Assistant">
            <div className="ai-header">
              <div className="ai-header-title">
                <span className="ai-header-icon">🤖</span>
                <div>
                  <strong>AI Assistant</strong>
                  <small>{role.charAt(0).toUpperCase() + role.slice(1)} mode</small>
                </div>
              </div>
              <div className="ai-header-actions">
                {messages.length > 0 && (
                  <button
                    className="ai-clear-btn"
                    onClick={clearConversation}
                    title="Clear conversation"
                  >
                    🗑️
                  </button>
                )}
                <button
                  className="ai-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="ai-messages" role="log" aria-live="polite">
              {isFetchingHistory && messages.length === 0 && (
                <div className="ai-loading-history">Loading conversation…</div>
              )}

              {messages.length === 0 && !isFetchingHistory && (
                <div className="ai-welcome">
                  <div className="ai-welcome-icon">👋</div>
                  <h3>Hi! I'm your AI assistant</h3>
                  <p>
                    {role === 'student' && 'Ask me to explain any concept from your lessons.'}
                    {role === 'teacher' && 'I can help you create lesson content and quizzes.'}
                    {role === 'admin' && 'Ask me anything about running the platform.'}
                  </p>

                  <div className="ai-suggestions">
                    <p className="ai-suggestions-label">Try these:</p>
                    {roleSuggestions.map((s, i) => (
                      <button
                        key={i}
                        className="ai-suggestion-btn"
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`ai-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
                >
                  <div className="ai-message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="ai-message-content">
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-message assistant">
                  <div className="ai-message-avatar">🤖</div>
                  <div className="ai-message-content">
                    <div className="ai-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="ai-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="ai-input-bar">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                rows={1}
                maxLength={MAX_INPUT_LENGTH}
                disabled={isLoading}
              />
              <button
                className="ai-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label="Send"
              >
                {isLoading ? '...' : '➤'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AIAssistant;
