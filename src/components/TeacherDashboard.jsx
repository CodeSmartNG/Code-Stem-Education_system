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
        isPublished: true // ✅ Auto-publish courses
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
    if (window.confirm('⚠️ Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteCourse(courseId);
        alert('✅ Course deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting course: ' + error.message);
      }
    }
  };

  // ✅ Publish Course - FIXED (moved inside component)
  const handlePublishCourse = async (courseId) => {
    try {
      await updateCourse(courseId, { isPublished: true });
      alert('✅ Course published successfully! Students can now see it.');
      await loadData();
    } catch (error) {
      alert('❌ Error publishing course: ' + error.message);
    }
  };

  // ✅ Unpublish Course
  const handleUnpublishCourse = async (courseId) => {
    try {
      await updateCourse(courseId, { isPublished: false });
      alert('✅ Course unpublished successfully!');
      await loadData();
    } catch (error) {
      alert('❌ Error unpublishing course: ' + error.message);
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

      // 3. ✅ Upload video to Firebase Storage
      if (newLessonForm.videoFile) {
        const currentUser = await getCurrentUser();
        const filePath = `teachers/${currentUser.uid}/videos/${Date.now()}_${newLessonForm.videoFileName}`;

        console.log('📤 Uploading video to Firebase Storage...');
        console.log('📤 File size:', newLessonForm.videoFile.size, 'bytes');

        const downloadURL = await uploadFileToFirebase(newLessonForm.videoFile, filePath);

        console.log('✅ Upload complete! Download URL:', downloadURL);

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

  // ✅ Handle multimedia file upload
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

      await addMultimediaToLesson(
        managingMultimedia.lesson.id,
        multimediaData
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

        {/* My Courses Tab - with Publish/Unpublish buttons */}
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
                        <button 
                          className="publish-btn" 
                          onClick={() => handlePublishCourse(course.id)}
                        >
                          📢 Publish
                        </button>
                      )}
                      {course.isPublished && (
                        <button 
                          className="unpublish-btn" 
                          onClick={() => handleUnpublishCourse(course.id)}
                        >
                          🔒 Unpublish
                        </button>
                      )}
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

        {/* Add the rest of your tabs (Add Course, Add Lesson, Manage Lessons, Manage Multimedia, Earnings, Payments, WhatsApp) */}
        {/* ... keep your existing code for these tabs ... */}
      </div>
    </div>
  );
};

export default TeacherDashboard;