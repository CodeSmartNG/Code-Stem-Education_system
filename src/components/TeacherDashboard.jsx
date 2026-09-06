// TeacherDashboard.js - Complete Updated Version

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
  const [viewingCourseLessons, setViewingCourseLessons] = useState(null);

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

  // ✅ File upload handler
  const uploadFileToFirebase = async (file, path) => {
    try {
      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      return await fileToBase64(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

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
        enrolledStudents: 0
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




// ✅ Handle Add Lesson - WITH FIREBASE STORAGE
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

    // 1. Prepare clean lesson data
    const lessonData = {
      title: newLessonForm.title,
      content: newLessonForm.content,
      duration: newLessonForm.duration,
      isFree: newLessonForm.isFree,
      price: newLessonForm.isFree ? 0 : newLessonForm.price,
      order: newLessonForm.order || courseLessons.length + 1
    };

    // 2. Create the lesson first
    const lesson = await createLesson(selectedCourse, lessonData);

    // 3. ✅ Upload video to Firebase Storage (NOT base64)
    if (newLessonForm.videoFile) {
      const currentUser = await getCurrentUser();
      const fileExtension = newLessonForm.videoFile.name.split('.').pop();
      const filePath = `teachers/${currentUser.uid}/videos/${Date.now()}_${newLessonForm.videoFileName}`;
      
      // ✅ Use Firebase Storage upload
      const downloadURL = await uploadFileToFirebase(newLessonForm.videoFile, filePath);

      const multimediaData = {
        type: 'video',
        url: downloadURL,  // ✅ This is a URL, not base64 data
        title: newLessonForm.videoTitle || newLessonForm.videoFileName || 'Lesson Video',
        description: newLessonForm.videoDescription || 'Video content for this lesson',
        fileName: newLessonForm.videoFileName,
        fileSize: newLessonForm.videoFile.size,
        fileType: newLessonForm.videoFile.type,
        firebasePath: filePath
      };

      // Add multimedia to the lesson
      await addMultimediaToLesson(lesson.id, multimediaData);
    }

    // 4. Add quiz if there are questions
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

    // Reset form
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
  






  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    try {
      const updatedData = {
        ...editLessonForm,
        isLocked: !editLessonForm.isFree
      };

      await updateLesson(editingLesson.lessonId, updatedData);
      alert('✅ Lesson updated successfully!');
      setEditingLesson(null);
      setEditLessonForm({});
      await loadCourseLessons(selectedCourse);
    } catch (error) {
      alert('❌ Error updating lesson: ' + error.message);
    }
  };

  const handleDeleteLesson = async (lessonId, lessonTitle) => {
    if (window.confirm(`⚠️ Are you sure you want to delete the lesson "${lessonTitle}"?`)) {
      try {
        await deleteLesson(lessonId);
        alert('✅ Lesson deleted successfully!');
        await loadCourseLessons(selectedCourse);
      } catch (error) {
        alert('❌ Error deleting lesson: ' + error.message);
      }
    }
  };

  // ✅ Quiz Management Functions
  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }

    if (currentQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill all options');
      return;
    }

    const newQuestion = {
      id: Date.now(),
      ...currentQuestion,
      options: [...currentQuestion.options]
    };

    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setCurrentQuestion({
      question: '',
      type: 'text',
      options: ['', '', '', ''],
      correctAnswer: 0,
      imageUrl: ''
    });
  };

  const handleRemoveQuestion = (questionId) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentQuestion(prev => ({
      ...prev,
      correctAnswer: index
    }));
  };

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

  // ✅ Handle video file selection
  const handleVideoFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
      if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
        alert('Please select a valid video file (MP4, WebM, OGG, MOV, AVI)');
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        alert('Video file size must be less than 100MB');
        return;
      }

      setNewLessonForm({
        ...newLessonForm,
        videoFile: file,
        videoFileName: file.name
      });
    }
  };

  // ✅ Handle multimedia file selection
  const handleMultimediaFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      };

      const allowedTypes = validTypes[newMultimediaForm.type] || [];
      if (!allowedTypes.includes(file.type) && !file.type.startsWith(newMultimediaForm.type === 'video' ? 'video/' : '')) {
        alert(`Please select a valid ${newMultimediaForm.type} file`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }

      setNewMultimediaForm({
        ...newMultimediaForm,
        file: file,
        fileName: file.name
      });
    }
  };

  // ✅ Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₦0';
    return `₦${amount.toLocaleString() || '0'}`;
  };

  // ✅ Handle multimedia file upload - FIXED
  const handleAddMultimedia = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = simulateUploadProgress();
      const multimediaData = { ...newMultimediaForm };

      if (newMultimediaForm.file) {
        const currentUser = await getCurrentUser();
        const filePath = `teachers/${currentUser.uid}/media/${Date.now()}_${newMultimediaForm.fileName}`;
        const fileUrl = await uploadFileToFirebase(newMultimediaForm.file, filePath);

        multimediaData.url = fileUrl;
        multimediaData.fileName = newMultimediaForm.fileName;
        multimediaData.fileSize = newMultimediaForm.file.size;
        multimediaData.fileType = newMultimediaForm.file.type;
        multimediaData.firebasePath = filePath;
      }

      // ✅ FIXED: Only pass lessonId and multimediaData
      await addMultimediaToLesson(
        managingMultimedia.lesson.id,  // lessonId
        multimediaData                  // multimediaData
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      alert('✅ Multimedia content added successfully!');

      setNewMultimediaForm({
        type: 'video',
        file: null,
        fileName: '',
        title: '',
        description: ''
      });
      await loadData();
      setIsUploading(false);
    } catch (error) {
      console.error('Error adding multimedia:', error);
      alert('❌ Error adding multimedia: ' + error.message);
      setIsUploading(false);
    }
  };

  const handleDeleteMultimedia = async (multimediaId, multimediaTitle) => {
    if (window.confirm(`⚠️ Are you sure you want to delete "${multimediaTitle}"?`)) {
      try {
        await deleteMultimedia(multimediaId);
        alert('✅ Multimedia content deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting multimedia: ' + error.message);
      }
    }
  };

  const startManageMultimedia = (courseKey, lesson) => {
    setManagingMultimedia({ courseKey, lesson });
    setActiveTab('manage-multimedia');
  };

  // ✅ Save WhatsApp number
  const saveWhatsAppNumber = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      await updateTeacherProfileWithWhatsApp(currentUser.uid, {
        whatsappNumber: whatsappNumber
      });
      alert('✅ WhatsApp number saved successfully!');
      await loadTeacherProfile();
    } catch (error) {
      alert('❌ Error saving WhatsApp number: ' + error.message);
    }
  };

  // ✅ Process withdrawal
  const handleWithdrawal = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      if (!withdrawalAmount || withdrawalAmount <= 0) {
        alert('Please enter a valid withdrawal amount');
        return;
      }

      if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
        alert('Please fill in all bank details');
        return;
      }

      if (window.confirm(`⚠️ Are you sure you want to withdraw ₦${withdrawalAmount}?`)) {
        const updatedWallet = await withdrawFromWallet(currentUser.uid, parseFloat(withdrawalAmount), bankDetails);
        setWallet(updatedWallet);
        setWithdrawalAmount('');
        setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
        alert('✅ Withdrawal request submitted successfully!');
        await loadTransactions();
      }
    } catch (error) {
      alert('❌ Error processing withdrawal: ' + error.message);
    }
  };

  // ✅ Generate payment report
  const generatePaymentReport = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      const allTransactions = paymentService.getUserTransactions(currentUser.uid);
      const completedTransactions = allTransactions.filter(t => t.status === 'completed');
      const totalEarnings = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

      const report = {
        teacherName: currentUser.name || 'Teacher',
        teacherId: currentUser.uid,
        generatedAt: new Date().toISOString(),
        totalTransactions: completedTransactions.length,
        totalEarnings: totalEarnings,
        transactions: completedTransactions,
        paymentMethods: {
          paystack: completedTransactions.filter(t => t.paymentMethod === 'paystack').length,
          flutterwave: completedTransactions.filter(t => t.paymentMethod === 'flutterwave').length
        }
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_report_${currentUser.uid}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert('📊 Payment report downloaded successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  // ✅ View transaction details
  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowPaymentDetails(true);
  };

  if (loading) {
    return <div className="loading-teacher">📚 Loading teacher dashboard...</div>;
  }

  if (!stats) {
    return <div className="loading-teacher">⚠️ No teacher data found. Please make sure you're logged in as a teacher.</div>;
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
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            >
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
        {/* Overview Tab */}
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

        {/* My Courses Tab */}
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
                      </div>
                    </div>
                    <div className="course-stats">
                      <span>📝 Lessons: {course.lessonIds?.length || 0}</span>
                      <span>👨‍🎓 Students: {course.enrolledStudents || 0}</span>
                    </div>
                    <div className="course-actions">
                      <button 
                        className="view-btn" 
                        onClick={() => loadCourseLessons(course.id)}
                      >
                        📝 Manage Lessons
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Course Tab */}
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
                  placeholder="Describe what students will learn in this course"
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

        {/* Add Lesson Tab */}
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
                {/* Select Course */}
                <div className="form-group">
                  <label>Select Course *</label>
                  <select
                    value={selectedCourse || ''}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Choose a course --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Title */}
                <div className="form-group">
                  <label>Lesson Title *</label>
                  <input
                    type="text"
                    value={newLessonForm.title}
                    onChange={(e) => setNewLessonForm({...newLessonForm, title: e.target.value})}
                    required
                    placeholder="e.g., Introduction to React"
                    className="form-input"
                  />
                </div>

                {/* Lesson Pricing Section */}
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
                          placeholder="Enter price"
                          className="form-input"
                        />
                        <small>Price between ₦100 - ₦10,000</small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson Content */}
                <div className="form-group">
                  <label>Lesson Content *</label>
                  <textarea
                    value={newLessonForm.content}
                    onChange={(e) => setNewLessonForm({...newLessonForm, content: e.target.value})}
                    required
                    rows="4"
                    placeholder="Write the lesson content here..."
                    className="form-textarea"
                  />
                </div>

                {/* Duration */}
                <div className="form-group">
                  <label>Duration *</label>
                  <input
                    type="text"
                    value={newLessonForm.duration}
                    onChange={(e) => setNewLessonForm({...newLessonForm, duration: e.target.value})}
                    placeholder="30 minutes"
                    required
                    className="form-input"
                  />
                </div>

                {/* Lesson Order */}
                <div className="form-group">
                  <label>Lesson Order</label>
                  <input
                    type="number"
                    value={newLessonForm.order}
                    onChange={(e) => setNewLessonForm({...newLessonForm, order: parseInt(e.target.value) || 0})}
                    placeholder={`Auto: ${courseLessons.length + 1}`}
                    min="1"
                    className="form-input"
                  />
                  <small>Leave empty for auto-order (appears at the end)</small>
                </div>

                {/* Video Upload Section */}
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
                        className="file-input"
                      />
                      <label htmlFor="videoFile" className="file-upload-label">
                        <span className="upload-icon">📤</span>
                        {newLessonForm.videoFileName ? (
                          <span className="file-name">{newLessonForm.videoFileName}</span>
                        ) : (
                          <span>Choose Video File (MP4, WebM, OGG, MOV, AVI)</span>
                        )}
                      </label>
                    </div>
                    <small className="help-text">
                      Max file size: 100MB • Supported formats: MP4, WebM, OGG, MOV, AVI
                    </small>
                  </div>

                  {newLessonForm.videoFile && (
                    <div className="file-preview">
                      <video controls style={{ maxWidth: '100%', maxHeight: '300px' }}>
                        <source src={URL.createObjectURL(newLessonForm.videoFile)} type={newLessonForm.videoFile.type} />
                        Your browser does not support the video tag.
                      </video>
                      <p className="file-details">
                        File: {newLessonForm.videoFileName} • Size: {(newLessonForm.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Video Title</label>
                    <input
                      type="text"
                      value={newLessonForm.videoTitle}
                      onChange={(e) => setNewLessonForm({...newLessonForm, videoTitle: e.target.value})}
                      placeholder="Lesson Video Tutorial"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Video Description</label>
                    <input
                      type="text"
                      value={newLessonForm.videoDescription}
                      onChange={(e) => setNewLessonForm({...newLessonForm, videoDescription: e.target.value})}
                      placeholder="Watch this video to learn more"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Quiz Section */}
                <div className="quiz-section">
                  <div className="section-header">
                    <h4>📝 Quiz Content (Optional)</h4>
                    <button 
                      type="button"
                      onClick={() => setShowQuizForm(!showQuizForm)}
                      className="toggle-btn"
                    >
                      {showQuizForm ? '❌ Hide Quiz Form' : '➕ Add Quiz'}
                    </button>
                  </div>

                  {showQuizForm && (
                    <div className="quiz-form">
                      <div className="form-group">
                        <label>Quiz Title</label>
                        <input
                          type="text"
                          value={quizForm.title}
                          onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                          placeholder="Lesson Quiz"
                          className="form-input"
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
                          className="form-input"
                        />
                      </div>

                      <div className="current-question">
                        <h5>Add New Question</h5>

                        <div className="form-group">
                          <label>Question Type</label>
                          <select
                            value={currentQuestion.type}
                            onChange={(e) => setCurrentQuestion({...currentQuestion, type: e.target.value})}
                            className="form-select"
                          >
                            <option value="text">📝 Text Question</option>
                            <option value="image">🖼️ Image Question</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Question Text</label>
                          <input
                            type="text"
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                            placeholder="Enter your question here"
                            className="form-input"
                          />
                        </div>

                        {currentQuestion.type === 'image' && (
                          <div className="form-group">
                            <label>Image URL</label>
                            <input
                              type="url"
                              value={currentQuestion.imageUrl}
                              onChange={(e) => setCurrentQuestion({...currentQuestion, imageUrl: e.target.value})}
                              placeholder="https://example.com/image.jpg"
                              className="form-input"
                            />
                          </div>
                        )}

                        <div className="options-section">
                          <h6>Options</h6>
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="option-item">
                              <input
                                type="radio"
                                name="correctAnswer"
                                checked={currentQuestion.correctAnswer === index}
                                onChange={() => handleCorrectAnswerChange(index)}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="option-input"
                              />
                              <span className="correct-label">
                                {currentQuestion.correctAnswer === index ? '✅ Correct' : ''}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button 
                          type="button" 
                          onClick={handleAddQuestion}
                          className="add-question-btn"
                        >
                          ➕ Add Question to Quiz
                        </button>
                      </div>

                      {quizForm.questions.length > 0 && (
                        <div className="existing-questions">
                          <h5>Questions in Quiz ({quizForm.questions.length})</h5>
                          {quizForm.questions.map((question, index) => (
                            <div key={question.id} className="question-item">
                              <div className="question-info">
                                <strong>Q{index + 1}:</strong> {question.question}
                                {question.type === 'image' && question.imageUrl && (
                                  <div className="question-image-preview">
                                    <img src={question.imageUrl} alt="Question" style={{maxWidth: '100px'}} />
                                  </div>
                                )}
                                <div className="options-preview">
                                  Options: {question.options.join(', ')}
                                </div>
                                <div className="correct-answer">
                                  Correct: Option {question.correctAnswer + 1}
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleRemoveQuestion(question.id)}
                                className="remove-btn"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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

        {/* Manage Lessons Tab */}
        {activeTab === 'manage-lessons' && (
          <div className="manage-lessons-tab">
            <h3>
              📝 Manage Lessons
              {selectedCourse && courses.find(c => c.id === selectedCourse) && 
                ` - ${courses.find(c => c.id === selectedCourse)?.title}`}
            </h3>

            <div className="course-selector">
              <label>Select Course:</label>
              <select 
                value={selectedCourse || ''} 
                onChange={(e) => loadCourseLessons(e.target.value)}
                className="course-select"
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <button 
                className="add-lesson-btn"
                onClick={() => setActiveTab('add-lesson')}
              >
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
                      {editingLesson?.lessonId === lesson.id ? (
                        <div className="edit-lesson-form">
                          <h4>Edit Lesson</h4>
                          <form onSubmit={handleUpdateLesson} className="teacher-form">
                            <div className="form-group">
                              <label>Lesson Title *</label>
                              <input
                                type="text"
                                value={editLessonForm.title}
                                onChange={(e) => setEditLessonForm({...editLessonForm, title: e.target.value})}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Content *</label>
                              <textarea
                                value={editLessonForm.content}
                                onChange={(e) => setEditLessonForm({...editLessonForm, content: e.target.value})}
                                required
                                rows="4"
                              />
                            </div>
                            <div className="form-group">
                              <label>Duration *</label>
                              <input
                                type="text"
                                value={editLessonForm.duration}
                                onChange={(e) => setEditLessonForm({...editLessonForm, duration: e.target.value})}
                                required
                                placeholder="30 minutes"
                              />
                            </div>
                            <div className="form-group">
                              <label>Lesson Type</label>
                              <div className="pricing-options">
                                <label>
                                  <input
                                    type="radio"
                                    name="editLessonType"
                                    checked={editLessonForm.isFree}
                                    onChange={() => setEditLessonForm({...editLessonForm, isFree: true, price: 0})}
                                  />
                                  🆓 Free Lesson
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name="editLessonType"
                                    checked={!editLessonForm.isFree}
                                    onChange={() => setEditLessonForm({...editLessonForm, isFree: false, price: editLessonForm.price || 500})}
                                  />
                                  💰 Paid Lesson
                                </label>
                              </div>
                            </div>
                            {!editLessonForm.isFree && (
                              <div className="form-group">
                                <label>Price (₦)</label>
                                <input
                                  type="number"
                                  value={editLessonForm.price}
                                  onChange={(e) => setEditLessonForm({...editLessonForm, price: parseInt(e.target.value) || 0})}
                                  min="100"
                                  max="10000"
                                />
                                <small>Price between ₦100 - ₦10,000</small>
                              </div>
                            )}
                            <div className="form-actions">
                              <button type="submit" className="save-btn">💾 Save Changes</button>
                              <button type="button" onClick={() => setEditingLesson(null)} className="cancel-btn">❌ Cancel</button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <>
                          <div className="lesson-info">
                            <h5>📝 {lesson.title}</h5>
                            <p><strong>Duration:</strong> ⏱️ {lesson.duration}</p>
                            <p><strong>Type:</strong> 
                              <span className={`lesson-type ${lesson.isFree ? 'free' : 'paid'}`}>
                                {lesson.isFree ? ' 🆓 FREE' : ` 💰 PAID - ${formatCurrency(lesson.price)}`}
                              </span>
                            </p>
                            <p className="lesson-content-preview">{lesson.content?.substring(0, 100)}...</p>
                          </div>
                          <div className="lesson-actions">
                            <button 
                              className="edit-btn"
                              onClick={() => {
                                setEditingLesson({ lessonId: lesson.id });
                                setEditLessonForm({
                                  title: lesson.title || '',
                                  content: lesson.content || '',
                                  duration: lesson.duration || '',
                                  isFree: lesson.isFree !== undefined ? lesson.isFree : true,
                                  price: lesson.price || 0
                                });
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Multimedia Tab */}
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
                        <div className="multimedia-stats">
                          {lesson.multimedia && lesson.multimedia.length > 0 ? (
                            <span className="has-media">🎬 {lesson.multimedia.length} media files</span>
                          ) : (
                            <span className="no-media">No media</span>
                          )}
                        </div>
                        <button 
                          className="manage-media-btn"
                          onClick={() => startManageMultimedia(course.id, lesson)}
                        >
                          🎬 Manage Media
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="multimedia-management">
                <div className="management-header">
                  <button 
                    className="back-to-lessons"
                    onClick={() => setManagingMultimedia(null)}
                  >
                    ← Back to Lessons
                  </button>
                  <h4>Managing: {managingMultimedia.lesson.title}</h4>
                </div>

                <div className="add-multimedia-form">
                  <h5>Add New Multimedia Content</h5>
                  <form onSubmit={handleAddMultimedia} className="teacher-form compact">
                    <div className="form-group">
                      <label>Media Type</label>
                      <select
                        value={newMultimediaForm.type}
                        onChange={(e) => {
                          setNewMultimediaForm({
                            ...newMultimediaForm,
                            type: e.target.value,
                            file: null,
                            fileName: ''
                          });
                        }}
                        required
                      >
                        <option value="video">🎬 Video</option>
                        <option value="image">🖼️ Image</option>
                        <option value="audio">🎵 Audio</option>
                        <option value="document">📄 Document</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Upload File</label>
                      <div className="file-upload-wrapper">
                        <input
                          type="file"
                          id="multimediaFile"
                          accept={
                            newMultimediaForm.type === 'video' ? 'video/*,.mp4,.webm,.ogg,.mov,.avi' :
                            newMultimediaForm.type === 'image' ? 'image/*,.jpg,.jpeg,.png,.gif,.webp,.svg' :
                            newMultimediaForm.type === 'audio' ? 'audio/*,.mp3,.ogg,.wav' :
                            '.pdf,.doc,.docx,.txt'
                          }
                          onChange={handleMultimediaFileSelect}
                          className="file-input"
                        />
                        <label htmlFor="multimediaFile" className="file-upload-label">
                          <span className="upload-icon">📤</span>
                          {newMultimediaForm.fileName ? (
                            <span className="file-name">{newMultimediaForm.fileName}</span>
                          ) : (
                            <span>Choose {newMultimediaForm.type} file</span>
                          )}
                        </label>
                      </div>
                      <small className="help-text">
                        Max file size: 50MB • Uploads to Firebase Storage
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={newMultimediaForm.title}
                        onChange={(e) => setNewMultimediaForm({...newMultimediaForm, title: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={newMultimediaForm.description}
                        onChange={(e) => setNewMultimediaForm({...newMultimediaForm, description: e.target.value})}
                        rows="2"
                      />
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
                          <div className="media-preview">
                            {media.type === 'video' && <span className="media-icon">🎬</span>}
                            {media.type === 'image' && <span className="media-icon">🖼️</span>}
                            {media.type === 'audio' && <span className="media-icon">🎵</span>}
                            {media.type === 'document' && <span className="media-icon">📄</span>}
                            <div className="media-info">
                              <strong>{media.title}</strong>
                              <span>Type: {media.type}</span>
                              {media.fileName && <span>File: {media.fileName}</span>}
                              {media.fileSize && <span>Size: {(media.fileSize / (1024 * 1024)).toFixed(2)} MB</span>}
                            </div>
                          </div>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteMultimedia(media.id, media.title)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-media-message">No multimedia content added yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Earnings Tab */}
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
                      <button 
                        className={`select-method-btn ${paymentMethod === 'paystack' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('paystack')}
                      >
                        {paymentMethod === 'paystack' ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                    <div className="payment-method-card">
                      <div className="method-icon">🌊</div>
                      <h5>Flutterwave</h5>
                      <p>Cards, Bank, Mobile Money</p>
                      <button 
                        className={`select-method-btn ${paymentMethod === 'flutterwave' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('flutterwave')}
                      >
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
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="100"
                        max={wallet.balance}
                      />
                      <small>Minimum withdrawal: ₦100</small>
                    </div>

                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                        placeholder="e.g., GTBank, Zenith Bank"
                      />
                    </div>

                    <div className="form-group">
                      <label>Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                        placeholder="10-digit account number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Account Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                        placeholder="Name as it appears on bank account"
                      />
                    </div>

                    <button 
                      onClick={handleWithdrawal}
                      disabled={!withdrawalAmount || withdrawalAmount > wallet.balance}
                      className="withdraw-btn"
                    >
                      Request Withdrawal
                    </button>
                  </div>
                </div>

                <div className="transaction-history">
                  <h4>Transaction History</h4>
                  {wallet.transactions && wallet.transactions.length > 0 ? (
                    <div className="transactions-list">
                      {wallet.transactions.map((transaction, index) => (
                        <div key={index} className="transaction-item">
                          <div className="transaction-info">
                            <span className={`transaction-type ${transaction.type}`}>
                              {transaction.type === 'credit' ? '💰 Credit' : '💸 Withdrawal'}
                            </span>
                            <span className="transaction-amount">
                              {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </div>
                          <div className="transaction-details">
                            <span className="transaction-description">{transaction.description}</span>
                            <span className="transaction-date">
                              {new Date(transaction.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-transactions">No transactions yet</p>
                  )}
                </div>
              </div>
            ) : (
              <p>Loading wallet information...</p>
            )}
          </div>
        )}

        {/* Payments Tab */}
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
                  {formatCurrency(transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <h4>Pending Payments</h4>
                <div className="summary-number">
                  {transactions.filter(t => t.status === 'pending').length}
                </div>
              </div>
            </div>

            <div className="transactions-list-full">
              <h4>Transaction History</h4>
              {transactions.length > 0 ? (
                <div className="transactions-table">
                  <div className="table-header">
                    <span>Reference</span>
                    <span>Amount</span>
                    <span>Method</span>
                    <span>Status</span>
                    <span>Date</span>
                    <span>Action</span>
                  </div>
                  {transactions.map((transaction, index) => (
                    <div key={index} className="table-row">
                      <span className="ref">{transaction.reference}</span>
                      <span className="amount">{formatCurrency(transaction.amount)}</span>
                      <span className="method">{transaction.paymentMethod}</span>
                      <span className={`status ${transaction.status}`}>
                        {transaction.status === 'completed' ? '✅' : 
                         transaction.status === 'pending' ? '⏳' : '❌'}
                        {transaction.status}
                      </span>
                      <span className="date">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                      <span className="action">
                        <button 
                          onClick={() => viewTransactionDetails(transaction)}
                          className="view-btn"
                        >
                          View
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-transactions">No transactions yet.</p>
              )}
            </div>

            {/* Payment Details Modal */}
            {showPaymentDetails && selectedTransaction && (
              <div className="modal-overlay" onClick={() => {
                setShowPaymentDetails(false);
                setSelectedTransaction(null);
              }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Transaction Details</h3>
                  <button 
                    className="modal-close"
                    onClick={() => {
                      setShowPaymentDetails(false);
                      setSelectedTransaction(null);
                    }}
                  >
                    ×
                  </button>
                  <div className="transaction-details-modal">
                    <div className="detail-row">
                      <span className="label">Reference:</span>
                      <span className="value">{selectedTransaction.reference}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value">{formatCurrency(selectedTransaction.amount)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Payment Method:</span>
                      <span className="value">{selectedTransaction.paymentMethod}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status:</span>
                      <span className={`value status ${selectedTransaction.status}`}>
                        {selectedTransaction.status}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Date:</span>
                      <span className="value">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="whatsapp-tab">
            <h3>📱 WhatsApp Contact</h3>
            <p>Add your WhatsApp number so students can contact you directly</p>

            <div className="whatsapp-form">
              <div className="form-group">
                <label>WhatsApp Phone Number</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g., 2348012345678"
                />
                <small>Include country code without + sign (e.g., 2348012345678 for Nigeria)</small>
              </div>

              <button onClick={saveWhatsAppNumber} className="save-btn">
                💾 Save WhatsApp Number
              </button>

              {teacherProfile.whatsappNumber && (
                <div className="whatsapp-preview">
                  <h4>Your WhatsApp Contact Link:</h4>
                  <div className="whatsapp-link">
                    <a 
                      href={getTeacherWhatsAppUrl(teacherProfile.uid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="whatsapp-btn"
                    >
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