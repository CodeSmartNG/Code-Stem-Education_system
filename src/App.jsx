// src/App.jsx - Updated to use Custom Backend API

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import './styles/payments.css';
import StudentProfile from './components/StudentProfile';
import CourseCatalog from './components/CourseCatalog';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import TeacherRegisterForm from './components/TeacherRegisterForm';
import EmailConfirmation from './components/EmailConfirmation';
import DiscussionForum from './components/DiscussionForum';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminCourseManagement from './components/AdminCourseManagement';
import About from './components/About';
import FAQs from './components/FAQs';
import Contact from './components/Contact';
import Blog from './components/Blog';
import Resources from './components/Resources';
import Careers from './components/Careers';
import Support from './components/Support';
import SetupDemo from './pages/SetupDemo';

// ✅ IMPORT FROM CUSTOM BACKEND API (NOT FIREBASE)
import { 
  initializeStorage, 
  getStudents, 
  getCurrentUser, 
  updateStudent, 
  authenticateUser,
  logoutUser,
  getUsers,
  registerUser,
  confirmUserEmail,
  resendEmailConfirmation,
  canAccessLesson,
  purchaseLesson,
  getTeacherWhatsAppUrl
} from './utils/storageAPI';

// ============================================
// CONSTANTS
// ============================================

const USER_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
const INACTIVITY_WARNING_TIME = 55 * 60 * 1000;
const INACTIVITY_LOGOUT_TIME = 60 * 60 * 1000;

// ============================================
// DEBUG FUNCTIONS
// ============================================

const debugAdminStatus = () => {
  try {
    console.log('=== ADMIN STATUS DEBUG ===');
    const users = JSON.parse(localStorage.getItem('hausaStem_users') || '{}');
    const currentUser = JSON.parse(localStorage.getItem('hausaStem_currentUser') || 'null');

    console.log('All users:', Object.keys(users));
    console.log('Admin exists:', !!users['admin1']);
    console.log('Admin email:', users['admin1']?.email);
    console.log('Admin role:', users['admin1']?.role);
    console.log('Current user:', currentUser);
    console.log('Current user role:', currentUser?.role);
    console.log('=== END DEBUG ===');

    return { users, currentUser };
  } catch (error) {
    console.error('Debug error:', error);
    return { users: {}, currentUser: null };
  }
};

const safeObjectEntries = (obj, location = 'unknown') => {
  console.log(`🔧 safeObjectEntries called from: ${location}`, obj);
  try {
    if (obj === null) {
      console.log(`❌ ${location}: Object is null`);
      return [];
    }
    if (obj === undefined) {
      console.log(`❌ ${location}: Object is undefined`);
      return [];
    }
    if (typeof obj !== 'object') {
      console.log(`❌ ${location}: Not an object, type is:`, typeof obj);
      return [];
    }
    const entries = Object.entries(obj);
    console.log(`✅ ${location}: Object.entries success, count:`, entries.length);
    return entries;
  } catch (error) {
    console.error(`❌ ${location}: Error in safeObjectEntries:`, error);
    return [];
  }
};

