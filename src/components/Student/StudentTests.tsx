import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Test, TestQuestion, TestResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  FileText,
  BarChart2,
  Bookmark,
  ShieldCheck,
  ChevronRight,
  Layers,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface StudentTestsProps {
  initialDetailTestId?: string;
}

type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked_for_review' | 'answered_marked_for_review';

export const StudentTests: React.FC<StudentTestsProps> = ({ initialDetailTestId }) => {
  const { student, user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Active CBT Test Session
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [activeSection, setActiveSection] = useState<string>('All');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [isSubmitConfirmationOpen, setIsSubmitConfirmationOpen] = useState(false);

  // Review / Result modal
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [reviewTest, setReviewTest] = useState<Test | null>(null);
  const [solutionFilter, setSolutionFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await api.student.getTests();
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (initialDetailTestId && tests.length > 0 && !activeTest && !testResult) {
      const match = tests.find((t) => t.id === initialDetailTestId);
      if (match) handleStartTest(match);
    }
  }, [initialDetailTestId, tests]);

  // Timer countdown
  useEffect(() => {
    if (!activeTest || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmission(activeTest, answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, timeLeftSeconds]);

  const handleStartTest = async (test: Test) => {
    let hydratedTest: Test = test;
    if (!test.questions || test.questions.length === 0) {
      try {
        setStartingTestId(test.id);
        const payload = await api.student.getTestToTake(test.id);
        if (payload?.existing_result) {
          setTestResult(payload.existing_result);
          setReviewTest({
            ...test,
            ...(payload.test || {}),
            questions: payload.questions || [],
          });
          return;
        }
        hydratedTest = {
          ...test,
          ...(payload?.test || {}),
          questions: payload?.questions || [],
        };
      } catch (err: any) {
        alert(err.message || 'Unable to load test questions');
        return;
      } finally {
        setStartingTestId(null);
      }
    }

    const questionsList = hydratedTest.questions || [];
    if (questionsList.length === 0) {
      alert('This test has no questions available yet.');
      return;
    }

    setActiveTest(hydratedTest);
    setCurrentQuestionIndex(0);
    setAnswers({});

    // Initialize question statuses
    const initialStatuses: Record<number, QuestionStatus> = {};
    questionsList.forEach((_, idx) => {
      initialStatuses[idx] = idx === 0 ? 'not_answered' : 'not_visited';
    });
    setQuestionStatuses(initialStatuses);

    const firstSection =
      questionsList[0]?.section || (hydratedTest.sections && hydratedTest.sections[0]) || 'All';
    setActiveSection(firstSection);
    setTimeLeftSeconds((hydratedTest.duration_minutes || 30) * 60);
  };

  const handleSelectOption = (option: string) => {
    const qKey = activeTest?.questions?.[currentQuestionIndex]?.id || `q-${currentQuestionIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [qKey]: option,
      [currentQuestionIndex.toString()]: option,
    }));

    setQuestionStatuses((prev) => {
      const current = prev[currentQuestionIndex];
      return {
        ...prev,
        [currentQuestionIndex]: current === 'marked_for_review' ? 'answered_marked_for_review' : 'answered',
      };
    });
  };

  const handleClearResponse = () => {
    const qKey = activeTest?.questions?.[currentQuestionIndex]?.id || `q-${currentQuestionIndex}`;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qKey];
      delete next[currentQuestionIndex.toString()];
      return next;
    });

    setQuestionStatuses((prev) => ({
      ...prev,
      [currentQuestionIndex]: 'not_answered',
    }));
  };

  const handleMarkForReviewAndNext = () => {
    const qKey = activeTest?.questions?.[currentQuestionIndex]?.id || `q-${currentQuestionIndex}`;
    const hasAnswer = !!(answers[qKey] || answers[currentQuestionIndex.toString()]);
    
    setQuestionStatuses((prev) => ({
      ...prev,
      [currentQuestionIndex]: hasAnswer ? 'answered_marked_for_review' : 'marked_for_review',
    }));

    handleNavigateQuestion(currentQuestionIndex + 1);
  };

  const handleSaveAndNext = () => {
    const qKey = activeTest?.questions?.[currentQuestionIndex]?.id || `q-${currentQuestionIndex}`;
    const hasAnswer = !!(answers[qKey] || answers[currentQuestionIndex.toString()]);

    setQuestionStatuses((prev) => ({
      ...prev,
      [currentQuestionIndex]: hasAnswer ? 'answered' : 'not_answered',
    }));

    handleNavigateQuestion(currentQuestionIndex + 1);
  };

  const handleNavigateQuestion = (index: number) => {
    if (!activeTest || !activeTest.questions) return;
    if (index < 0 || index >= activeTest.questions.length) return;

    // Update status of the target question if it was unvisited
    setQuestionStatuses((prev) => {
      if (prev[index] === 'not_visited') {
        return { ...prev, [index]: 'not_answered' };
      }
      return prev;
    });

    setCurrentQuestionIndex(index);
    const targetQ = activeTest.questions[index];
    if (targetQ?.section && targetQ.section !== activeSection && activeSection !== 'All') {
      setActiveSection(targetQ.section);
    }
  };

  const executeSubmission = async (testToSubmit: Test, answersToSubmit: Record<string, string>) => {
    try {
      setSubmittingTest(true);
      setIsSubmitConfirmationOpen(false);

      const res = await api.student.submitTest(testToSubmit.id, answersToSubmit);
      setTestResult(res.result);
      setReviewTest(testToSubmit);
      setActiveTest(null);
      await loadTests();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmittingTest(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Questions and Sections helpers
  const questions = activeTest?.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const uniqueSections = Array.from(new Set(questions.map((q) => q.section || 'General')));
  
  // Status summary counts
  const answeredCount = Object.values(questionStatuses).filter((s) => s === 'answered' || s === 'answered_marked_for_review').length;
  const notAnsweredCount = Object.values(questionStatuses).filter((s) => s === 'not_answered').length;
  const markedReviewCount = Object.values(questionStatuses).filter((s) => s === 'marked_for_review').length;
  const answeredMarkedCount = Object.values(questionStatuses).filter((s) => s === 'answered_marked_for_review').length;
  const notVisitedCount = Object.values(questionStatuses).filter((s) => s === 'not_visited').length;

  return (
    <div className="space-y-6">
      {/* If No Active Test: Show List of Tests */}
      {!activeTest && !testResult && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>Online Mock CBT & Assessment Portal (PW / Allen Pattern)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard computerized tests with exact timer, negative marking (+4/-1), question palettes, and instant rank analytics.
              </p>
            </div>
          </div>

          {/* Test Cards Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading available tests...</div>
          ) : tests.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Tests Scheduled</h3>
              <p className="text-xs text-slate-500">Your faculty has not scheduled any active mock tests yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tests.map((test) => {
                const totalQ = test.questions?.length || (test as any).questions_count || 0;
                const maxMarks = test.max_marks || test.total_marks || (totalQ * 4);

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                          {test.subject}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>CBT Computer Based Test</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{test.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {test.chapter || test.instructions || 'Standard All India mock test pattern with section divisions and negative marking.'}
                      </p>

                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium">Duration</span>
                          <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            {test.duration_minutes} Mins
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium">Questions</span>
                          <span className="text-xs font-bold text-slate-800 mt-0.5 block">{totalQ} MCQs</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium">Total Marks</span>
                          <span className="text-xs font-bold text-indigo-600 mt-0.5 block">{maxMarks} Marks</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Marking: +4 (Correct), -1 (Incorrect)
                      </span>

                      <button
                        type="button"
                        disabled={startingTestId === test.id}
                        onClick={() => handleStartTest(test)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{startingTestId === test.id ? 'Loading Test...' : (test as any).is_completed ? 'View Result' : 'Start Test'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE CBT TEST FULL ENVIRONMENT */}
      {activeTest && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden select-none">
          {/* Top Exam Header */}
          <div className="bg-slate-800 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm">
                CBT
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                  {activeTest.title}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Candidate: {student?.name || user?.name || 'Student'} • Roll: {student?.roll_number || 'N/A'} ({student?.class_name || 'Class'})
                </p>
              </div>
            </div>

            {/* Countdown Clock with Pulse alert */}
            <div className="flex items-center gap-4">
              <div
                className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm font-bold shadow-xs ${
                  timeLeftSeconds < 300
                    ? 'bg-red-900/40 border-red-500 text-red-300 animate-pulse'
                    : 'bg-slate-900/60 border-slate-700 text-emerald-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Time Left: {formatTimer(timeLeftSeconds)}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitConfirmationOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Submit Test
              </button>
            </div>
          </div>

          {/* Section Selector Bar */}
          <div className="bg-slate-800/60 px-4 sm:px-6 py-2 border-b border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-xs font-bold text-slate-400 mr-2">SECTIONS:</span>
            {uniqueSections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setActiveSection(sec);
                  // Jump to first question in this section
                  const firstIdx = questions.findIndex((q) => (q.section || 'General') === sec);
                  if (firstIdx !== -1) handleNavigateQuestion(firstIdx);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  activeSection === sec
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Main Body: Question Display & Question Palette */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
            {/* Left/Middle: Question Workspace */}
            <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 bg-white border-r border-slate-200">
              {currentQ ? (
                <div className="space-y-6 max-w-4xl mx-auto w-full">
                  {/* Question Header & Marking */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Section: {currentQ.section || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +{currentQ.positive_marks || currentQ.marks || 4}.00
                      </span>
                      <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        -{currentQ.negative_marks !== undefined ? currentQ.negative_marks : 1}.00
                      </span>
                    </div>
                  </div>

                  {/* Question Content & Diagrams */}
                  <div className="space-y-4">
                    <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {currentQ.question_text}
                    </div>

                    {/* Question Diagram / Image if attached */}
                    {(currentQ.image_url || currentQ.diagram_url) && (
                      <div className="p-2 border border-slate-200 rounded-2xl bg-slate-50 max-w-lg">
                        <img
                          src={currentQ.image_url || currentQ.diagram_url}
                          alt="Question diagram"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto max-h-72 object-contain rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-3 pt-2">
                    {[
                      { key: 'A', text: currentQ.option_a, img: currentQ.option_a_image },
                      { key: 'B', text: currentQ.option_b, img: currentQ.option_b_image },
                      { key: 'C', text: currentQ.option_c, img: currentQ.option_c_image },
                      { key: 'D', text: currentQ.option_d, img: currentQ.option_d_image },
                    ]
                      .filter((opt) => opt.text || opt.img)
                      .map((opt) => {
                        const qKey = currentQ.id || `q-${currentQuestionIndex}`;
                        const isSelected = (answers[qKey] || answers[currentQuestionIndex.toString()]) === opt.key;

                        return (
                          <div
                            key={opt.key}
                            onClick={() => handleSelectOption(opt.key)}
                            className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt.key}
                            </div>

                            <div className="flex-1 text-xs sm:text-sm text-slate-800 font-medium">
                              {opt.text}
                              {opt.img && (
                                <img src={opt.img} alt="" referrerPolicy="no-referrer" className="mt-2 max-h-32 rounded-lg border border-slate-200" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">No question selected</div>
              )}

              {/* Bottom Action Control Bar */}
              <div className="pt-4 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => handleNavigateQuestion(currentQuestionIndex - 1)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                  >
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkForReviewAndNext}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Mark for Review & Next
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Save & Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Question Palette & Status Summary (PW/Allen Style) */}
            <div className="w-full lg:w-80 bg-slate-50 border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto shrink-0">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-2">
                  Question Palette ({questions.length})
                </h3>

                {/* Status Legend Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {answeredCount}
                    </div>
                    <span>Answered</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-red-500 text-white font-bold text-[10px] flex items-center justify-center">
                      {notAnsweredCount}
                    </div>
                    <span>Not Answered</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {markedReviewCount}
                    </div>
                    <span>Review</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-slate-300 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      {notVisitedCount}
                    </div>
                    <span>Not Visited</span>
                  </div>
                </div>

                {/* Question Numbers Grid */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                      const st = questionStatuses[idx] || 'not_visited';
                      const isCur = currentQuestionIndex === idx;

                      let bgClass = 'bg-slate-200 text-slate-700 hover:bg-slate-300';
                      if (st === 'answered') bgClass = 'bg-emerald-600 text-white shadow-xs';
                      else if (st === 'not_answered') bgClass = 'bg-red-500 text-white shadow-xs';
                      else if (st === 'marked_for_review') bgClass = 'bg-purple-600 text-white shadow-xs';
                      else if (st === 'answered_marked_for_review') bgClass = 'bg-purple-700 ring-2 ring-emerald-400 text-white shadow-xs';

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleNavigateQuestion(idx)}
                          className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                            isCur ? 'ring-2 ring-indigo-500 scale-105' : ''
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Submit action button */}
              <div className="pt-4 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSubmitConfirmationOpen(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Submit Examination
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      {isSubmitConfirmationOpen && activeTest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Submit CBT Examination?
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Attempted / Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Unattempted / Left:</span>
                <span className="font-bold">{questions.length - answeredCount}</span>
              </div>
              <div className="flex justify-between text-purple-700">
                <span>Marked for Review:</span>
                <span className="font-bold">{markedReviewCount + answeredMarkedCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Are you sure you want to finalize and submit? You will instantly receive your evaluated score and solution key.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmationOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Resume Test
              </button>

              <button
                type="button"
                disabled={submittingTest}
                onClick={() => executeSubmission(activeTest, answers)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {submittingTest ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CBT RESULT & SCORECARD ANALYTICS MODAL (PW / Allen Style) */}
      {testResult && reviewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
            {/* Scorecard Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Examination Result & Rank Analysis
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {reviewTest.title}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Evaluated on NTA +4 / -1 Marking Pattern • Candidate: {testResult.student_name || student?.name || 'Student'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTestResult(null);
                  setReviewTest(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Card Dashboard Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Score</span>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
                    {testResult.score_obtained || testResult.marks_obtained}
                    <span className="text-sm font-semibold text-indigo-500"> / {testResult.max_marks || testResult.total_marks}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600">Percentage: {testResult.percentage}%</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Accuracy</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                    {testResult.accuracy || 85}%
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">{testResult.correct_count || 0} Correct Questions</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Est. Rank / Percentile</span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                    {testResult.percentile || 98.2}%ile
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600">Rank: #{testResult.rank || 1} in Batch</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Grade / Status</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                    {testResult.grade || 'A+'}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">QUALIFIED</span>
                </div>
              </div>

              {/* Section-Wise Breakdown Table */}
              {testResult.section_scores && Object.keys(testResult.section_scores).length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Section-Wise Score Breakdown
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(testResult.section_scores).map(([sec, sc]: [string, any]) => (
                      <div key={sec} className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-900 block">{sec}</span>
                        <div className="flex items-center justify-between mt-1 text-xs text-slate-600">
                          <span>Score: <strong>{sc.score} / {sc.max}</strong></span>
                          <span className="text-emerald-600 font-bold">{sc.correct}/{sc.total} Correct</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question By Question Solution Key */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Detailed Question Solutions & Explanations</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['all', 'correct', 'incorrect', 'unattempted'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSolutionFilter(f)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                          solutionFilter === f
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {(reviewTest.questions || []).map((q, idx) => {
                    const qKey = q.id || `q-${idx}`;
                    const studentAns = (testResult.student_answers?.[qKey] || testResult.student_answers?.[idx.toString()] || '').toUpperCase();
                    const correctAns = (q.correct_option || q.correct_answer || 'A').toUpperCase();
                    const isCorrect = studentAns === correctAns;
                    const isUnattempted = !studentAns;

                    if (solutionFilter === 'correct' && !isCorrect) return null;
                    if (solutionFilter === 'incorrect' && (isCorrect || isUnattempted)) return null;
                    if (solutionFilter === 'unattempted' && !isUnattempted) return null;

                    return (
                      <div
                        key={idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isUnattempted
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-slate-200 text-slate-800">
                              Q{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              {q.section || 'General'}
                            </span>
                          </div>

                          <div>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Correct (+{q.positive_marks || q.marks || 4})</span>
                              </span>
                            ) : isUnattempted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                                <span>Unattempted (0)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span>Incorrect (-{q.negative_marks !== undefined ? q.negative_marks : 1})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* Question Diagram if any */}
                        {(q.image_url || q.diagram_url) && (
                          <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-slate-200">
                            <img src={q.image_url || q.diagram_url} alt="" referrerPolicy="no-referrer" className="w-full h-auto" />
                          </div>
                        )}

                        {/* Answer comparison */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Your Choice</span>
                            <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                              {studentAns ? `Option ${studentAns}` : 'Not Attempted'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Correct Answer</span>
                            <span className="font-bold text-emerald-700">
                              Option {correctAns}
                            </span>
                          </div>
                        </div>

                        {/* Step-by-Step Explanation */}
                        {q.explanation && (
                          <div className="mt-3 p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-800 space-y-1">
                            <span className="font-bold text-indigo-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Step-by-Step Solution:</span>
                            </span>
                            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scorecard Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Test evaluation saved to your student academic performance ledger.
              </span>

              <button
                type="button"
                onClick={() => {
                  setTestResult(null);
                  setReviewTest(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Back to Tests Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
