import React, { useState } from 'react';
import './Quiz.css';

const Quiz = ({ quiz, onComplete, onClose, student, API_BASE }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answerIndex
    });
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((question) => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handleSubmit = () => {
    const correctAnswers = calculateScore();
    setScore(correctAnswers);
    setShowResults(true);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setCurrentQuestion(0);
    setScore(0);
  };

  // ✅ Fixed: only compute score once, and fire notification
  const handleFinish = async () => {
    const correctAnswers = calculateScore();
    const percentage = (correctAnswers / quiz.questions.length) * 100;
    const passingThreshold = Math.ceil(
      quiz.questions.length * ((quiz.passingScore || 70) / 100)
    );
    const passed = correctAnswers >= passingThreshold;

    // ✅ Notify parent component (student dashboard updates progress)
    try {
      await onComplete(percentage, passed);
    } catch (err) {
      console.error('onComplete failed:', err);
    }

    // ✅ Fire a notification (works only if backend endpoint exists)
    if (API_BASE) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/notifications/quiz-complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            quizId: quiz._id || quiz.id,
            lessonId: quiz.lessonId,
            score: Math.round(percentage),
            passed
          })
        });
      } catch (err) {
        // Non-blocking — quiz still works even if notification fails
        console.warn('Quiz notification failed:', err);
      }
    }
  };

  if (!quiz) return null;

  if (showResults) {
    const passingThreshold = Math.ceil(
      quiz.questions.length * ((quiz.passingScore || 70) / 100)
    );
    const passed = score >= passingThreshold;
    const percentage = Math.round((score / quiz.questions.length) * 100);

    return (
      <div className="quiz-results">
        <h3>Sakamakon Tambayoyi</h3>

        <div className={`score ${passed ? 'passed' : 'failed'}`}>
          {score} daga cikin {quiz.questions.length} ({percentage}%)
          <div className="result-status">
            {passed ? '✅ Kun ci nasara!' : '❌ Kun kasa, sake gwadawa!'}
          </div>
        </div>

        <div className="results-details">
          {quiz.questions.map((question, index) => {
            const userAnswer = selectedAnswers[question.id];
            const isCorrect = userAnswer === question.correctAnswer;
            const userAnswerText =
              userAnswer !== undefined ? question.options[userAnswer] : '(Ba a amsa ba)';

            return (
              <div key={question.id} className="question-result">
                <p>
                  <strong>Tambaya {index + 1}:</strong> {question.question}
                </p>

                {question.type === 'image' && question.imageUrl && (
                  <div className="question-image-review">
                    <img src={question.imageUrl} alt="Tambaya" />
                  </div>
                )}

                <p className={isCorrect ? 'correct' : 'incorrect'}>
                  Amsar da kuka zaɓa: {userAnswerText}
                </p>

                <p className="correct-answer">
                  Correct Answer: {question.options[question.correctAnswer]}
                </p>
              </div>
            );
          })}
        </div>

        <div className="quiz-actions">
          <button onClick={handleRetry} className="retry-btn">
            Try Again
          </button>
          <button
            onClick={handleFinish}
            className="finish-btn"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Completed'}
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const isAnswered = selectedAnswers[question.id] !== undefined;
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h3>{quiz.title}</h3>
        <div className="quiz-progress">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </div>
        <button onClick={onClose} className="close-quiz" aria-label="Close quiz">
          ×
        </button>
      </div>

      <div className="question-container">
        <h4>{question.question}</h4>

        {/* Image question support */}
        {question.type === 'image' && question.imageUrl && (
          <div className="question-image">
            <img src={question.imageUrl} alt="Question" />
          </div>
        )}

        <div className="options-list">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`option ${
                selectedAnswers[question.id] === index ? 'selected' : ''
              }`}
              onClick={() => handleAnswerSelect(question.id, index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAnswerSelect(question.id, index);
                }
              }}
            >
              {option}
            </div>
          ))}
        </div>
      </div>

      <div className="quiz-navigation">
        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
            className="nav-btn prev-btn"
          >
            Previous Question
          </button>
        )}

        {!isLastQuestion ? (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            className="nav-btn next-btn"
            disabled={!isAnswered}
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="nav-btn submit-btn"
            disabled={!isAnswered}
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default Quiz;
