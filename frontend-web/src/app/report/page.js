'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import styles from './report.module.css';

export default function ReportPage() {
    const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterCornerstone, setFilterCornerstone] = useState('all');
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    // Chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/login');
    }, [authLoading, isAuthenticated, router]);

    const fetchReport = useCallback(async () => {
        try {
            const data = await api.get('/v1/tracking/report?days=30');
            setReportData(data);
        } catch (err) {
            console.error('[report] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchReport();
    }, [isAuthenticated, fetchReport]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    async function handleGetAnalysis() {
        setAnalysisLoading(true);
        try {
            const data = await api.post('/v1/ai/report-analysis', {});
            setAiAnalysis(data.analysis);
        } catch (err) {
            console.error('[report] AI analysis error:', err);
            setAiAnalysis('Unable to generate analysis right now. Please try again later.');
        } finally {
            setAnalysisLoading(false);
        }
    }

    async function handleSendChat() {
        if (!chatInput.trim() || chatSending) return;
        const msg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
        setChatSending(true);

        try {
            const data = await api.post('/v1/ai/wellness-chat', { message: msg });
            setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        } catch (err) {
            console.error('[report] Chat error:', err);
            setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t respond right now. Please try again.' }]);
        } finally {
            setChatSending(false);
        }
    }

    if (authLoading || !isAuthenticated) {
        return (
            <main className={styles.page}>
                <div className={styles.loadingWrap}>
                    <div className={styles.spinner} />
                    <p>Loading your report...</p>
                </div>
            </main>
        );
    }

    const displayName = profile?.displayName || user?.displayName || 'Friend';
    const breakdown = reportData?.dailyBreakdown || [];
    const maxDos = Math.max(...breakdown.map(d => d.dosCompleted), 1);
    const filteredBreakdown = filterCornerstone === 'all'
        ? breakdown
        : breakdown; // Full filter would need per-cornerstone daily data

    // Trend calculation
    let trendArrow = '→';
    let trendColor = 'var(--ff-color-text-secondary)';
    let trendPct = '';
    if (reportData?.trend === 'improving') {
        trendArrow = '↑';
        trendColor = 'var(--ff-color-success)';
        const last7 = breakdown.slice(-7);
        const prev7 = breakdown.slice(-14, -7);
        if (last7.length && prev7.length) {
            const l = last7.filter(d => d.feelingScore).reduce((s, d) => s + d.feelingScore, 0) / last7.filter(d => d.feelingScore).length || 0;
            const p = prev7.filter(d => d.feelingScore).reduce((s, d) => s + d.feelingScore, 0) / prev7.filter(d => d.feelingScore).length || 0;
            if (p > 0) trendPct = ` (+${Math.round(((l - p) / p) * 100)}%)`;
        }
    } else if (reportData?.trend === 'declining') {
        trendArrow = '↓';
        trendColor = 'var(--ff-color-error)';
    }

    // Feeling score line chart points
    const scoreDays = breakdown.filter(d => d.feelingScore !== null);
    const scoreMax = 10;
    const chartW = 100; // Percent-based
    const chartH = 120; // px

    return (
        <main className={styles.page}>
            <header className={styles.topBar}>
                <Link href="/dashboard" className={styles.backLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Dashboard
                </Link>
                <h1 className={styles.pageTitle}>My Report</h1>
                <div style={{ width: 90 }} />
            </header>

            <div className="container">
                {loading ? (
                    <div className={styles.loadingWrap}>
                        <div className={styles.spinner} />
                        <p>Loading report data...</p>
                    </div>
                ) : (
                    <>
                        {/* ─── Summary Cards ─── */}
                        <div className={styles.summaryGrid}>
                            <div className={`card ${styles.statCard}`}>
                                <span className={styles.statNum}>{reportData?.totalDaysTracked || 0}</span>
                                <span className={styles.statLabel}>Days Tracked</span>
                            </div>
                            <div className={`card ${styles.statCard}`}>
                                <span className={styles.statNum}>{reportData?.totalDosCompleted || 0}</span>
                                <span className={styles.statLabel}>Tasks Done</span>
                            </div>
                            <div className={`card ${styles.statCard}`}>
                                <span className={styles.statNum}>{reportData?.avgFeelingScore ?? '—'}</span>
                                <span className={styles.statLabel}>Avg Score</span>
                            </div>
                            <div className={`card ${styles.statCard}`}>
                                <span className={styles.statNum} style={{ color: trendColor }}>
                                    {trendArrow}{trendPct}
                                </span>
                                <span className={styles.statLabel}>Trend</span>
                            </div>
                        </div>

                        {/* ─── Dos Bar Chart ─── */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Daily Tasks Completed</h2>
                                <select
                                    className={styles.filterSelect}
                                    value={filterCornerstone}
                                    onChange={e => setFilterCornerstone(e.target.value)}
                                >
                                    <option value="all">All Cornerstones</option>
                                    {Object.keys(reportData?.cornerstoneTotals || {}).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={`card ${styles.chartCard}`}>
                                <div className={styles.barChart}>
                                    {filteredBreakdown.map((day, i) => (
                                        <div key={day.dateKey || i} className={styles.barCol}>
                                            <div
                                                className={styles.bar}
                                                style={{ height: `${(day.dosCompleted / maxDos) * 100}%` }}
                                                title={`${day.dateKey}: ${day.dosCompleted} tasks`}
                                            />
                                            {i % 5 === 0 && (
                                                <span className={styles.barLabel}>
                                                    {new Date(day.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {filteredBreakdown.length === 0 && (
                                        <p className={styles.emptyChart}>No data yet. Complete some daily tasks!</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ─── Feeling Score Line Chart ─── */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Feeling Score Trend</h2>
                            <div className={`card ${styles.chartCard}`}>
                                {scoreDays.length >= 2 ? (
                                    <div className={styles.lineChart}>
                                        <svg viewBox={`0 0 ${scoreDays.length * 30} ${chartH}`} className={styles.lineSvg}>
                                            {/* Grid lines */}
                                            {[2, 4, 6, 8, 10].map(v => (
                                                <line
                                                    key={v}
                                                    x1="0"
                                                    y1={chartH - (v / scoreMax) * (chartH - 20)}
                                                    x2={scoreDays.length * 30}
                                                    y2={chartH - (v / scoreMax) * (chartH - 20)}
                                                    stroke="#e2e8f0"
                                                    strokeWidth="1"
                                                />
                                            ))}
                                            {/* Line */}
                                            <polyline
                                                fill="none"
                                                stroke="var(--ff-color-brand-primary)"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                points={scoreDays.map((d, i) =>
                                                    `${i * 30 + 15},${chartH - (d.feelingScore / scoreMax) * (chartH - 20)}`
                                                ).join(' ')}
                                            />
                                            {/* Dots */}
                                            {scoreDays.map((d, i) => (
                                                <circle
                                                    key={i}
                                                    cx={i * 30 + 15}
                                                    cy={chartH - (d.feelingScore / scoreMax) * (chartH - 20)}
                                                    r="4"
                                                    fill="var(--ff-color-brand-primary)"
                                                >
                                                    <title>{d.dateKey}: {d.feelingScore}/10</title>
                                                </circle>
                                            ))}
                                        </svg>
                                        <div className={styles.lineLabels}>
                                            {scoreDays.map((d, i) => (
                                                i % Math.max(1, Math.floor(scoreDays.length / 6)) === 0 ? (
                                                    <span key={i} className={styles.lineLabel}>
                                                        {new Date(d.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                ) : <span key={i} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className={styles.emptyChart}>
                                        {scoreDays.length === 1
                                            ? 'One data point so far — keep logging your feeling scores!'
                                            : 'No feeling scores yet. Rate your day on the dashboard!'}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* ─── AI Analysis ─── */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>AI Wellness Insight</h2>
                            <div className={`card ${styles.analysisCard}`}>
                                {aiAnalysis ? (
                                    <p className={styles.analysisText}>{aiAnalysis}</p>
                                ) : (
                                    <button
                                        className={`btn-primary ${styles.analysisBtn}`}
                                        onClick={handleGetAnalysis}
                                        disabled={analysisLoading}
                                    >
                                        {analysisLoading ? 'Analyzing...' : 'Get My Wellness Insight'}
                                    </button>
                                )}
                            </div>
                        </section>

                        {/* ─── Wellness Chat ─── */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Wellness Guide Chat</h2>
                            <div className={`card ${styles.chatCard}`}>
                                <div className={styles.chatMessages}>
                                    {chatMessages.length === 0 && (
                                        <p className={styles.chatEmpty}>
                                            Ask me anything about your wellness journey — nutrition tips, movement ideas, sleep habits, or just chat about how you&apos;re feeling.
                                        </p>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`${styles.chatBubble} ${msg.role === 'user' ? styles.chatUser : styles.chatAssistant}`}>
                                            {msg.text}
                                        </div>
                                    ))}
                                    {chatSending && (
                                        <div className={`${styles.chatBubble} ${styles.chatAssistant} ${styles.chatTyping}`}>
                                            <span /><span /><span />
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className={styles.chatInputRow}>
                                    <input
                                        type="text"
                                        className={styles.chatInput}
                                        placeholder="Ask your wellness guide..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                        disabled={chatSending}
                                    />
                                    <button
                                        className={styles.chatSendBtn}
                                        onClick={handleSendChat}
                                        disabled={!chatInput.trim() || chatSending}
                                        aria-label="Send message"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
