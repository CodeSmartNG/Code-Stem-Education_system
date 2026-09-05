import React, { useState, useEffect } from 'react';
import { 
  getCourses, 
  getCurrentUser, 
  canAccessLesson, 
  purchaseLesson, 
  getTeacherWhatsAppUrl,
  getMultimediaByLesson,
  getLessonById
} from '../utils/storage';
import Quiz from './Quiz';
import MultimediaViewer from './MultimediaViewer';
import PaymentModal from './payments/PaymentModal';
import { processTeacherPayment } from '../utils/teacherPaymentService';
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

  // Load courses from storage
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = () => {
    try {
      const coursesData = getCourses();
      console.log('✅ Loaded courses:', Object.keys(coursesData || {}).length);
      setCourses(coursesData || {});
      setError(null);
    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setCourses({});
      setError('Failed to load courses. Please refresh the page.');
    }
  };

  // ✅ Load multimedia for a specific lesson (Firebase)
  const loadLessonMultimedia = async (courseKey, lessonId) => {
    try {
      setIsLoading(true);
      // Get multimedia from Firebase
      const multimedia = await getMultimediaByLesson(lessonId);
      setLessonMultimedia(multimedia || []);
      
      // Also get the lesson content
      const lesson = await getLessonById(lessonId);
      if (lesson) {
        // Update the lesson in the selected course
        setCourses(prev => ({
          ...prev,
          [courseKey]: {
            ...prev[courseKey],
            lessons: prev[courseKey]?.lessons?.map(l => 
              l.id === lessonId ? { ...l, ...lesson } : l
            )
          }
        }));
      }
    } catch (error) {
      console.error('❌ Error loading lesson multimedia:', error);
      setLessonMultimedia([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Object.entries wrapper
  const safeObjectEntries = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') {
        return [];
      }
      return Object.entries(obj);
    } catch (err) {
      console.error('Error in safeObjectEntries:', err);
      return [];
    }
  };

  // Safe Object.keys wrapper
  const safeObjectKeys = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') {
        return [];
      }
      return Object.keys(obj);
    } catch (err) {
      console.error('Error in safeObjectKeys:', err);
      return [];
    }
  };

  // Toggle course expansion
  const toggleCourseExpansion = (courseKey) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseKey]: !prev[courseKey]
    }));
  };

  // Expand all courses
  const expandAllCourses = () => {
    try {
      const courseKeys = safeObjectKeys(courses);
      const allExpanded = {};
      courseKeys.forEach(key => {
        allExpanded[key] = true;
      });
      setExpandedCourses(allExpanded);
    } catch (err) {
      console.error('Error expanding courses:', err);
    }
  };

  // Collapse all courses
  const collapseAllCourses = () => {
    setExpandedCourses({});
  };

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

  const handleQuizComplete = (scorePercentage, passed) => {
    try {
      if (!selectedCourse || !courses[selectedCourse]) return;

      const updatedStudent = { ...student };
      const lessonId = `${selectedCourse}-${courses[selectedCourse].lessons?.[currentLesson]?.id}`;

      if (passed && lessonId && !updatedStudent.completedLessons?.includes(lessonId)) {
        if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
        updatedStudent.completedLessons.push(lessonId);

        // Update course progress
        const totalLessons = courses[selectedCourse].lessons?.length || 0;
        const completedLessons = courses[selectedCourse].lessons?.filter(
          lesson => updatedStudent.completedLessons?.includes(`${selectedCourse}-${lesson.id}`)
        ).length || 0;

        if (!updatedStudent.progress) updatedStudent.progress = {};
        updatedStudent.progress[selectedCourse] = Math.min((completedLessons / totalLessons) * 100, 100);
      }

      setStudent(updatedStudent);
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

  // Check if student can access lesson
  const canAccessLessonContent = (courseKey, lessonId) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;

    return canAccessLesson(currentUser.id, courseKey, lessonId);
  };

  // Handle lesson purchase
  const handlePurchaseLesson = async (courseKey, lessonIndex) => {
    try {
      setIsLoading(true);
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in to purchase lessons');
        setIsLoading(false);
        return;
      }

      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];

      if (!lesson) {
        console.error('Lesson not found');
        setIsLoading(false);
        return;
      }

      if (window.confirm(`Are you sure you want to purchase "${lesson.title}" for ₦${lesson.price}?`)) {
        const paymentResult = await purchaseLesson(currentUser.id, courseKey, lesson.id);

        if (paymentResult?.success) {
          alert('✅ Payment successful! You now have access to this lesson.');
          loadCourses();
          setSelectedCourse(courseKey);
          setCurrentLesson(lessonIndex);
          // Load multimedia for the lesson
          await loadLessonMultimedia(courseKey, lesson.id);
        } else {
          alert('❌ Payment failed. Please try again.');
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error purchasing lesson:', error);
      alert('❌ Error processing payment: ' + error.message);
      setIsLoading(false);
    }
  };

  // Handle starting a lesson with new payment system
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

      // Check if lesson is paid and if student has access
      if (!lesson.isFree && !canAccessLesson(currentUser.id, courseKey, lesson.id)) {
        setSelectedLesson({ 
          courseKey, 
          lessonIndex, 
          lesson: { 
            ...lesson, 
            title: lesson.title || 'Untitled Lesson',
            courseId: courseKey,
            price: lesson.price || 500,
            teacherId: course.teacherId || 'default_teacher',
            teacherName: course.teacherName || 'Course Teacher'
          } 
        });
        setShowPaymentModal(true);
        return;
      }

      // Check if lesson is locked (backward compatibility)
      if (lesson.isLocked && !canAccessLesson(currentUser.id, courseKey, lesson.id)) {
        setSelectedLesson({ 
          courseKey, 
          lessonIndex, 
          lesson: { 
            ...lesson, 
            title: lesson.title || 'Untitled Lesson',
            courseId: courseKey,
            price: lesson.price || 500,
            teacherId: course.teacherId || 'default_teacher',
            teacherName: course.teacherName || 'Course Teacher'
          } 
        });
        setShowPaymentModal(true);
        return;
      }

      setSelectedCourse(courseKey);
      setCurrentLesson(lessonIndex);
      setShowQuiz(false);
      
      // ✅ Load multimedia for the lesson from Firebase
      await loadLessonMultimedia(courseKey, lesson.id);
      
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Error starting lesson:', err);
      setError('Failed to start lesson. Please try again.');
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setIsLoading(true);
      console.log('✅ Payment successful:', paymentData);

      if (selectedLesson) {
        // Process teacher payment and payout
        const teacherPaymentSuccess = await processTeacherPayment(
          paymentData, 
          selectedLesson.lesson, 
          student
        );

        // Reload courses to reflect the purchase
        loadCourses();

        // Start the lesson
        setSelectedCourse(selectedLesson.courseKey);
        setCurrentLesson(selectedLesson.lessonIndex);
        setShowPaymentModal(false);
        setSelectedLesson(null);

        // ✅ Load multimedia for the lesson
        await loadLessonMultimedia(selectedLesson.courseKey, selectedLesson.lesson.id);

        // Show appropriate success message
        if (teacherPaymentSuccess) {
          alert('🎉 Payment successful! Lesson unlocked and teacher payment processed.');
        } else {
          alert('🎉 Payment successful! Lesson unlocked. Teacher payment is being processed.');
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error processing teacher payment:', error);

      // Still proceed with lesson access
      setSelectedCourse(selectedLesson?.courseKey);
      setCurrentLesson(selectedLesson?.lessonIndex);
      setShowPaymentModal(false);
      setSelectedLesson(null);
      setIsLoading(false);

      alert('🎉 Payment successful! Lesson unlocked. There was an issue with teacher payout - support will handle it.');
    }
  };

  const completeLesson = (courseKey, lessonId) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const updatedStudent = { ...student };
      const lessonKey = `${courseKey}-${lessonId}`;

      if (!updatedStudent.completedLessons?.includes(lessonKey)) {
        if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
        updatedStudent.completedLessons.push(lessonKey);

        // Update course progress
        const totalLessons = courses[courseKey].lessons?.length || 0;
        const completedLessons = courses[courseKey].lessons?.filter(
          lesson => updatedStudent.completedLessons?.includes(`${courseKey}-${lesson.id}`)
        ).length || 0;

        if (!updatedStudent.progress) updatedStudent.progress = {};
        updatedStudent.progress[courseKey] = Math.min((completedLessons / totalLessons) * 100, 100);

        setStudent(updatedStudent);
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
    }
  };

  const handleViewCertificate = (courseKey) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const course = courses[courseKey];
      alert(`🏆 Congratulations to ${student?.name || 'Student'}!\n\nYou have completed the course: ${course.title}\n\nDate: ${new Date().toLocaleDateString()}\n\nYou can get your certificate at the office!`);
    } catch (err) {
      console.error('Error viewing certificate:', err);
    }
  };

  // Get teacher WhatsApp URL
  const getTeacherContactUrl = (teacherId) => {
    return getTeacherWhatsAppUrl(teacherId);
  };

  // Safety check for empty courses
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

  // If a course is selected, show its lessons
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
    const currentUser = getCurrentUser();
    const hasAccess = currentUser ? canAccessLesson(currentUser.id, selectedCourse, lesson.id) : false;

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

        {/* Access control for lesson content */}
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
            {/* ✅ Display multimedia from Firebase */}
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
                <p>Test your knowledge about this lesson:</p>
                <button 
                  onClick={() => handleStartQuiz(selectedCourse, currentLesson)}
                  className="start-quiz-btn"
                >
                  Start Quiz
                </button>
              </div>
            )}

            {showQuiz && currentQuiz && (
              <Quiz 
                quiz={currentQuiz}
                onComplete={handleQuizComplete}
                onClose={handleCloseQuiz}
              />
            )}
          </>
        )}

        <div className="lesson-navigation">
          {currentLesson > 0 && (
            <button onClick={() => setCurrentLesson(currentLesson - 1)}>
              ← Previous Lesson
            </button>
          )}

          <button 
            onClick={() => completeLesson(selectedCourse, lesson.id)}
            className="complete-btn"
            disabled={isCompleted || (!hasAccess && !lesson.isFree)}
          >
            {isCompleted ? 'Completed' : 'Complete Lesson'}
          </button>

          {currentLesson < (course.lessons?.length || 0) - 1 && (
            <button onClick={() => setCurrentLesson(currentLesson + 1)}>
              Next Lesson →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main course catalog view
  return (
    <div className="course-catalog">
      <div className="catalog-header">
        <h2>STEM Courses</h2>
        <div className="course-controls">
          <button onClick={expandAllCourses} className="control-btn">
            Expand All
          </button>
          <button onClick={collapseAllCourses} className="control-btn">
            Collapse All
          </button>
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
          const currentUser = getCurrentUser();
          const paidLessonsCount = course.lessons?.filter(lesson => !lesson.isFree).length || 0;
          const freeLessonsCount = course.lessons?.filter(lesson => lesson.isFree).length || 0;

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
                  <button 
                    onClick={() => toggleCourseExpansion(key)}
                    className="expand-btn"
                  >
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
                <span className="progress-text">
                  Progress: {student.progress?.[key] || 0}%
                </span>
                <span className="completed-lessons">
                  Completed: {course.lessons?.filter(lesson => 
                    student.completedLessons?.includes(`${key}-${lesson.id}`)
                  ).length || 0} / {course.lessons?.length || 0}
                </span>
              </div>

              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${student.progress?.[key] || 0}%`}}
                >
                  {student.progress?.[key] || 0}%
                </div>
              </div>

              {student.progress?.[key] === 100 && (
                <button 
                  onClick={() => handleViewCertificate(key)}
                  className="certificate-btn"
                >
                  🏆 Get Certificate
                </button>
              )}

              {expandedCourses[key] && (
                <div className="lessons-list">
                  {course.lessons?.map((lesson, index) => {
                    const isLessonCompleted = student.completedLessons?.includes(`${key}-${lesson.id}`);
                    const hasAccess = currentUser ? canAccessLesson(currentUser.id, key, lesson.id) : false;
                    const isPaidLesson = !lesson.isFree;

                    return (
                      <div key={lesson.id} className={`lesson-item ${isLessonCompleted ? 'completed' : ''} ${isPaidLesson && !hasAccess ? 'locked' : ''}`}>
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
                              <span className="media-indicator" title="Has learning materials">🎬</span>
                            )}
                            {lesson.quiz && (
                              <span className="quiz-indicator" title="Has quiz questions">📝</span>
                            )}
                            {isLessonCompleted && (
                              <span className="completion-indicator" title="Lesson completed">✅</span>
                            )}
                            {isPaidLesson && !hasAccess && (
                              <span className="lock-indicator" title="Paid lesson">💰</span>
                            )}
                          </div>
                        </div>
                        <div className="lesson-actions">
                          <button 
                            onClick={() => handleStartLesson(key, index)}
                            disabled={isLessonCompleted || isLoading}
                            className={
                              isLessonCompleted ? 'completed-btn' : 
                              isPaidLesson && !hasAccess ? 'purchase-btn' : 'start-btn'
                            }
                          >
                            {isLessonCompleted ? 'Completed' : 
                             isPaidLesson && !hasAccess ? `Purchase - ₦${lesson.price}` : 'Start Lesson'}
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

      {/* PaymentModal with safety checks */}
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