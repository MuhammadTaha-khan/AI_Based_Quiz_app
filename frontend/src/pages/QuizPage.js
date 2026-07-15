import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

import API from "../config";
const SECONDS_PER_QUESTION = 45; // ⏱ Each question has 45 seconds

function QuizPage({ user, topic, previousScore, onFinish }) {
  const [questions,      setQuestions]      = useState([]);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [userAnswers,    setUserAnswers]     = useState([]);
  const [difficulty,     setDifficulty]     = useState("easy");
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [timeLeft,       setTimeLeft]       = useState(SECONDS_PER_QUESTION);
  const [timedOut,       setTimedOut]       = useState(false); // true if timer ran out

  // ── Load questions from backend ──────────────────────────
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get(`${API}/questions`, {
          params: {
            topic: topic,
            score: previousScore.score,
            total: previousScore.total
          }
        });
        setQuestions(res.data.questions);
        setDifficulty(res.data.difficulty);
        setLoading(false);
      } catch (err) {
        setError("Could not load questions. Is the backend running?");
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [topic, previousScore]);

  // ── Timer logic ──────────────────────────────────────────
  // useCallback prevents the function from being recreated every render
  const handleTimeOut = useCallback(() => {
    if (showFeedback) return; // Already answered

    // Auto-submit a blank answer when time runs out
    const currentQuestion = questions[currentIndex];
    const newAnswer = { id: currentQuestion.id, selected: "__timeout__" };
    setUserAnswers(prev => [...prev, newAnswer]);
    setTimedOut(true);
    setShowFeedback(true);
  }, [showFeedback, questions, currentIndex]);

  useEffect(() => {
    if (loading || showFeedback) return; // Don't run timer when loading or feedback showing

    setTimeLeft(SECONDS_PER_QUESTION); // Reset timer for each new question
    setTimedOut(false);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval); // Cleanup when question changes
  }, [currentIndex, loading]); // Re-run when question changes

  // ── Answer selection ─────────────────────────────────────
  const handleAnswerSelect = (option) => {
    if (showFeedback) return;
    setSelectedAnswer(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = questions[currentIndex];
    const newAnswer = { id: currentQuestion.id, selected: selectedAnswer };
    setUserAnswers(prev => [...prev, newAnswer]);
    setShowFeedback(true);
  };

  // ── Next question or finish ──────────────────────────────
  const handleNext = async () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      // All questions done — submit to backend
      const allAnswers = [...userAnswers];
      // If last answer not yet added (e.g. timeout case was already added)
      if (allAnswers.length < questions.length) {
        const currentQuestion = questions[currentIndex];
        allAnswers.push({ id: currentQuestion.id, selected: selectedAnswer || "__timeout__" });
      }
      await submitAllAnswers(allAnswers);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const submitAllAnswers = async (answers) => {
    try {
      const res = await axios.post(`${API}/submit`, {
        answers,
        user_id:    user?.id,
        topic:      topic,
        difficulty: difficulty
      });
      onFinish(res.data);
    } catch (err) {
      setError("Failed to submit. Please try again.");
    }
  };

  // ── Render loading / error ────────────────────────────────
  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ color: "var(--muted)" }}>Loading {topic} questions...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div className="alert alert-error">
          {error || `No questions found for "${topic}". Try another topic.`}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion?.answer;
  const progress  = (currentIndex / questions.length) * 100;

  // Timer color: green → yellow → red
  const timerClass =
    timeLeft <= 5  ? "timer-urgent"  :
    timeLeft <= 10 ? "timer-warning" : "timer-ok";

  return (
    <div className="card">
      {/* ── Top Bar: Progress info + Timer ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <span className={`badge badge-${difficulty}`}>{difficulty}</span>
          <span style={{
            background: "var(--border)", color: "var(--muted)",
            padding: "3px 10px", borderRadius: 99, fontSize: 12
          }}>
            {topic}
          </span>
        </div>

        {/* Timer */}
        <div className={`timer ${timerClass}`}>
          ⏱ {timeLeft}s
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Timer Progress Bar (separate, counts down) */}
      <div className="progress-container" style={{ marginBottom: 20 }}>
        <div style={{
          height: "100%",
          width: `${(timeLeft / SECONDS_PER_QUESTION) * 100}%`,
          background: timeLeft <= 5 ? "var(--error)" : timeLeft <= 10 ? "var(--warning)" : "var(--success)",
          borderRadius: 99,
          transition: "width 1s linear, background 0.5s",
        }} />
      </div>

      {/* Question */}
      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 22, lineHeight: 1.5 }}>
        {currentQuestion.question}
      </h2>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {currentQuestion.options.map((option, idx) => {
          let border = "var(--border)";
          let bg     = "transparent";
          let color  = "var(--text)";

          if (showFeedback) {
            if (option === currentQuestion.answer) {
              border = "var(--success)"; bg = "rgba(74,222,128,0.1)"; color = "var(--success)";
            } else if (option === selectedAnswer && !isCorrect) {
              border = "var(--error)";   bg = "rgba(248,113,113,0.1)"; color = "var(--error)";
            }
          } else if (option === selectedAnswer) {
            border = "var(--accent)"; bg = "rgba(108,99,255,0.12)";
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswerSelect(option)}
              style={{
                background: bg, border: `2px solid ${border}`, borderRadius: 10,
                padding: "13px 16px", color, fontSize: 14, textAlign: "left",
                cursor: showFeedback ? "default" : "pointer",
                transition: "all 0.18s", fontFamily: "inherit",
              }}
            >
              <span style={{ marginRight: 10, opacity: 0.5 }}>
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* Feedback Message */}
      {showFeedback && (
        <div className={`alert ${timedOut ? "alert-error" : isCorrect ? "alert-success" : "alert-error"}`}
          style={{ marginBottom: 16 }}>
          {timedOut
            ? `⏰ Time's up! Correct answer: ${currentQuestion.answer}`
            : isCorrect
              ? "✅ Correct! Well done!"
              : `❌ Wrong. Correct answer: ${currentQuestion.answer}`}
        </div>
      )}

      {/* Action Button */}
      {!showFeedback ? (
        <button
          className="btn btn-primary"
          onClick={handleSubmitAnswer}
          disabled={!selectedAnswer}
          style={{ width: "100%" }}
        >
          Submit Answer
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleNext}
          style={{ width: "100%" }}
        >
          {currentIndex + 1 >= questions.length ? "See Results 🏁" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

export default QuizPage;
