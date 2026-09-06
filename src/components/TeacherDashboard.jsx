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
  // ✅ ADD THESE
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

  // ❌ REMOVED: The local uploadFileToFirebase function (was using base64)
  // Now using the imported version from storage.jsx

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

  // ✅ Handle Add Lesson - WITH FIREBASE STORAGE (uses imported function)
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

      // 3. ✅ Upload video to Firebase Storage (uses imported function)
      if (newLessonForm.videoFile) {
        const currentUser = await getCurrentUser();
        const filePath = `teachers/${currentUser.uid}/videos/${Date.now()}_${newLessonForm.videoFileName}`;

        console.log('📤 Uploading video to Firebase Storage...');
        console.log('📤 File size:', newLessonForm.videoFile.size, 'bytes');

        // ✅ This uses the imported function from storage.jsx (Firebase Storage)
        const downloadURL = await uploadFileToFirebase(newLessonForm.videoFile, filePath);

        console.log('✅ Upload complete! Download URL:', downloadURL);

        const multimediaData = {
          type: 'video',
          url: downloadURL,  // ✅ This is a URL, NOT base64 data
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

  // ... (rest of the code remains the same)

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
        // ✅ Uses imported function
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

  // ... (rest of the code remains the same)
};

export default TeacherDashboard;