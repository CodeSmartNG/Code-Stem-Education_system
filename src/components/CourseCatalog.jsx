// src/components/CourseCatalog.jsx
import React, { useState, useEffect } from 'react';
import {
  getCourses,
  getCurrentUser,
  purchaseLesson,
  getTeacherWhatsAppUrl,
  getMultimediaByLesson,
  getLessonById,
  getCourseById,
  apiCall,
} from '../utils/storageAPI';
import Quiz from './Quiz';
import MultimediaViewer from './MultimediaViewer';
import PaymentModal from './payments/PaymentModal';
import './CourseCatalog.css';

const CourseCatalog = ({ student, setStudent }) => {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lessonMultimedia, setLessonMultimedia] = useState([]);
  const [purchasedLessons, setPurchasedLessons] = useState([]);

  useEffect(() => {
    loadCourses();
  }, []);

  // ============================================
  // LOAD COURSES + PURCHASED LESSONS
  // ============================================
  const loadCourses = async () => {
    try {
      setIsLoading(true);

      const coursesData = await getCourses();

      const normalizedCourses = (coursesData || []).map((course) => {
        const courseId = course.id || course._id;
        let lessons = course.lessons || course.lessonIds || [];

        if (Array.isArray(lessons) && lessons.length > 0 && typeof lessons[0] === 'string') {
          lessons = [];
        }

        lessons = lessons.map((lesson) => ({
          ...lesson,
          id: lesson.id || lesson._id,
          _id: lesson._id || lesson.id,
        }));

        return {
          ...course,
          id: courseId,
          _id: course._id || courseId,
          lessons,
        };
      });

      const publishedCourses = {};
      normalizedCourses.forEach((course) => {
        if (course.isPublished !== false) {
          publishedCourses[course.id] = course;
        }
      });

      setCourses(publishedCourses);

      // ✅ Load purchased lesson IDs for lock checks
const currentUser = await getCurrentUser();   // ← ADD AWAIT
console.log('🔑 currentUser for purchased check:', currentUser?.id);

if (currentUser?.id) {
  try {
    const response = await apiCall('/lessons/purchased');
    console.log('📋 /lessons/purchased response:', response);
    setPurchasedLessons(response.lessonIds || []);
    console.log('📋 Purchased lessons set:', response.lessonIds);
  } catch (err) {
    console.warn('Failed to load purchased lessons:', err.message);
    setPurchasedLessons([]);
  }
} else {
  console.warn('⚠️ No currentUser.id — skipping purchased load');
}

      setError(null);
    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setCourses({});
      setError('Failed to load courses. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // LOAD LESSON MULTIMEDIA
  // ============================================
  const loadLessonMultimedia = async (courseKey, lessonId) => {
    try {
      setIsLoading(true);
      const multimedia = await getMultimediaByLesson(lessonId);
      setLessonMultimedia(multimedia || []);

      const lesson = await getLessonById(lessonId);
      if (lesson) {
        setCourses((prev) => ({
          ...prev,
          [courseKey]: {
            ...prev[courseKey],
            lessons: prev[courseKey]?.lessons?.map((l) =>
              l.id === lessonId ? { ...l, ...lesson } : l
            ),
          },
        }));
      }
    } catch (error) {
      console.error('❌ Error loading lesson multimedia:', error);
      setLessonMultimedia([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const safeObjectEntries = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') return [];
      return Object.entries(obj);
    } catch (err) {
      return [];
    }
  };

  const safeObjectKeys = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') return [];
      return Object.keys(obj);
    } catch (err) {
      return [];
    }
  };

  const toggleCourseExpansion = (courseKey) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseKey]: !prev[courseKey],
    }));
  };

  const expandAllCourses = () => {
    const courseKeys = safeObjectKeys(courses);
    const allExpanded = {};
    courseKeys.forEach((key) => {
      allExpanded[key] = true;
    });
    setExpandedCourses(allExpanded);
  };

  const collapseAllCourses = () => {
    setExpandedCourses({});
  };

  // ✅ Synchronous access check — uses purchasedLessons state
  const checkHasAccess = (lesson) => {
    if (!lesson) return false;
    if (lesson.isFree === true) return true;

    const lessonId = lesson.id || lesson._id;
    return purchasedLessons.includes(lessonId) || purchasedLessons.includes(lesson._id);
  };

  // ============================================
  // QUIZ HANDLERS
  // ============================================
  const handleStartQuiz = (courseKey, lessonIndex) => {
    try {
      if (!courses || !courses[courseKey]) return;
      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];

      if (lesson?.quiz) {
        setCurrentQuiz(lesson.quiz);
        setShowQuiz(true);
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
    }
  };

  const handleQuizComplete = async (scorePercentage, passed) => {
    try {
      if (!selectedCourse || !courses[selectedCourse]) return;

      const updatedStudent = { ...student };
      const lessonId = `${selectedCourse}-${courses[selectedCourse].lessons?.[currentLesson]?.id}`;

      if (passed && lessonId && !updatedStudent.completedLessons?.includes(lessonId)) {
        if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
        updatedStudent.completedLessons.push(lessonId);

        const totalLessons = courses[selectedCourse].lessons?.length || 0;
        const completedLessons =
          courses[selectedCourse].lessons?.filter((lesson) =>
            updatedStudent.completedLessons?.includes(`${selectedCourse}-${lesson.id}`)
          ).length || 0;

        if (!updatedStudent.progress) updatedStudent.progress = {};
        updatedStudent.progress[selectedCourse] = Math.min(
          (completedLessons / totalLessons) * 100,
          100
        );

        await setStudent(updatedStudent);
      }

      setShowQuiz(false);
      setCurrentQuiz(null);
    } catch (err) {
      console.error('Error completing quiz:', err);
    }
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  // ============================================
  // LESSON PURCHASE — Opens payment modal
  // ============================================
  const handlePurchaseLesson = (courseKey, lessonIndex) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('Please log in to purchase lessons');
      return;
    }

    const course = courses[courseKey];
    const lesson = course?.lessons?.[lessonIndex];

    if (!lesson) {
      console.error('Lesson not found');
      return;
    }

    console.log('💳 Opening payment modal for:', lesson.title);

    // ✅ Set the lesson and open the modal
    setSelectedLesson({
      courseKey,
      lessonIndex,
      lesson: {
        ...lesson,
        title: lesson.title || 'Untitled Lesson',
        courseId: courseKey,
        price: lesson.price || 500,
        teacherId: course.teacherId || lesson.teacherId || 'default_teacher',
        teacherName: course.teacherName || 'Course Teacher',
      },
    });

    setShowPaymentModal(true);
  };

  // ============================================
  // START LESSON
  // ============================================
  const handleStartLesson = async (courseKey, lessonIndex) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];

      if (!lesson) {
        console.error('Lesson not found');
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in to access lessons');
        return;
      }

      // ✅ Synchronous check
      const hasAccess = checkHasAccess(lesson);

      if (!hasAccess) {
        // ✅ Open payment modal instead of calling purchaseLesson directly
        setSelectedLesson({
          courseKey,
          lessonIndex,
          lesson: {
            ...lesson,
            title: lesson.title || 'Untitled Lesson',
            courseId: courseKey,
            price: lesson.price || 500,
            teacherId: course.teacherId || lesson.teacherId || 'default_teacher',
            teacherName: course.teacherName || 'Course Teacher',
          },
        });
        setShowPaymentModal(true);
        return;
      }

      // ✅ User has access — open the lesson
      setSelectedCourse(courseKey);
      setCurrentLesson(lessonIndex);
      setShowQuiz(false);

      try {
        await getCourseById(courseKey);
      } catch (err) {
        console.warn('Enrollment trigger failed:', err);
      }

      await loadLessonMultimedia(courseKey, lesson.id);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Error starting lesson:', err);
      setError('Failed to start lesson. Please try again.');
    }
  };

  // ============================================
  // PAYMENT SUCCESS
  // ============================================
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setIsLoading(true);
      console.log('✅ Payment successful:', paymentData);

      if (selectedLesson) {
        const lessonId = selectedLesson.lesson.id || selectedLesson.lesson._id;

        // ✅ 1. Mark lesson as purchased on the backend
        await purchaseLesson(
          getCurrentUser()?.id,
          selectedLesson.courseKey,
          lessonId
        );

        // ✅ 2. Add to purchasedLessons so lock clears immediately
        setPurchasedLessons((prev) =>
          prev.includes(lessonId) ? prev : [...prev, lessonId]
        );

        // ✅ 3. Reload courses to refresh
        await loadCourses();

        // ✅ 4. Load lesson multimedia
        await loadLessonMultimedia(selectedLesson.courseKey, lessonId);

        // ✅ 5. Select the newly unlocked lesson
        setSelectedCourse(selectedLesson.courseKey);
        setCurrentLesson(selectedLesson.lessonIndex);
        setShowPaymentModal(false);
        setSelectedLesson(null);

        alert('🎉 Payment successful! Lesson unlocked.');
      }
    } catch (error) {
      console.error('❌ handlePaymentSuccess error:', error);
      alert('Payment succeeded, but unlock failed. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // COMPLETE LESSON
  // ============================================
  const completeLesson = async (courseKey, lessonId) => {
    try {
      if (!courses || !courses[courseKey]) return;
      if (!lessonId) return;

      const lessonKey = `${courseKey}-${lessonId}`;
      if (student.completedLessons?.includes(lessonKey)) return;

      const updatedStudent = { ...student };
      if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
      updatedStudent.completedLessons.push(lessonKey);

      const totalLessons = courses[courseKey].lessons?.length || 0;
      const completedLessons =
        courses[courseKey].lessons?.filter((lesson) =>
          updatedStudent.completedLessons?.includes(`${courseKey}-${lesson.id || lesson._id}`)
        ).length || 0;

      if (!updatedStudent.progress) updatedStudent.progress = {};
      updatedStudent.progress[courseKey] = Math.min(
        (completedLessons / totalLessons) * 100,
        100
      );

      await setStudent(updatedStudent);
      console.log('✅ Lesson completed, progress:', updatedStudent.progress[courseKey]);
    } catch (err) {
      console.error('❌ Error completing lesson:', err);
      alert('Failed to mark lesson complete. Please try again.');
    }
  };

  const handleViewCertificate = (courseKey) => {
    if (!courses || !courses[courseKey]) return;
    const course = courses[courseKey];
    alert(
      `🏆 Congratulations to ${student?.name || 'Student'}!\n\nYou have completed the course: ${course.title}\n\nDate: ${new Date().toLocaleDateString()}`
    );
  };

  const getTeacherContactUrl = (teacherId) => getTeacherWhatsAppUrl(teacherId);

  // ============================================
  // NAVIGATE TO LESSON
  // ============================================
  const goToLesson = async (newIndex) => {
    const course = courses[selectedCourse];
    if (!course) return;

    const newLesson = course.lessons?.[newIndex];
    if (!newLesson) return;

    setCurrentLesson(newIndex);
    setShowQuiz(false);
    setCurrentQuiz(null);

    if (newLesson.id) {
      await loadLessonMultimedia(selectedCourse, newLesson.id);
    }

    window.scrollTo(0, 0);
  };

  // ============================================
  // EMPTY STATE
  // ============================================
  const courseEntries = safeObjectEntries(courses);
  if (courseEntries.length === 0) {
    return (
      <div className="course-catalog">
        <h2>STEM Courses</h2>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadCourses} className="retry-btn">Retry</button>
          </div>
        )}
        {!error && (
          <div className="no-courses">
            <p>No courses available. Please check back later.</p>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // LESSON VIEW
  // ============================================
  if (selectedCourse && courses[selectedCourse]) {
    const course = courses[selectedCourse];
    const lesson = course.lessons?.[currentLesson];

    if (!lesson) {
      return (
        <div className="course-lesson">
          <button onClick={() => setSelectedCourse(null)} className="back-btn">
            ← Back to Courses
          </button>
          <div className="error-message">
            <h2>Lesson Not Found</h2>
            <p>The requested lesson could not be found.</p>
          </div>
        </div>
      );
    }

    const isCompleted = student.completedLessons?.includes(`${selectedCourse}-${lesson.id}`);
    const hasAccess = checkHasAccess(lesson);

    return (
      <div className="course-lesson">
        <button onClick={() => setSelectedCourse(null)} className="back-btn">
          ← Back to Courses
        </button>

        <div className="lesson-header">
          <h2>{lesson.title || 'Untitled Lesson'}</h2>
          {isCompleted && <span className="completion-badge">Completed ✓</span>}
          {!lesson.isFree && (
            <span className={`price-badge ${hasAccess ? 'purchased' : ''}`}>
              {hasAccess ? '✅ Purchased' : `₦${lesson.price}`}
            </span>
          )}
        </div>

        {course.teacherName && (
          <div className="teacher-info">
            <strong>Instructor:</strong> {course.teacherName}
            {course.teacherId && getTeacherContactUrl(course.teacherId) && (
              <a
                href={getTeacherContactUrl(course.teacherId)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-contact-btn"
              >
                💬 Chat on WhatsApp
              </a>
            )}
          </div>
        )}

        {!hasAccess && !lesson.isFree ? (
          <div className="payment-required">
            <div className="payment-prompt">
              <h3>🔒 Premium Content</h3>
              <p>This lesson requires payment to access the content.</p>
              <div className="price-display">₦{lesson.price}</div>
              <button
                onClick={() => handlePurchaseLesson(selectedCourse, currentLesson)}
                className="purchase-access-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Purchase Access'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {lessonMultimedia && lessonMultimedia.length > 0 && (
              <div className="multimedia-container">
                <h3>📹 Lesson Materials</h3>
                <MultimediaViewer multimedia={lessonMultimedia} />
              </div>
            )}

            <div className="lesson-content">
              <p>{lesson.content}</p>
              <p><strong>Duration:</strong> {lesson.duration}</p>
            </div>

            {lesson.quiz && !showQuiz && (
              <div className="quiz-section">
                <h3>Knowledge Test</h3>
                {isCompleted ? (
                  <>
                    <p style={{ color: '#42b72a', fontWeight: 600 }}>
                      ✅ You have already passed this quiz.
                    </p>
                    <p style={{ color: '#65676b', fontSize: 13 }}>
                      Quiz can only be taken once. You can watch the video again anytime.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Test your knowledge about this lesson:</p>
                    <button
                      onClick={() => handleStartQuiz(selectedCourse, currentLesson)}
                      className="start-quiz-btn"
                    >
                      Start Quiz
                    </button>
                  </>
                )}
              </div>
            )}

            {showQuiz && currentQuiz && (
              <Quiz
                quiz={currentQuiz}
                onComplete={handleQuizComplete}
                onClose={handleCloseQuiz}
                API_BASE={
                  import.meta.env.VITE_API_URL ||
                  'https://code-stem-education-system.onrender.com'
                }
              />
            )}
          </>
        )}

        <div className="lesson-navigation">
          {currentLesson > 0 && (
            <button onClick={() => goToLesson(currentLesson - 1)}>
              ← Previous Lesson
            </button>
          )}

          <button
            onClick={() => completeLesson(selectedCourse, lesson.id || lesson._id)}
            className="complete-btn"
            disabled={isCompleted || !hasAccess || isLoading}
          >
            {isCompleted ? 'Completed ✓' : 'Complete Lesson'}
          </button>

          {currentLesson < (course.lessons?.length || 0) - 1 && (
            <button onClick={() => goToLesson(currentLesson + 1)}>
              Next Lesson →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // CATALOG VIEW
  // ============================================
  return (
    <div className="course-catalog">
      <div className="catalog-header">
        <h2>STEM Courses</h2>
        <div className="course-controls">
          <button onClick={expandAllCourses} className="control-btn">Expand All</button>
          <button onClick={collapseAllCourses} className="control-btn">Collapse All</button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadCourses} className="retry-btn">Retry</button>
        </div>
      )}

      <div className="courses-grid">
        {courseEntries.map(([key, course]) => {
          const paidLessonsCount = course.lessons?.filter((l) => !l.isFree).length || 0;
          const freeLessonsCount = course.lessons?.filter((l) => l.isFree).length || 0;

          return (
            <div key={key} className="course-card">
              <div className="course-header">
                <span className="course-thumbnail">{course.thumbnail}</span>
                <div className="course-title-section">
                  <h3>{course.title || 'Untitled Course'}</h3>
                  {course.teacherName && (
                    <div className="course-teacher">
                      <small>By: {course.teacherName}</small>
                      {course.teacherId && getTeacherContactUrl(course.teacherId) && (
                        <a
                          href={getTeacherContactUrl(course.teacherId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="teacher-whatsapp-btn"
                        >
                          💬 Contact
                        </a>
                      )}
                    </div>
                  )}
                  <button onClick={() => toggleCourseExpansion(key)} className="expand-btn">
                    {expandedCourses[key] ? '▼ Hide' : '► Show'} Lessons ({course.lessons?.length || 0})
                  </button>
                </div>
              </div>

              <p className="course-description">{course.description}</p>

              <div className="course-pricing-summary">
                <span className="free-lessons">📖 {freeLessonsCount} Free</span>
                {paidLessonsCount > 0 && (
                  <span className="paid-lessons">💰 {paidLessonsCount} Paid</span>
                )}
              </div>

              <div className="course-meta">
                <span className="progress-text">Progress: {student.progress?.[key] || 0}%</span>
                <span className="completed-lessons">
                  Completed:{' '}
                  {course.lessons?.filter((lesson) =>
                    student.completedLessons?.includes(`${key}-${lesson.id}`)
                  ).length || 0}{' '}
                  / {course.lessons?.length || 0}
                </span>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${student.progress?.[key] || 0}%` }}>
                  {student.progress?.[key] || 0}%
                </div>
              </div>

              {student.progress?.[key] === 100 && (
                <button onClick={() => handleViewCertificate(key)} className="certificate-btn">
                  🏆 Get Certificate
                </button>
              )}

              // ============================================
// SHARE LESSON
// ============================================
const handleShareLesson = async (lesson) => {
  if (!lesson) return;

  const lessonTitle = lesson.title || 'Untitled Lesson';
  const shareUrl = `${window.location.origin}/?lesson=${lesson.id || lesson._id}`;
  const shareText = `Check out "${lessonTitle}" on CodeSmartNG!\n\nLearn any skill. Teach anything.`;
  const fullMessage = `${shareText}\n\n${shareUrl}`;

  // ✅ Try native share first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: lessonTitle,
        text: shareText,
        url: shareUrl,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  // ✅ Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(fullMessage);
    alert('📋 Link copied!\n\nPaste it in WhatsApp, Telegram, or anywhere to share.');
  } catch (err) {
    prompt('Copy this link to share:', shareUrl);
  }
};
              
              {expandedCourses[key] && (
                <div className="lessons-list">
                  {course.lessons?.map((lesson, index) => {
                    const isLessonCompleted = student.completedLessons?.includes(`${key}-${lesson.id}`);
                    const hasAccess = checkHasAccess(lesson);
                    const isPaidLesson = !lesson.isFree;

                    return (
                      <div
                        key={lesson.id}
                        className={`lesson-item ${isLessonCompleted ? 'completed' : ''} ${
                          isPaidLesson && !hasAccess ? 'locked' : ''
                        }`}
                      >
                        <div className="lesson-info">
                          <div className="lesson-main-info">
                            <span className="lesson-title">
                              {lesson.title || 'Untitled Lesson'}
                              {isPaidLesson && !hasAccess && <span className="lock-icon"> 🔒</span>}
                              {isPaidLesson && (
                                <span className={`lesson-price ${hasAccess ? 'purchased' : ''}`}>
                                  {hasAccess ? ' ✅ Purchased' : ` - ₦${lesson.price}`}
                                </span>
                              )}
                            </span>
                            <span className="lesson-duration">{lesson.duration}</span>
                          </div>
                          <div className="lesson-features">
                            {lesson.multimedia && lesson.multimedia.length > 0 && (
                              <span className="media-indicator">🎬</span>
                            )}
                            {lesson.quiz && <span className="quiz-indicator">📝</span>}
                            {isLessonCompleted && <span className="completion-indicator">✅</span>}
                            {isPaidLesson && !hasAccess && (
                              <span className="lock-indicator">💰</span>
                            )}
                          </div>
                        </div>

                        <div className="lesson-actions">
                          <button
                            onClick={() => handleStartLesson(key, index)}
                            disabled={isLoading}
                            className={
                              isLessonCompleted
                                ? 'review-btn'
                                : isPaidLesson && !hasAccess
                                ? 'purchase-btn'
                                : 'start-btn'
                            }
                          >
                            {isLessonCompleted
                              ? '👁️ Review'
                              : isPaidLesson && !hasAccess
                              ? `Purchase - ₦${lesson.price}`
                              : 'Start Lesson'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PaymentModal
        isOpen={showPaymentModal && selectedLesson?.lesson}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedLesson(null);
        }}
        lesson={selectedLesson?.lesson}
        student={student}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default CourseCatalog;
