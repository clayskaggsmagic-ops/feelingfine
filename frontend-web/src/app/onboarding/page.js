'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
    const { user, loading: authLoading, refreshProfile } = useAuth();
    const router = useRouter();
    const [survey, setSurvey] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loadingState, setLoadingState] = useState(true);

    // Determine how many questions to show per page based on viewport
    const [questionsPerPage, setQuestionsPerPage] = useState(1);

    useEffect(() => {
        function handleResize() {
            setQuestionsPerPage(window.innerWidth >= 768 ? 3 : 1);
        }
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch the onboarding survey
    const fetchSurvey = useCallback(async () => {
        try {
            const data = await api.get('/v1/surveys/pending');
            const onboarding = data.surveys?.find(s => s.type === 'onboarding');
            if (!onboarding) {
                // No onboarding survey pending — user already completed it
                router.push('/dashboard');
                return;
            }
            setSurvey(onboarding);
            const qs = typeof onboarding.questions === 'string'
                ? JSON.parse(onboarding.questions)
                : onboarding.questions || [];
            setQuestions(qs);
        } catch (err) {
            console.error('[onboarding] Error fetching survey:', err);
            setError('Could not load the survey. Please try again.');
        } finally {
            setLoadingState(false);
        }
    }, [router]);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else {
                fetchSurvey();
            }
        }
    }, [authLoading, user, router, fetchSurvey]);

    function setAnswer(questionIndex, value) {
        setAnswers(prev => ({ ...prev, [questionIndex]: value }));
    }

    // Pagination
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    const currentPage = Math.floor(currentIndex / questionsPerPage);
    const pageStart = currentPage * questionsPerPage;
    const pageEnd = Math.min(pageStart + questionsPerPage, questions.length);
    const visibleQuestions = questions.slice(pageStart, pageEnd);

    function goNext() {
        const nextStart = pageEnd;
        if (nextStart < questions.length) {
            setCurrentIndex(nextStart);
        }
    }

    function goBack() {
        const prevStart = Math.max(0, pageStart - questionsPerPage);
        setCurrentIndex(prevStart);
    }

    const isLastPage = pageEnd >= questions.length;
    const allAnswered = visibleQuestions.every((_, i) => answers[pageStart + i] != null && answers[pageStart + i] !== '');

    async function handleSubmit() {
        setSubmitting(true);
        setError('');

        try {
            const answersArray = Object.entries(answers).map(([idx, value]) => ({
                questionIndex: Number(idx),
                value,
            }));

            await api.post(`/v1/surveys/${survey.id}/submit`, { answers: answersArray });
            await refreshProfile();
            router.push('/dashboard');
        } catch (err) {
            console.error('[onboarding] Submit error:', err);
            setError('Failed to save your answers. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (authLoading || loadingState) {
        return (
            <main className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading your survey...</p>
                </div>
            </main>
        );
    }

    if (!survey || questions.length === 0) {
        return (
            <main className={styles.page}>
                <div className={styles.loading}>
                    <p>{error || 'No survey available.'}</p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>{survey.title || 'Welcome Survey'}</h1>
                    {survey.description && <p className={styles.desc}>{survey.description}</p>}
                    <div className={styles.progress}>
                        <div className={styles.progressText}>
                            Question {pageStart + 1}{questionsPerPage > 1 && pageEnd > pageStart + 1 ? `–${pageEnd}` : ''} of {questions.length}
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${(pageEnd / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {error && <div className={styles.error} role="alert">{error}</div>}

                <div className={styles.questionsGrid}>
                    {visibleQuestions.map((q, i) => {
                        const globalIdx = pageStart + i;
                        return (
                            <QuestionCard
                                key={globalIdx}
                                question={q}
                                index={globalIdx}
                                value={answers[globalIdx]}
                                onChange={(val) => setAnswer(globalIdx, val)}
                            />
                        );
                    })}
                </div>

                <div className={styles.nav}>
                    <button
                        className={`btn-secondary ${styles.navBtn}`}
                        onClick={goBack}
                        disabled={currentPage === 0}
                    >
                        Back
                    </button>

                    {isLastPage ? (
                        <button
                            className={`btn-primary ${styles.navBtn}`}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Complete'}
                        </button>
                    ) : (
                        <button
                            className={`btn-primary ${styles.navBtn}`}
                            onClick={goNext}
                            disabled={!allAnswered}
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}

// ─── Question Card Component ────────────────────────────────────────────────

function QuestionCard({ question, index, value, onChange }) {
    const q = question;
    const type = q.type || 'free_text';

    return (
        <div className={`card ${styles.questionCard}`}>
            <p className={styles.questionLabel}>
                <span className={styles.questionNum}>{index + 1}.</span> {q.text || q.label}
            </p>

            {type === 'scale' && (
                <ScaleInput
                    min={q.min || 1}
                    max={q.max || 10}
                    minLabel={q.minLabel || ''}
                    maxLabel={q.maxLabel || ''}
                    value={value}
                    onChange={onChange}
                />
            )}

            {type === 'single_choice' && (
                <div className={styles.choiceGroup}>
                    {(q.options || []).map((opt) => {
                        const optVal = typeof opt === 'string' ? opt : opt.value || opt.label;
                        const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value;
                        return (
                            <label key={optVal} className={`${styles.choiceItem} ${value === optVal ? styles.selected : ''}`}>
                                <input
                                    type="radio"
                                    name={`q-${index}`}
                                    value={optVal}
                                    checked={value === optVal}
                                    onChange={() => onChange(optVal)}
                                    className="sr-only"
                                />
                                <span className={styles.choiceLabel}>{optLabel}</span>
                            </label>
                        );
                    })}
                </div>
            )}

            {type === 'multiple_choice' && (
                <div className={styles.choiceGroup}>
                    {(q.options || []).map((opt) => {
                        const optVal = typeof opt === 'string' ? opt : opt.value || opt.label;
                        const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value;
                        const currentArr = Array.isArray(value) ? value : [];
                        const isChecked = currentArr.includes(optVal);
                        return (
                            <label key={optVal} className={`${styles.choiceItem} ${isChecked ? styles.selected : ''}`}>
                                <input
                                    type="checkbox"
                                    value={optVal}
                                    checked={isChecked}
                                    onChange={() => {
                                        const next = isChecked
                                            ? currentArr.filter(v => v !== optVal)
                                            : [...currentArr, optVal];
                                        onChange(next.length > 0 ? next : '');
                                    }}
                                    className="sr-only"
                                />
                                <span className={styles.choiceLabel}>{optLabel}</span>
                            </label>
                        );
                    })}
                </div>
            )}

            {type === 'free_text' && (
                <textarea
                    className={styles.freeText}
                    placeholder={q.placeholder || 'Type your answer...'}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                />
            )}

            {type === 'date_picker' && (
                <input
                    type="date"
                    className={styles.dateInput}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}

// ─── Scale Input (1-10 numbered circles) ────────────────────────────────────

function ScaleInput({ min, max, minLabel, maxLabel, value, onChange }) {
    const nums = [];
    for (let i = min; i <= max; i++) nums.push(i);

    return (
        <div className={styles.scaleContainer}>
            <div className={styles.scaleRow}>
                {nums.map(n => (
                    <button
                        key={n}
                        type="button"
                        className={`${styles.scaleCircle} ${value === n || value === String(n) ? styles.scaleSelected : ''}`}
                        onClick={() => onChange(n)}
                    >
                        {n}
                    </button>
                ))}
            </div>
            {(minLabel || maxLabel) && (
                <div className={styles.scaleLabels}>
                    <span>{minLabel}</span>
                    <span>{maxLabel}</span>
                </div>
            )}
        </div>
    );
}
