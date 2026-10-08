// src/components/Navigation.jsx
import React, { useState } from 'react';
import NotificationBell from './NotificationBell';
import './Navigation.css';

const Navigation = ({ 
  currentView, 
  setCurrentView, 
  currentUser, 
  onLogout, 
  isAdmin, 
  isTeacher 
}) => {
  const [showMoreLinks, setShowMoreLinks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Role detection
  const userRole = currentUser?.role || 'student';
  const isAdminUser = userRole === 'admin' || isAdmin;
  const isTeacherUser = userRole === 'teacher' || isTeacher;
  const isStudentUser = userRole === 'student';

  const handleNavClick = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    setShowMoreLinks(false);
    setShowUserDropdown(false);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="top-header">
        <div className="header-container">
          {/* Left: Logo and Brand */}
          <div className="header-brand">
            <div className="logo">🎓</div>
            <h1>CodeSmartNG<br/>Stem</h1>
          </div>

          {/* Hamburger Menu Button for Mobile */}
          <button 
            className="hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Center: General Navigation Links */}
          <nav className={`general-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <button 
              className={`nav-link ${currentView === 'about' ? 'active' : ''}`}
              onClick={() => handleNavClick('about')}
            >
              About
            </button>
            <button 
              className={`nav-link ${currentView === 'faqs' ? 'active' : ''}`}
              onClick={() => handleNavClick('faqs')}
            >
              FAQs
            </button>
            <button 
              className={`nav-link ${currentView === 'contact' ? 'active' : ''}`}
              onClick={() => handleNavClick('contact')}
            >
              Contact
            </button>

            {/* More Links Dropdown */}
            <div className="dropdown">
              <button 
                className={`nav-link more-link ${showMoreLinks ? 'active' : ''}`}
                onClick={() => setShowMoreLinks(!showMoreLinks)}
              >
                More {showMoreLinks ? '▴' : '▽'}
              </button>
              {showMoreLinks && (
                <div className="dropdown-menu">
                  {/* ✅ Forum moved here */}
                  {currentUser && (
                    <button className="dropdown-link" onClick={() => handleNavClick('discussion')}>
                      💬 Forum
                    </button>
                  )}
                  <button className="dropdown-link" onClick={() => handleNavClick('blog')}>
                    📝 Blog
                  </button>
                  <button className="dropdown-link" onClick={() => handleNavClick('resources')}>
                    📖 Resources
                  </button>
                  <button className="dropdown-link" onClick={() => handleNavClick('careers')}>
                    💼 Careers
                  </button>
                  <button className="dropdown-link" onClick={() => handleNavClick('support')}>
                    🆘 Support
                  </button>
                </div>
              )}
            </div>

            {/* Mobile-only user info */}
            <div className="mobile-user-info">
              <div className="mobile-user-details">
                <span className="welcome-text">Welcome, {currentUser?.name}</span>
                <span className="user-role">({currentUser?.role})</span>
              </div>
              <div className="mobile-user-actions">
                <a 
                  href="https://wa.me/08021025168"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="help-btn"
                >
                  💬 Help via WhatsApp
                </a>
                <button onClick={onLogout} className="mobile-logout-btn">
                  🚪 Logout
                </button>
              </div>
            </div>

            {/* Notification Bell */}
            <NotificationBell 
              currentUser={currentUser} 
              setCurrentView={setCurrentView} 
            />
          </nav>

          {/* Right: User Actions - Desktop */}
          <div className="header-actions">
            <NotificationBell 
              currentUser={currentUser} 
              setCurrentView={setCurrentView} 
            />

            <div className="user-dropdown">
              <button 
                className="user-dropdown-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <span className="user-avatar">👤</span>
                <span className="user-name">{currentUser?.name}</span>
                <span className="dropdown-arrow">▾</span>
              </button>
              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <span className="dropdown-user-name">{currentUser?.name}</span>
                    <span className="dropdown-user-role">{currentUser?.role}</span>
                  </div>
                  <hr />
                  <button className="dropdown-item" onClick={() => handleNavClick('profile')}>
                    👤 My Profile
                  </button>
                  {isStudentUser && (
                    <button className="dropdown-item" onClick={() => handleNavClick('courses')}>
                      📚 My Courses
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => handleNavClick('dashboard')}>
                    📊 Dashboard
                  </button>
                  {isAdminUser && (
                    <button className="dropdown-item" onClick={() => handleNavClick('admin')}>
                      ⚙️ Admin Dashboard
                    </button>
                  )}
                  <hr />
                  <button className="dropdown-item logout-item" onClick={onLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>

            <a 
              href="https://wa.me/08021025168"
              target="_blank" 
              rel="noopener noreferrer"
              className="help-btn"
            >
              💬 Help
            </a>
          </div>
        </div>
      </header>

      {/* Overlay for mobile menu when open */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main App Navigation */}
      <nav className="app-navigation">
        <div className="nav-container">
          <ul className="app-nav-links">
            <li>
              <button 
                className={`app-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Dashboard</span>
              </button>
            </li>

            <li>
              <button 
                className={`app-nav-btn ${currentView === 'courses' ? 'active' : ''}`}
                onClick={() => handleNavClick('courses')}
              >
                <span className="nav-icon">📚</span>
                <span className="nav-label">Course Catalog</span>
              </button>
            </li>

            <li>
              <button 
                className={`app-nav-btn ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => handleNavClick('profile')}
              >
                <span className="nav-icon">👤</span>
                <span className="nav-label">Profile</span>
              </button>
            </li>

            {isTeacherUser && (
              <>
                <li>
                  <button 
                    className={`app-nav-btn ${currentView === 'teacher' ? 'active' : ''}`}
                    onClick={() => handleNavClick('teacher')}
                  >
                    <span className="nav-icon">👨‍🏫</span>
                    <span className="nav-label">Teacher</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`app-nav-btn ${currentView === 'teacher-payments' ? 'active' : ''}`}
                    onClick={() => handleNavClick('teacher-payments')}
                  >
                    <span className="nav-icon">💳</span>
                    <span className="nav-label">Payments</span>
                  </button>
                </li>
              </>
            )}

            {isAdminUser && (
              <>
                <li>
                  <button 
                    className={`app-nav-btn ${currentView === 'admin' ? 'active' : ''}`}
                    onClick={() => handleNavClick('admin')}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Admin</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`app-nav-btn ${currentView === 'admin-courses' ? 'active' : ''}`}
                    onClick={() => handleNavClick('admin-courses')}
                  >
                    <span className="nav-icon">📚</span>
                    <span className="nav-label">Manage Courses</span>
                  </button>
                </li>
              </>
            )}

            <li>
              <button onClick={onLogout} className="app-nav-btn logout-btn">
                <span className="nav-icon">🚪</span>
                <span className="nav-label">Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* ✅ Floating Chat Button — WhatsApp AI style */}
      {currentUser && (
        <button
          className="floating-chat-btn"
          onClick={() => handleNavClick('chat')}
          aria-label="Open Chat"
          title="Live Chat"
        >
          <svg 
            className="floating-chat-icon"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            <circle cx="9" cy="11" r="0.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="11" r="0.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="11" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      )}
    </>
  );
};

export default Navigation;
