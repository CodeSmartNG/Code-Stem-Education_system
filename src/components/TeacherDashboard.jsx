// TeacherDashboard.js - Complete with ALL tabs

import React, { useState, useEffect } from 'react';
import { 
  getCurrentUser,
  getCoursesByTeacher,
  createCourse,
  createLesson,
  updateCourse,
  deleteCourse,
  updateLesson,
  deleteLesson,
  addMultimediaToLesson,
  deleteMultimedia,
  getLessonsByCourse,
  getTeacherWallet,
  updateTeacherWallet,
  withdrawFromWallet,
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getTeacherWhatsAppNumber,
  uploadFileToFirebase,
  uploadFileToFirebaseWithProgress,
  deleteFileFromFirebase,
  getFileUrlFromFirebase
} from '../utils/storage';
import paymentService from '../utils/paymentService';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [courses, setCoursesState] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Payment-related states
  const [transactions, setTransactions] = useState([]);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  // Course Form States
  const [newCourseForm, setNewCourseForm] = useState({
    title: '',
    description: '',
    thumbnail: '📚',
    teacherId: ''
  });

  // Lesson Form States
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    content: '',
    duration: '',
    isFree: true,
    price: 0,
    order: 0,
    videoFile: null,
    videoFileName: '',
    videoTitle: '',
    videoDescription: ''
  });

  // Quiz Form States
  const [quizForm, setQuizForm] = useState({
    title: '',
    passingScore: 70,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: 'text',
    options: ['', '', '', ''],
    correctAnswer: 0,
    imageUrl: ''
  });

  const [showQuizForm, setShowQuizForm] = useState(false);

  // Edit States
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseForm, setEditCourseForm] = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonForm, setEditLessonForm] = useState({});

  // Multimedia States
  const [managingMultimedia, setManagingMultimedia] = useState(null);
  const [newMultimediaForm, setNewMultimediaForm] = useState({
    type: 'video',
    file: null,
    fileName: '',
    title: '',
    description: ''
  });

  // Payment & WhatsApp States
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  // ✅ Handle file upload progress
  const simulateUploadProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    return interval;
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadData();
      await loadTeacherProfile();
      await loadTransactions();
    } catch (error) {
      console.error('Error loading all data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        console.error('No user logged in');
        return;
      }

      const teacherCourses = await getCoursesByTeacher(currentUser.uid);
      setCoursesState(teacherCourses);

      let totalLessons = 0;
      let totalStudents = 0;

      for (const course of teacherCourses) {
        const lessons = await getLessonsByCourse(course.id);
        totalLessons += lessons.length;
        totalStudents += course.enrolledStudents || 0;
      }

      setStats({
        totalCourses: teacherCourses.length,
        totalLessons: totalLessons,
        totalStudents: totalStudents
      });

      const walletData = await getTeacherWallet(currentUser.uid);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadTeacherProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setTeacherProfile(currentUser);
        const number = await getTeacherWhatsAppNumber(currentUser.uid);
        setWhatsappNumber(number || '');
      }
    } catch (error) {
      console.error('Error loading teacher profile:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.uid) {
        const userTransactions = paymentService.getUserTransactions(currentUser.uid);
        setTransactions(userTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // ✅ Load lessons for a specific course
  const loadCourseLessons = async (courseId) => {
    try {
      const lessons = await getLessonsByCourse(courseId);
      setCourseLessons(lessons);
      setSelectedCourse(courseId);
      setActiveTab('manage-lessons');
    } catch (error) {
      console.error('Error loading course lessons:', error);
    }
  };

  // ✅ Course Management Functions
  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      const courseData = {
        ...newCourseForm,
        teacherId: currentUser.uid,
        teacherName: currentUser.name || 'Teacher',
        enrolledStudents: 0,
        isPublished: true
      };

      await createCourse(courseData);
      alert('✅ Course added successfully!');
      setNewCourseForm({
        title: '',
        description: '',
        thumbnail: '📚',
        teacherId: ''
      });
      await loadData();
      setActiveTab('my-courses');
    } catch (error) {
      alert('❌ Error adding course: ' + error.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('⚠️ Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
        alert('✅ Course deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting course: ' + error.message);
      }
    }
  };

  // ✅ Publish/Unpublish Course
  const handlePublishCourse = async (courseId) => {
    try {
      await updateCourse(courseId, { isPublished: true });
      alert('✅ Course published successfully!');
      await loadData();
    } catch (error) {
      alert('❌ Error publishing course: ' + error.message);
    }
  };

  const handleUnpublishCourse = async (courseId) => {
    try {
      await updateCourse(courseId, { isPublished: false });
      alert('✅ Course unpublished successfully!');
      await loadData();
    } catch (error) {
      alert('❌ Error unpublishing course: ' + error.message);
    }
  };

  // ✅ Handle Add Lesson
  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = simulateUploadProgress();

      const lessonData = {
        title: newLessonForm.title,
        content: newLessonForm.content,
        duration: newLessonForm.duration,
        isFree: newLessonForm.isFree,
        price: newLessonForm.isFree ? 0 : newLessonForm.price,
        order: newLessonForm.order || courseLessons.length + 1
      };

      const lesson = await createLesson(selectedCourse, lessonData);

      if (newLessonForm.videoFile) {
        const currentUser = await getCurrentUser();
        const filePath = `teachers/${currentUser.uid}/videos/${Date.now()}_${newLessonForm.videoFileName}`;
        const downloadURL = await uploadFileToFirebase(newLessonForm.videoFile, filePath);

        const multimediaData = {
          type: 'video',
          url: downloadURL,
          title: newLessonForm.videoTitle || newLessonForm.videoFileName || 'Lesson Video',
          description: newLessonForm.videoDescription || 'Video content for this lesson',
          fileName: newLessonForm.videoFileName,
          fileSize: newLessonForm.videoFile.size,
          fileType: newLessonForm.videoFile.type,
          firebasePath: filePath
        };

        await addMultimediaToLesson(lesson.id, multimediaData);
      }

      if (quizForm.questions.length > 0) {
        const quizData = {
          title: quizForm.title || 'Lesson Quiz',
          passingScore: quizForm.passingScore,
          questions: quizForm.questions
        };
        await createQuiz(lesson.id, quizData);
      }

      alert('✅ Lesson added successfully!');
      clearInterval(progressInterval);
      setUploadProgress(100);

      setNewLessonForm({
        title: '',
        content: '',
        duration: '',
        isFree: true,
        price: 0,
        order: 0,
        videoFile: null,
        videoFileName: '',
        videoTitle: '',
        videoDescription: ''
      });
      resetQuizForm();

      await loadCourseLessons(selectedCourse);
      setIsUploading(false);
    } catch (error) {
      console.error('Error adding lesson:', error);
      alert('❌ Error adding lesson: ' + error.message);
      setIsUploading(false);
    }
  };

  // ... (other functions: handleUpdateLesson, handleDeleteLesson, handleAddQuestion, handleRemoveQuestion, handleVideoFileSelect, handleMultimediaFileSelect, handleAddMultimedia, handleDeleteMultimedia, saveWhatsAppNumber, handleWithdrawal, generatePaymentReport, viewTransactionDetails)

  // ✅ Reset Quiz Form
  const resetQuizForm = () => {
    setQuizForm({
      title: '',
      passingScore: 70,
      questions: []
    });
    setCurrentQuestion({
      question: '',
      type: 'text',
      options: ['', '', '', ''],
      correctAnswer: 0,
      imageUrl: ''
    });
    setShowQuizForm(false);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₦0';
    return `₦${amount.toLocaleString() || '0'}`;
  };

  if (loading) {
    return <div className="loading-teacher">📚 Loading teacher dashboard...</div>;
  }

  if (!stats) {
    return <div className="loading-teacher">⚠️ No teacher data found.</div>;
  }

  return (
    <div className="teacher-dashboard">
      <div className="teacher-header">
        <h3>👨‍🏫 Teacher Dashboard</h3>
        <p>Manage Your Courses, Earnings, and Lessons</p>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}>
              {uploadProgress}%
            </div>
          </div>
          <p>{uploadProgress < 100 ? '📤 Uploading... Please wait.' : '✅ Upload complete!'}</p>
        </div>
      )}

      <div className="teacher-tabs">
        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''}>
          📊 Overview
        </button>
        <button onClick={() => { setActiveTab('my-courses'); loadData(); }} className={activeTab === 'my-courses' ? 'active' : ''}>
          📚 My Courses ({courses.length})
        </button>
        <button onClick={() => setActiveTab('add-course')} className={activeTab === 'add-course' ? 'active' : ''}>
          ➕ Add Course
        </button>
        <button onClick={() => setActiveTab('add-lesson')} className={activeTab === 'add-lesson' ? 'active' : ''}>
          ➕ Add Lesson
        </button>
        <button onClick={() => setActiveTab('manage-lessons')} className={activeTab === 'manage-lessons' ? 'active' : ''}>
          📝 Manage Lessons
        </button>
        <button onClick={() => setActiveTab('manage-multimedia')} className={activeTab === 'manage-multimedia' ? 'active' : ''}>
          🎬 Manage Media
        </button>
        <button onClick={() => setActiveTab('earnings')} className={activeTab === 'earnings' ? 'active' : ''}>
          💰 Earnings {wallet && `(${formatCurrency(wallet.balance)})`}
        </button>
        <button onClick={() => setActiveTab('payments')} className={activeTab === 'payments' ? 'active' : ''}>
          💳 Payments
        </button>
        <button onClick={() => setActiveTab('whatsapp')} className={activeTab === 'whatsapp' ? 'active' : ''}>
          📱 WhatsApp
        </button>
      </div>

      <div className="teacher-content">
        {/* ============================================
            OVERVIEW TAB
            ============================================ */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {wallet && (
              <div className="wallet-summary">
                <h3>💰 Earnings Summary</h3>
                <div className="wallet-stats">
                  <div className="wallet-stat">
                    <span className="stat-label">Available Balance:</span>
                    <span className="stat-amount">{formatCurrency(wallet.balance)}</span>
                  </div>
                  <div className="wallet-stat">
                    <span className="stat-label">Total Earnings:</span>
                    <span className="stat-amount">{formatCurrency(wallet.totalEarnings)}</span>
                  </div>
                  <div className="wallet-stat">
                    <span className="stat-label">Pending Withdrawals:</span>
                    <span className="stat-amount">{formatCurrency(wallet.pendingWithdrawals)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <h3>📚 My Courses</h3>
                <div className="stat-number">{stats.totalCourses}</div>
              </div>
              <div className="stat-card">
                <h3>📝 Total Lessons</h3>
                <div className="stat-number">{stats.totalLessons}</div>
              </div>
              <div className="stat-card">
                <h3>👨‍🎓 Students Enrolled</h3>
                <div className="stat-number">{stats.totalStudents}</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            MY COURSES TAB
            ============================================ */}
        {activeTab === 'my-courses' && (
          <div className="courses-tab">
            <h3>📚 My Courses</h3>
            <div className="courses-list">
              {courses.length === 0 ? (
                <div className="no-courses">
                  <p>You haven't created any courses yet.</p>
                  <button onClick={() => setActiveTab('add-course')} className="create-course-btn">
                    ➕ Create Your First Course
                  </button>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="course-teacher-card">
                    <div className="course-header">
                      <span className="course-thumbnail">{course.thumbnail || '📚'}</span>
                      <div className="course-info">
                        <h4>{course.title}</h4>
                        <p className="course-description">{course.description}</p>
                        <span className={`course-status ${course.isPublished ? 'published' : 'draft'}`}>
                          {course.isPublished ? '✅ Published' : '📝 Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="course-stats">
                      <span>📝 Lessons: {course.lessonIds?.length || 0}</span>
                      <span>👨‍🎓 Students: {course.enrolledStudents || 0}</span>
                    </div>
                    <div className="course-actions">
                      {!course.isPublished && (
                        <button className="publish-btn" onClick={() => handlePublishCourse(course.id)}>
                          📢 Publish
                        </button>
                      )}
                      {course.isPublished && (
                        <button className="unpublish-btn" onClick={() => handleUnpublishCourse(course.id)}>
                          🔒 Unpublish
                        </button>
                      )}
                      <button className="view-btn" onClick={() => loadCourseLessons(course.id)}>
                        📝 Manage Lessons
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteCourse(course.id)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================
            ADD COURSE TAB
            ============================================ */}
        {activeTab === 'add-course' && (
          <div className="add-course-tab">
            <h3>➕ Add New Course</h3>
            <form onSubmit={handleAddCourse} className="teacher-form">
              <div className="form-group">
                <label>Course Title *</label>
                <input
                  type="text"
                  value={newCourseForm.title}
                  onChange={(e) => setNewCourseForm({...newCourseForm, title: e.target.value})}
                  required
                  placeholder="e.g., Web Development Masterclass"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newCourseForm.description}
                  onChange={(e) => setNewCourseForm({...newCourseForm, description: e.target.value})}
                  required
                  rows="4"
                  placeholder="Describe what students will learn"
                />
              </div>
              <div className="form-group">
                <label>Thumbnail Emoji</label>
                <input
                  type="text"
                  value={newCourseForm.thumbnail}
                  onChange={(e) => setNewCourseForm({...newCourseForm, thumbnail: e.target.value})}
                  placeholder="🌐"
                />
                <small>Choose an emoji to represent your course</small>
              </div>
              <button type="submit" className="submit-btn">➕ Create Course</button>
            </form>
          </div>
        )}

        {/* ============================================
            ADD LESSON TAB
            ============================================ */}
        {activeTab === 'add-lesson' && (
          <div className="add-lesson-tab">
            <h3>➕ Add New Lesson</h3>

            {courses.length === 0 ? (
              <div className="no-courses-message">
                <p>⚠️ You need to create a course first before adding lessons.</p>
                <button onClick={() => setActiveTab('add-course')} className="create-course-btn">
                  ➕ Create a Course First
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddLesson} className="teacher-form">
                <div className="form-group">
                  <label>Select Course *</label>
                  <select
                    value={selectedCourse || ''}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">-- Choose a course --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Lesson Title *</label>
                  <input
                    type="text"
                    value={newLessonForm.title}
                    onChange={(e) => setNewLessonForm({...newLessonForm, title: e.target.value})}
                    required
                    placeholder="e.g., Introduction to React"
                  />
                </div>

                <div className="pricing-section">
                  <h4>💰 Lesson Pricing</h4>
                  <div className="pricing-options">
                    <label className="pricing-option">
                      <input
                        type="radio"
                        name="lessonType"
                        checked={newLessonForm.isFree}
                        onChange={() => setNewLessonForm({...newLessonForm, isFree: true, price: 0})}
                      />
                      <span className="option-label">🆓 Free Lesson</span>
                      <span className="option-description">Students can access for free</span>
                    </label>
                    <label className="pricing-option">
                      <input
                        type="radio"
                        name="lessonType"
                        checked={!newLessonForm.isFree}
                        onChange={() => setNewLessonForm({...newLessonForm, isFree: false, price: 500})}
                      />
                      <span className="option-label">💰 Paid Lesson</span>
                      <span className="option-description">Students pay to access</span>
                    </label>
                  </div>
                  {!newLessonForm.isFree && (
                    <div className="price-input">
                      <div className="form-group">
                        <label>Lesson Price (₦)</label>
                        <input
                          type="number"
                          value={newLessonForm.price}
                          onChange={(e) => setNewLessonForm({...newLessonForm, price: parseInt(e.target.value) || 0})}
                          min="100"
                          max="10000"
                          required
                        />
                        <small>Price between ₦100 - ₦10,000</small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Lesson Content *</label>
                  <textarea
                    value={newLessonForm.content}
                    onChange={(e) => setNewLessonForm({...newLessonForm, content: e.target.value})}
                    required
                    rows="4"
                    placeholder="Write the lesson content here..."
                  />
                </div>

                <div className="form-group">
                  <label>Duration *</label>
                  <input
                    type="text"
                    value={newLessonForm.duration}
                    onChange={(e) => setNewLessonForm({...newLessonForm, duration: e.target.value})}
                    placeholder="30 minutes"
                    required
                  />
                </div>

                <div className="video-upload-section">
                  <h4>📹 Upload Video (Optional)</h4>
                  <div className="form-group">
                    <label>Select Video File</label>
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        id="videoFile"
                        accept="video/*,.mp4,.webm,.ogg,.mov,.avi"
                        onChange={handleVideoFileSelect}
                      />
                      <label htmlFor="videoFile" className="file-upload-label">
                        <span className="upload-icon">📤</span>
                        {newLessonForm.videoFileName ? (
                          <span className="file-name">{newLessonForm.videoFileName}</span>
                        ) : (
                          <span>Choose Video File</span>
                        )}
                      </label>
                    </div>
                    <small>Max file size: 100MB</small>
                  </div>
                  {newLessonForm.videoFile && (
                    <div className="file-preview">
                      <video controls style={{ maxWidth: '100%', maxHeight: '300px' }}>
                        <source src={URL.createObjectURL(newLessonForm.videoFile)} type={newLessonForm.videoFile.type} />
                      </video>
                      <p className="file-details">
                        File: {newLessonForm.videoFileName} • Size: {(newLessonForm.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="quiz-section">
                  <div className="section-header">
                    <h4>📝 Quiz Content (Optional)</h4>
                    <button type="button" onClick={() => setShowQuizForm(!showQuizForm)} className="toggle-btn">
                      {showQuizForm ? '❌ Hide Quiz Form' : '➕ Add Quiz'}
                    </button>
                  </div>
                  {showQuizForm && (
                    <div className="quiz-form">
                      {/* Quiz form content - same as before */}
                      <div className="form-group">
                        <label>Quiz Title</label>
                        <input
                          type="text"
                          value={quizForm.title}
                          onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                          placeholder="Lesson Quiz"
                        />
                      </div>
                      <div className="form-group">
                        <label>Passing Score (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={quizForm.passingScore}
                          onChange={(e) => setQuizForm({...quizForm, passingScore: parseInt(e.target.value) || 70})}
                        />
                      </div>
                      {/* Add question form here */}
                      {/* ... existing quiz form content ... */}
                    </div>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={isUploading}>
                  {isUploading ? '📤 Uploading...' : '➕ Add Lesson'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================
            MANAGE LESSONS TAB
            ============================================ */}
        {activeTab === 'manage-lessons' && (
          <div className="manage-lessons-tab">
            <h3>
              📝 Manage Lessons
              {selectedCourse && courses.find(c => c.id === selectedCourse) && 
                ` - ${courses.find(c => c.id === selectedCourse)?.title}`}
            </h3>

            <div className="course-selector">
              <label>Select Course:</label>
              <select value={selectedCourse || ''} onChange={(e) => loadCourseLessons(e.target.value)}>
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <button className="add-lesson-btn" onClick={() => setActiveTab('add-lesson')}>
                ➕ Add New Lesson
              </button>
            </div>

            {selectedCourse && (
              <div className="lessons-list">
                {courseLessons.length === 0 ? (
                  <div className="no-lessons">
                    <p>No lessons in this course yet.</p>
                    <button onClick={() => setActiveTab('add-lesson')} className="create-lesson-btn">
                      ➕ Add Your First Lesson
                    </button>
                  </div>
                ) : (
                  courseLessons.map(lesson => (
                    <div key={lesson.id} className="lesson-teacher-card">
                      <div className="lesson-info">
                        <h5>📝 {lesson.title}</h5>
                        <p><strong>Duration:</strong> ⏱️ {lesson.duration}</p>
                        <p><strong>Type:</strong> 
                          <span className={`lesson-type ${lesson.isFree ? 'free' : 'paid'}`}>
                            {lesson.isFree ? ' 🆓 FREE' : ` 💰 PAID - ${formatCurrency(lesson.price)}`}
                          </span>
                        </p>
                      </div>
                      <div className="lesson-actions">
                        <button className="edit-btn" onClick={() => {
                          setEditingLesson({ lessonId: lesson.id });
                          setEditLessonForm({
                            title: lesson.title || '',
                            content: lesson.content || '',
                            duration: lesson.duration || '',
                            isFree: lesson.isFree !== undefined ? lesson.isFree : true,
                            price: lesson.price || 0
                          });
                        }}>
                          ✏️ Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteLesson(lesson.id, lesson.title)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================
            MANAGE MULTIMEDIA TAB
            ============================================ */}
        {activeTab === 'manage-multimedia' && (
          <div className="manage-multimedia-tab">
            <h3>
              🎬 Manage Multimedia Content
              {managingMultimedia && ` - ${managingMultimedia.lesson.title}`}
            </h3>

            {!managingMultimedia ? (
              <div className="select-lesson-prompt">
                <p>Select a lesson to manage its multimedia content:</p>
                <div className="lessons-grid">
                  {courses.map(course =>
                    courseLessons.map(lesson => (
                      <div key={`${course.id}-${lesson.id}`} className="lesson-select-card">
                        <div className="lesson-info">
                          <strong>{lesson.title}</strong>
                          <span>Course: {course.title}</span>
                          <span>Type: {lesson.isFree ? '🆓 FREE' : `💰 PAID - ${formatCurrency(lesson.price)}`}</span>
                        </div>
                        <button className="manage-media-btn" onClick={() => setManagingMultimedia({ courseKey: course.id, lesson })}>
                          🎬 Manage Media
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="multimedia-management">
                <button className="back-to-lessons" onClick={() => setManagingMultimedia(null)}>
                  ← Back to Lessons
                </button>
                <h4>Managing: {managingMultimedia.lesson.title}</h4>
                <div className="add-multimedia-form">
                  <h5>Add New Multimedia Content</h5>
                  <form onSubmit={handleAddMultimedia} className="teacher-form compact">
                    <div className="form-group">
                      <label>Media Type</label>
                      <select value={newMultimediaForm.type} onChange={(e) => setNewMultimediaForm({...newMultimediaForm, type: e.target.value})}>
                        <option value="video">🎬 Video</option>
                        <option value="image">🖼️ Image</option>
                        <option value="audio">🎵 Audio</option>
                        <option value="document">📄 Document</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Upload File</label>
                      <div className="file-upload-wrapper">
                        <input type="file" id="multimediaFile" onChange={handleMultimediaFileSelect} />
                        <label htmlFor="multimediaFile" className="file-upload-label">
                          <span className="upload-icon">📤</span>
                          {newMultimediaForm.fileName || 'Choose file'}
                        </label>
                      </div>
                      <small>Max file size: 50MB</small>
                    </div>
                    <button type="submit" className="submit-btn" disabled={isUploading}>
                      {isUploading ? '📤 Uploading...' : '➕ Add Media'}
                    </button>
                  </form>
                </div>
                <div className="existing-multimedia">
                  <h5>Existing Media Content</h5>
                  {managingMultimedia.lesson.multimedia && managingMultimedia.lesson.multimedia.length > 0 ? (
                    <div className="multimedia-list">
                      {managingMultimedia.lesson.multimedia.map(media => (
                        <div key={media.id} className="media-item">
                          <span className="media-icon">
                            {media.type === 'video' && '🎬'}
                            {media.type === 'image' && '🖼️'}
                            {media.type === 'audio' && '🎵'}
                            {media.type === 'document' && '📄'}
                          </span>
                          <span>{media.title}</span>
                          <button className="delete-btn" onClick={() => handleDeleteMultimedia(media.id, media.title)}>
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No multimedia content added yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================
            EARNINGS TAB
            ============================================ */}
        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            <h3>💰 Earnings & Withdrawals</h3>
            {wallet ? (
              <div className="earnings-content">
                <div className="balance-card">
                  <h4>Available Balance</h4>
                  <div className="balance-amount">{formatCurrency(wallet.balance)}</div>
                  <p>Total Earnings: {formatCurrency(wallet.totalEarnings)}</p>
                  <p>Pending Withdrawals: {formatCurrency(wallet.pendingWithdrawals)}</p>
                </div>

                <div className="payment-methods-section">
                  <h4>Payment Methods</h4>
                  <div className="payment-methods-grid">
                    <div className="payment-method-card">
                      <div className="method-icon">🏦</div>
                      <h5>Paystack</h5>
                      <p>Cards, Bank Transfer, USSD</p>
                      <button className={`select-method-btn ${paymentMethod === 'paystack' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('paystack')}>
                        {paymentMethod === 'paystack' ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                    <div className="payment-method-card">
                      <div className="method-icon">🌊</div>
                      <h5>Flutterwave</h5>
                      <p>Cards, Bank, Mobile Money</p>
                      <button className={`select-method-btn ${paymentMethod === 'flutterwave' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('flutterwave')}>
                        {paymentMethod === 'flutterwave' ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="withdrawal-section">
                  <h4>Withdraw Funds</h4>
                  <div className="withdrawal-form">
                    <div className="form-group">
                      <label>Amount to Withdraw (₦)</label>
                      <input type="number" value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Enter amount" min="100" max={wallet.balance} />
                      <small>Minimum withdrawal: ₦100</small>
                    </div>
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input type="text" value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                        placeholder="e.g., GTBank, Zenith Bank" />
                    </div>
                    <div className="form-group">
                      <label>Account Number</label>
                      <input type="text" value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                        placeholder="10-digit account number" />
                    </div>
                    <div className="form-group">
                      <label>Account Name</label>
                      <input type="text" value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                        placeholder="Name as it appears on bank account" />
                    </div>
                    <button onClick={handleWithdrawal} disabled={!withdrawalAmount || withdrawalAmount > wallet.balance}
                      className="withdraw-btn">
                      Request Withdrawal
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p>Loading wallet information...</p>
            )}
          </div>
        )}

        {/* ============================================
            PAYMENTS TAB
            ============================================ */}
        {activeTab === 'payments' && (
          <div className="payments-tab">
            <h3>💳 Payment History & Reports</h3>
            <div className="payment-actions">
              <button onClick={generatePaymentReport} className="report-btn">
                📊 Generate Payment Report
              </button>
              <button onClick={() => setActiveTab('earnings')} className="earnings-btn">
                💰 View Earnings
              </button>
            </div>
            <div className="payment-summary">
              <div className="summary-card">
                <h4>Total Transactions</h4>
                <div className="summary-number">
                  {transactions.filter(t => t.status === 'completed').length}
                </div>
              </div>
              <div className="summary-card">
                <h4>Total Earned</h4>
                <div className="summary-number">
                  {formatCurrency(transactions.filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + (t.amount || 0), 0))}
                </div>
              </div>
              <div className="summary-card">
                <h4>Pending Payments</h4>
                <div className="summary-number">
                  {transactions.filter(t => t.status === 'pending').length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            WHATSAPP TAB
            ============================================ */}
        {activeTab === 'whatsapp' && (
          <div className="whatsapp-tab">
            <h3>📱 WhatsApp Contact</h3>
            <p>Add your WhatsApp number so students can contact you directly</p>
            <div className="whatsapp-form">
              <div className="form-group">
                <label>WhatsApp Phone Number</label>
                <input type="tel" value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g., 2348012345678" />
                <small>Include country code without + sign</small>
              </div>
              <button onClick={saveWhatsAppNumber} className="save-btn">
                💾 Save WhatsApp Number
              </button>
              {teacherProfile.whatsappNumber && (
                <div className="whatsapp-preview">
                  <h4>Your WhatsApp Contact Link:</h4>
                  <div className="whatsapp-link">
                    <a href={getTeacherWhatsAppUrl(teacherProfile.uid)} target="_blank" rel="noopener noreferrer"
                      className="whatsapp-btn">
                      💬 Chat on WhatsApp
                    </a>
                  </div>
                  <p>Share this link with your students for direct communication</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;