// ============================================
// APP COMPONENT
// ============================================

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUserState] = useState(null);
  const [students, setStudentsState] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [confirmationToken, setConfirmationToken] = useState('');
  const [showConfirmationInfo, setShowConfirmationInfo] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [initError, setInitError] = useState(null);

  // Refs for timer management
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = useCallback(async () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    await logoutUser();
    setCurrentUserState(null);
    setCurrentView('login');
    setMessage('');
    setShowConfirmationInfo(false);
    setShowInactivityWarning(false);
    localStorage.removeItem('hausaStem_currentView');
  }, []);

  const handleAutoLogout = useCallback(() => {
    setMessage('You have been automatically logged out due to inactivity.');
    handleLogout();
  }, [handleLogout]);

  const resetInactivityTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    if (currentUser) {
      warningTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
      }, INACTIVITY_WARNING_TIME);

      logoutTimerRef.current = setTimeout(() => {
        handleAutoLogout();
      }, INACTIVITY_LOGOUT_TIME);
    }
  }, [currentUser, handleAutoLogout]);

  const handleUserActivity = useCallback(() => {
    if (currentUser) {
      resetInactivityTimer();
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    }
  }, [currentUser, resetInactivityTimer, showInactivityWarning]);

  // ============================================
  // EMAIL CONFIRMATION
  // ============================================

  const handleEmailConfirmation = useCallback(async (token) => {
    try {
      const user = await confirmUserEmail(token);

      setMessage('Email confirmed successfully! You can now log in.');
      setCurrentView('login');
      setPendingUser(null);
      setConfirmationToken('');
      setShowConfirmationInfo(false);

      window.history.replaceState({}, document.title, window.location.pathname);

      return true;
    } catch (error) {
      console.error('Email confirmation error:', error);
      setMessage(error.message || 'Email confirmation failed. Please try again.');
      return false;
    }
  }, []);

  // ============================================
  // PAYMENT HANDLERS
  // ============================================

  const handlePaymentComplete = useCallback(async (paymentData) => {
    try {
      console.log('Payment completed:', paymentData);

      if (paymentData.lessonId && paymentData.courseKey) {
        const success = await purchaseLesson(
          currentUser?.id, 
          paymentData.courseKey, 
          paymentData.lessonId
        );

        if (success) {
          const updatedUser = await getCurrentUser();
          if (updatedUser) {
            setCurrentUserState(updatedUser);
          }
          setMessage('✅ Payment completed successfully!');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Payment completion error:', error);
      setMessage('❌ Error processing payment completion: ' + error.message);
      return false;
    }
  }, [currentUser]);

  const handleTransactionUpdate = useCallback(async (transaction) => {
    try {
      console.log('Transaction updated:', transaction);
      if (currentUser && currentUser.role === 'teacher') {
        const updatedUser = await getCurrentUser();
        if (updatedUser) {
          setCurrentUserState(updatedUser);
        }
      }
    } catch (error) {
      console.error('Transaction update error:', error);
    }
  }, [currentUser]);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🔄 Initializing backend storage...');
        await initializeStorage();

        const loadedStudents = await getStudents();
        const loadedCurrentUser = await getCurrentUser();

        console.log('Loaded students:', loadedStudents);
        console.log('Loaded current user:', loadedCurrentUser);
        console.log('Loaded current user role:', loadedCurrentUser?.role);

        setStudentsState(loadedStudents || []);

        if (loadedCurrentUser) {
          setCurrentUserState(loadedCurrentUser);

          const role = loadedCurrentUser.role;
          console.log('🔍 User role detected:', role);

          if (role === 'admin') {
            console.log('👑 Setting admin view');
            setCurrentView('admin');
          } else if (role === 'teacher') {
            console.log('👨‍🏫 Setting teacher view');
            setCurrentView('teacher');
          } else if (role === 'student') {
            console.log('👨‍🎓 Setting student dashboard view');
            setCurrentView('dashboard');
          } else {
            console.warn('⚠️ Unknown role:', role);
            setCurrentView('dashboard');
          }
        } else {
          console.log('👤 No current user, showing login');
          setCurrentView('login');
        }

        debugAdminStatus();

        setIsInitialized(true);
        setInitError(null);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitError(error.message || 'Failed to initialize app');
        setIsInitialized(true);
      }
    };

    initApp();
  }, []);

  // ============================================
  // ACTIVITY LISTENERS
  // ============================================

  useEffect(() => {
    if (currentUser) {
      USER_ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, handleUserActivity);
      });

      resetInactivityTimer();

      return () => {
        USER_ACTIVITY_EVENTS.forEach(event => {
          document.removeEventListener(event, handleUserActivity);
        });
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
        }
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
        }
      };
    }
  }, [currentUser, handleUserActivity, resetInactivityTimer]);

  // ============================================
  // URL TOKEN CHECK
  // ============================================

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      handleEmailConfirmation(token);
    }
  }, [handleEmailConfirmation]);

  // ============================================
  // LOGIN HANDLER
  // ============================================

  const handleLogin = useCallback(async (email, password) => {
    try {
      console.log('🔐 Attempting login with email:', email);

      const user = await authenticateUser(email, password);
      console.log('🔐 authenticateUser returned:', user);

      if (user) {
        console.log('✅ Login successful!');
        console.log('User role:', user.role);
        console.log('User email:', user.email);

        const { password: _, ...userWithoutPassword } = user;
        setCurrentUserState(userWithoutPassword);

        resetInactivityTimer();

        if (user.role === 'admin') {
          console.log('👑 Navigating to admin dashboard');
          setCurrentView('admin');
          localStorage.setItem('hausaStem_currentView', 'admin');
        } else if (user.role === 'teacher') {
          console.log('👨‍🏫 Navigating to teacher dashboard');
          setCurrentView('teacher');
          localStorage.setItem('hausaStem_currentView', 'teacher');
        } else {
          console.log('👨‍🎓 Navigating to student dashboard');
          setCurrentView('dashboard');
          localStorage.setItem('hausaStem_currentView', 'dashboard');
        }

        setMessage('');
        return true;
      } else {
        console.log('❌ Login failed: No user returned');
        setMessage('Invalid email or password. Please check your credentials.');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setMessage(error.message || 'Login failed. Please try again.');
      return false;
    }
  }, [resetInactivityTimer]);

  // ============================================
  // REGISTRATION HANDLERS
  // ============================================

  const handleStudentRegister = useCallback(async (name, email, password) => {
    try {
      const users = await getUsers();
      const existingUser = safeObjectEntries(users, 'student-register').find(
        ([, user]) => user.email === email
      );

      if (existingUser || students.find(s => s.email === email)) {
        setMessage('Email already exists. Please use a different email or login.');
        return false;
      }

      const result = await registerUser({
        name,
        email,
        password,
        role: 'student',
        level: 'Beginner',
        completedLessons: {},
        progress: {},
        purchasedLessons: []
      });

      setPendingUser(result.user);
      setConfirmationToken(result.confirmationToken);
      setShowConfirmationInfo(true);
      setCurrentView('email-confirmation');
      setMessage(`Confirmation email sent to ${email}. Please check your inbox.`);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Registration failed. Please try again.');
      return false;
    }
  }, [students]);

  const handleTeacherRegister = useCallback(async (teacherData) => {
    try {
      const users = await getUsers();
      const existingUser = safeObjectEntries(users, 'teacher-register').find(
        ([, user]) => user.email === teacherData.email
      );

      if (existingUser) {
        setMessage('Email already exists. Please use a different email or login.');
        return false;
      }

      const result = await registerUser({
        ...teacherData,
        role: 'teacher',
        isApproved: false,
        earnings: 0,
        courses: [],
        whatsappNumber: teacherData.whatsappNumber || ''
      });

      setPendingUser(result.user);
      setConfirmationToken(result.confirmationToken);
      setShowConfirmationInfo(true);
      setCurrentView('email-confirmation');
      setMessage(`Confirmation email sent to ${teacherData.email}. Please check your inbox.`);
      return true;
    } catch (error) {
      console.error('Teacher registration error:', error);
      setMessage(error.message || 'Teacher registration failed. Please try again.');
      return false;
    }
  }, []);

  const handleResendConfirmation = useCallback(async () => {
    if (pendingUser) {
      try {
        await resendEmailConfirmation(pendingUser.email);
        setMessage('Confirmation email resent successfully! Please check your inbox.');
      } catch (error) {
        console.error('Resend confirmation error:', error);
        setMessage(error.message || 'Failed to resend confirmation email. Please try again.');
      }
    }
  }, [pendingUser]);

  // ============================================
  // USER UPDATE HANDLERS
  // ============================================

  const updateStudentData = useCallback(async (updatedStudent) => {
    try {
      await updateStudent(updatedStudent);

      const { password, ...studentWithoutPassword } = updatedStudent;
      setCurrentUserState(studentWithoutPassword);

      const loadedStudents = await getStudents();
      setStudentsState(loadedStudents || []);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  }, []);

  const updateCurrentUser = useCallback(async (updatedUser) => {
    try {
      const users = await getUsers();
      if (users[updatedUser.id]) {
        users[updatedUser.id] = { ...users[updatedUser.id], ...updatedUser };
        localStorage.setItem('hausaStem_users', JSON.stringify(users));
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      setCurrentUserState(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, []);

  // ============================================
  // LESSON HANDLERS
  // ============================================

  const handleLessonPurchase = useCallback(async (courseKey, lessonId) => {
    try {
      if (!currentUser) {
        setMessage('Please log in to purchase lessons');
        return false;
      }

      const success = await purchaseLesson(currentUser.id, courseKey, lessonId);
      if (success) {
        const updatedUser = await getCurrentUser();
        if (updatedUser) {
          setCurrentUserState(updatedUser);
        }
        setMessage('✅ Lesson purchased successfully!');
        return true;
      } else {
        setMessage('❌ Failed to purchase lesson. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error purchasing lesson:', error);
      setMessage('❌ Error processing payment: ' + error.message);
      return false;
    }
  }, [currentUser]);

  const checkLessonAccess = useCallback(async (courseKey, lessonId) => {
    if (!currentUser) return false;
    return await canAccessLesson(currentUser.id, courseKey, lessonId);
  }, [currentUser]);

  const getTeacherContactUrl = useCallback((teacherId) => {
    return getTeacherWhatsAppUrl(teacherId);
  }, []);

  // ============================================
  // UI COMPONENTS
  // ============================================

  const InactivityWarning = useCallback(() => {
    if (!showInactivityWarning) return null;

    return (
      <div className="inactivity-warning-overlay">
        <div className="inactivity-warning-modal">
          <div className="warning-header">
            <h3>Session Timeout Warning</h3>
          </div>
          <div className="warning-body">
            <p>Your session will expire in 5 minutes due to inactivity.</p>
            <p>Would you like to continue your session?</p>
          </div>
          <div className="warning-actions">
            <button 
              className="continue-btn"
              onClick={() => {
                resetInactivityTimer();
                setShowInactivityWarning(false);
              }}
            >
              Continue Session
            </button>
            <button 
              className="logout-btn"
              onClick={handleLogout}
            >
              Log Out Now
            </button>
          </div>
        </div>
      </div>
    );
  }, [showInactivityWarning, resetInactivityTimer, handleLogout]);

  const ConfirmationInfoDisplay = useCallback(() => {
    if (!showConfirmationInfo || !confirmationToken) return null;

    return (
      <div className="confirmation-demo-display">
        <h3>📧 Demo Email Confirmation</h3>
        <p>Since this is a demo, here's your confirmation token:</p>
        <div className="confirmation-token">{confirmationToken}</div>
        <p>You can:</p>
        <ul>
          <li>Click the confirmation button below to simulate email confirmation</li>
          <li>Or manually navigate to: {window.location.origin}/confirm-email?token={confirmationToken}</li>
        </ul>
        <div className="demo-buttons">
          <button 
            onClick={() => handleEmailConfirmation(confirmationToken)}
            className="confirm-email-btn"
          >
            Confirm Email Now
          </button>
          <button 
            onClick={() => setShowConfirmationInfo(false)}
            className="close-info-btn"
          >
            Close
          </button>
        </div>
      </div>
    );
  }, [showConfirmationInfo, confirmationToken, handleEmailConfirmation]);

  const MessageDisplay = useCallback(() => {
    if (!message) return null;

    return (
      <div className={`message ${message.includes('success') ? 'success' : message.includes('email') ? 'info' : 'error'}`}>
        {message}
      </div>
    );
  }, [message]);

  // ============================================
  // ERROR SCREEN
  // ============================================

  if (initError) {
    return (
      <div className="error-screen">
        <h2>⚠️ Something went wrong</h2>
        <p>{initError}</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  // ============================================
  // RENDER VIEW
  // ============================================

  const renderView = useCallback(() => {
    console.log('🎯 renderView called with currentView:', currentView);
    console.log('🎯 currentUser:', currentUser);
    console.log('🎯 currentUser role:', currentUser?.role);

    // If no user, show login/register views
    if (!currentUser) {
      console.log('👤 No current user, showing login/register views');
      switch(currentView) {
        case 'register':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <RegisterForm 
                onRegister={handleStudentRegister} 
                onSwitchToLogin={() => {
                  setMessage('');
                  setCurrentView('login');
                }} 
              />
            </>
          );
        case 'teacher-register':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <TeacherRegisterForm 
                onRegister={handleTeacherRegister} 
                onSwitchToLogin={() => {
                  setMessage('');
                  setCurrentView('login');
                }}
                onSwitchToStudentRegister={() => {
                  setMessage('');
                  setCurrentView('register');
                }}
              />
            </>
          );
        case 'email-confirmation':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <EmailConfirmation 
                email={pendingUser?.email}
                onConfirm={handleEmailConfirmation}
                onResend={handleResendConfirmation}
                onCancel={() => {
                  setMessage('');
                  setPendingUser(null);
                  setConfirmationToken('');
                  setShowConfirmationInfo(false);
                  setCurrentView('login');
                }}
              />
            </>
          );
        case 'setup':
          return <SetupDemo />;
        case 'login':
        default:
          return (
            <div className="login-container">
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <LoginForm 
                onLogin={handleLogin} 
                onSwitchToRegister={() => {
                  setMessage('');
                  setCurrentView('register');
                }} 
                onSwitchToTeacherRegister={() => {
                  setMessage('');
                  setCurrentView('teacher-register');
                }}
              />
            </div>
          );
      }
    }

    // Get role with proper fallback
    const userRole = currentUser?.role || 'student';
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    const isStudent = userRole === 'student';

    console.log('🎯 User roles - Admin:', isAdmin, 'Teacher:', isTeacher, 'Student:', isStudent);
    console.log('🎯 Current view:', currentView);

    // Check if currentView matches user role
    if (isAdmin && currentView !== 'admin' && currentView !== 'admin-courses') {
      console.log('👑 Admin user, ensuring admin view');
      setTimeout(() => setCurrentView('admin'), 0);
      return null;
    }

    if (isTeacher && currentView !== 'teacher' && currentView !== 'teacher-payments') {
      console.log('👨‍🏫 Teacher user, ensuring teacher view');
      setTimeout(() => setCurrentView('teacher'), 0);
      return null;
    }

    // General navigation views
    switch(currentView) {
      case 'about':
        return <About />;
      case 'faqs':
        return <FAQs />;
      case 'contact':
        return <Contact />;
      case 'blog':
        return <Blog />;
      case 'resources':
        return <Resources />;
      case 'careers':
        return (
          <Careers 
            setCurrentView={setCurrentView} 
            setMessage={setMessage}
            onTeacherRegister={handleTeacherRegister}
            currentUser={currentUser}
          />
        );
      case 'support':
        return <Support />;
      case 'admin-courses':
        if (isAdmin) {
          return <AdminCourseManagement currentUser={currentUser} />;
        } else {
          return (
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to access course management.</p>
              <button 
                className="back-button"
                onClick={() => setCurrentView(isAdmin ? 'admin' : isTeacher ? 'teacher' : 'dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          );
        }
      default:
        break;
    }

    // Admin dashboard
    if (isAdmin) {
      console.log('🎯 Rendering admin dashboard');
      if (currentView === 'admin') {
        return <AdminDashboard currentUser={currentUser} setCurrentView={setCurrentView} />;
      } else if (currentView === 'dashboard' || currentView === 'profile') {
        console.log('🔄 Redirecting admin to admin dashboard');
        setTimeout(() => setCurrentView('admin'), 0);
        return null;
      }
    }

    // Teacher dashboard
    if (isTeacher) {
      console.log('🎯 Rendering teacher dashboard');
      if (currentView === 'teacher' || currentView === 'teacher-payments') {
        return (
          <TeacherDashboard 
            currentUser={currentUser} 
            setCurrentUser={updateCurrentUser}
            onPaymentComplete={handlePaymentComplete}
            onTransactionUpdate={handleTransactionUpdate}
            paymentMethods={['paystack', 'flutterwave']}
            initialTab={currentView === 'teacher-payments' ? 'payments' : 'overview'}
          />
        );
      } else if (currentView === 'dashboard' || currentView === 'profile') {
        console.log('🔄 Redirecting teacher to teacher dashboard');
        setTimeout(() => setCurrentView('teacher'), 0);
        return null;
      }
    }

    // Student views
    if (isStudent) {
      console.log('🎯 Rendering student views for:', currentView);
      switch(currentView) {
        case 'profile':
          return <StudentProfile student={currentUser} setStudent={updateStudentData} />;
        case 'courses':
          return (
            <CourseCatalog 
              student={currentUser} 
              setStudent={updateStudentData}
              onLessonPurchase={handleLessonPurchase}
              onCheckLessonAccess={checkLessonAccess}
              onGetTeacherContact={getTeacherContactUrl}
            />
          );
        case 'discussion':
          return <DiscussionForum currentUser={currentUser} />;
        case 'dashboard':
        default:
          return (
            <>
              <MessageDisplay />
              <Dashboard student={currentUser} setStudent={updateStudentData} />
            </>
          );
      }
    }

    // Default fallback
    console.warn('⚠️ No specific view matched, showing default dashboard');
    if (isAdmin) {
      return <AdminDashboard currentUser={currentUser} setCurrentView={setCurrentView} />;
    } else if (isTeacher) {
      return (
        <TeacherDashboard 
          currentUser={currentUser} 
          setCurrentUser={updateCurrentUser}
          onPaymentComplete={handlePaymentComplete}
          onTransactionUpdate={handleTransactionUpdate}
          paymentMethods={['paystack', 'flutterwave']}
        />
      );
    } else {
      return (
        <>
          <MessageDisplay />
          <Dashboard student={currentUser} setStudent={updateStudentData} />
        </>
      );
    }
  }, [
    currentUser, 
    currentView, 
    handleLogin, 
    handleStudentRegister, 
    handleTeacherRegister, 
    handleEmailConfirmation, 
    handleResendConfirmation, 
    handleLogout, 
    updateStudentData, 
    updateCurrentUser, 
    handleLessonPurchase, 
    checkLessonAccess, 
    getTeacherContactUrl,
    handlePaymentComplete,
    handleTransactionUpdate,
    MessageDisplay,
    ConfirmationInfoDisplay,
    pendingUser
  ]);

  // ============================================
  // LOADING SCREEN
  // ============================================

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your learning experience...</p>
        <p className="loading-version">v1.0.0 • STEM Education Platform</p>
        <p className="loading-powered">Powered by Custom Backend</p>
      </div>
    );
  }

  console.log('🎯 Rendering main App component');
  console.log('🎯 Current user:', currentUser);
  console.log('🎯 Current view:', currentView);

  // ============================================
  // MAIN APP RENDER
  // ============================================

  return (
    <div className="App">
      <InactivityWarning />

      {currentUser && (
        <Navigation 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          currentUser={currentUser}
          onLogout={handleLogout}
          isAdmin={currentUser.role === 'admin'}
          isTeacher={currentUser.role === 'teacher'}
          isStudent={currentUser.role === 'student'}
        />
      )}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;