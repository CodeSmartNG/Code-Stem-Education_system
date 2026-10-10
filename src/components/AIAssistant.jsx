// src/components/AIAssistant.jsx
import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../utils/storageAPI';
import './AIAssistant.css';

const AIAssistant = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ Load saved conversation from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('ai_conversation');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (err) {
        // ignore
      }
    }
  }, []);

  // ✅ Save conversation
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('ai_conversation', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError('');
    setInput('');

    // Add user message
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await apiCall('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (response.success && response.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.reply },
        ]);
      } else {
        throw new Error(response.message || 'No reply from AI');
      }
    } catch (err) {
      console.error('AI error:', err);
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    if (!window.confirm('Clear conversation?')) return;
    setMessages([]);
    setError('');
    sessionStorage.removeItem('ai_conversation');
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
      {/* ✅ Floating AI button */}
      <button
        className="ai-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI Assistant"
        title="Ask AI"
      >
        <span className="ai-icon">🤖</span>
      </button>

      {/* ✅ Chat panel */}
      {isOpen && (
        <>
          <div className="ai-backdrop" onClick={() => setIsOpen(false)} />

          <div className="ai-panel">
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

            <div className="ai-messages">
              {messages.length === 0 && (
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
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                rows={1}
                maxLength={500}
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
