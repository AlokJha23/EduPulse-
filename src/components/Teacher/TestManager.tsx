import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Test, TestQuestion, TestResult } from '../../types';
import { ALL_CLASSES } from '../../constants/academic';
import {
  Award,
  Plus,
  Clock,
  Users,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const TestManager: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTestResults, setSelectedTestResults] = useState<any | null>(null);

  // New CBT Test State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [className, setClassName] = useState('Class 12');
  const [section, setSection] = useState('A');
  const [chapter, setChapter] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [instructions, setInstructions] = useState('1. Marking Scheme: +4 for correct, -1 for incorrect.\n2. Do not switch tabs during examination.');
  
  const [questions, setQuestions] = useState<TestQuestion[]>([
    {
      section: 'Physics',
      question_text: 'A circular coil of radius 10 cm and 500 turns is rotated through 180° in 0.25 s in a magnetic field of 3.0 × 10⁻⁵ T. Calculate the induced EMF:',
      question_type: 'mcq',
      option_a: '3.8 × 10⁻³ V',
      option_b: '7.5 × 10⁻³ V',
      option_c: '1.5 × 10⁻² V',
      option_d: '4.2 × 10⁻⁴ V',
      correct_option: 'A',
      marks: 4,
      positive_marks: 4,
      negative_marks: 1,
      explanation: 'EMF = ΔΦ / Δt = 2NBA / Δt ≈ 3.8 × 10⁻³ V',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await api.teacher.getTests();
      setTests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        section: subject,
        question_text: '',
        question_type: 'mcq',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        marks: 4,
        positive_marks: 4,
        negative_marks: 1,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: keyof TestQuestion, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const handleQuestionImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleQuestionChange(idx, 'image_url', event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a Test Title.');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question to the mock test.');
      return;
    }
    // Validate that questions have text
    const emptyQ = questions.findIndex((q) => !q.question_text.trim());
    if (emptyQ !== -1) {
      alert(`Question #${emptyQ + 1} is missing question text. Please fill it in.`);
      return;
    }

    setSubmitting(true);

    try {
      const calculatedTotalMarks = questions.reduce((acc, q) => acc + (q.positive_marks || q.marks || 4), 0);
      const uniqueSections = Array.from(new Set(questions.map((q) => q.section || subject)));

      await api.teacher.createTest({
        title: title.trim(),
        subject,
        test_type: 'cbt',
        class_name: className,
        section,
        sections: uniqueSections,
        chapter: chapter.trim() || 'General',
        duration_minutes: Number(durationMinutes) || 60,
        total_marks: calculatedTotalMarks,
        max_marks: calculatedTotalMarks,
        instructions: instructions.trim() || 'Read all questions carefully before answering.',
        questions,
      });

      setIsAddModalOpen(false);
      setTitle('');
      setChapter('');
      setQuestions([
        {
          section: 'Physics',
          question_text: '',
          question_type: 'mcq',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: 'A',
          marks: 4,
          positive_marks: 4,
          negative_marks: 1,
          explanation: '',
        },
      ]);
      await loadTests();
    } catch (err: any) {
      alert(err.message || 'Failed to create CBT test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = async (testId: string) => {
    try {
      const data = await api.teacher.getTestResults(testId);
      setSelectedTestResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>CBT Online Mock Test & Assessment Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct JEE/NEET/Board standard computer based mock tests with section timers, negative marking, and diagram questions.
          </p>
        </div>

        <button
          id="open-create-cbt-test-btn"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create CBT Mock Test (PW / Allen Pattern)</span>
        </button>
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading tests...</div>
      ) : tests.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Tests Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Create CBT Mock Test" to publish a full online exam with diagrams and negative marking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => {
            const totalQ = test.questions?.length || 0;
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      CBT Exam
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{test.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {test.chapter || 'All India Mock Test series with sectional division.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400">Duration</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        {test.duration_minutes}m
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Questions</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{totalQ} MCQs</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Max Marks</span>
                      <span className="text-xs font-bold text-indigo-600 mt-0.5 block">{maxMarks} M</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Submissions: {test.submissions_count || 0}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleViewResults(test.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Performance</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CBT TEST MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create CBT Mock Test (PW / Allen Pattern)</h2>
                  <p className="text-xs text-slate-500">Configure questions, diagram uploads, sections, and marking (+4/-1)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateTest} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Test Meta info */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exam Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Test Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. All India Mega Mock Test - Physics & Chemistry"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Stream *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Biology">Biology</option>
                      <option value="Physics & Chemistry">Physics & Chemistry (Combined)</option>
                      <option value="Full Mock (PCM)">Full Mock (Physics, Chemistry, Maths)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {ALL_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chapter / Topics</label>
                    <input
                      type="text"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      placeholder="e.g. Electrodynamics & Mechanics"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Questions ({questions.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Question</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4"
                    >
                      {/* Q header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg">
                            Q{idx + 1}
                          </span>

                          <input
                            type="text"
                            value={q.section || ''}
                            onChange={(e) => handleQuestionChange(idx, 'section', e.target.value)}
                            placeholder="Section (e.g. Physics)"
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white w-32 font-medium"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <span>+Mark:</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={q.positive_marks || 4}
                              onChange={(e) => handleQuestionChange(idx, 'positive_marks', parseInt(e.target.value) || 4)}
                              className="w-12 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
                            />
                            <span className="ml-2">-Mark:</span>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={q.negative_marks !== undefined ? q.negative_marks : 1}
                              onChange={(e) => handleQuestionChange(idx, 'negative_marks', parseInt(e.target.value) || 0)}
                              className="w-12 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
                            />
                          </div>

                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Question Statement *</label>
                        <textarea
                          required
                          rows={3}
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                          placeholder="Type the MCQ question text, numerical values, or problem setup..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Question Diagram / Image Attachment */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{q.image_url ? 'Replace Diagram File' : 'Upload Diagram / Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleQuestionImageUpload(idx, e)}
                              className="hidden"
                            />
                          </label>

                          <div className="flex-1 min-w-[200px]">
                            <input
                              type="text"
                              value={q.image_url?.startsWith('data:') ? '' : q.image_url || ''}
                              onChange={(e) => handleQuestionChange(idx, 'image_url', e.target.value)}
                              placeholder="Or paste Diagram Image URL here..."
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                          </div>

                          {q.image_url && (
                            <div className="flex items-center gap-2">
                              <img src={q.image_url} alt="" className="h-8 w-12 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(idx, 'image_url', '')}
                                className="text-xs text-red-600 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options Grid (A, B, C, D) */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-slate-700">Options & Correct Answer</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { key: 'A', field: 'option_a' as const },
                            { key: 'B', field: 'option_b' as const },
                            { key: 'C', field: 'option_c' as const },
                            { key: 'D', field: 'option_d' as const },
                          ].map((opt) => (
                            <div key={opt.key} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(idx, 'correct_option', opt.key)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                                  q.correct_option === opt.key
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Click to set as correct option"
                              >
                                {opt.key}
                              </button>
                              <input
                                type="text"
                                required
                                value={(q as any)[opt.field] || ''}
                                onChange={(e) => handleQuestionChange(idx, opt.field, e.target.value)}
                                placeholder={`Option ${opt.key} text`}
                                className="w-full px-2 py-1 text-xs border-0 focus:ring-0 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step-by-step Solution */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Step-by-Step Solution / Explanation (Shown to students after test submission)
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                          placeholder="Provide the formula derivation, substitution steps, or concept clarification..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {submitting ? 'Publishing Test...' : 'Publish CBT Mock Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TEST RESULTS MODAL */}
      {selectedTestResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTestResults.test?.title}</h3>
                <p className="text-xs text-slate-500">Student performance & submission ledger</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTestResults(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {(!selectedTestResults.results || selectedTestResults.results.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No submissions yet recorded for this mock test.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTestResults.results.map((res: TestResult, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">{res.student_name}</span>
                        <span className="text-xs text-slate-500">Roll No: {res.student_roll || '01'} • Submitted: {new Date(res.completed_at || '').toLocaleTimeString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-indigo-600 block">{res.score_obtained} / {res.max_marks}</span>
                        <span className="text-xs font-semibold text-emerald-600">{res.percentage}% ({res.grade})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
