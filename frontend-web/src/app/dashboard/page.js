'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import styles from './dashboard.module.css';

// ─── SVG Cornerstone Icons ──────────────────────────────────────────────────

const CORNERSTONE_ICONS = {
    movement: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M22 19l-4-4-3 3-4-4-5 5" /><path d="M2 12l5-5 4 4" />
        </svg>
    ),
    nutrition: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" />
        </svg>
    ),
    sleep: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
    ),
    stress: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 16v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2" /><path d="M12 2v4" /><path d="M8 6l4 4 4-4" /><circle cx="12" cy="14" r="4" />
        </svg>
    ),
    social: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    purpose: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    mindset: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8z" /><path d="M12 8v4l2 2" />
        </svg>
    ),
};

function getCornerstoneIcon(id) {
    const key = (id || '').toLowerCase();
    for (const [k, icon] of Object.entries(CORNERSTONE_ICONS)) {
        if (key.includes(k)) return icon;
    }
    // Default icon
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
    );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function DashboardPage() {
    const { user, profile, loading: authLoading, isAuthenticated, emailVerified, logout } = useAuth();
    const router = useRouter();

    const [doseData, setDoseData] = useState(null);
    const [doseRevealed, setDoseRevealed] = useState(false);
    const [feelingScore, setFeelingScore] = useState(null);
    const [feelingSubmitted, setFeelingSubmitted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [loadingDose, setLoadingDose] = useState(true);

    // Prompt 8 state
    const [dosData, setDosData] = useState(null);
    const [completedDoIds, setCompletedDoIds] = useState(new Set());
    const [customDos, setCustomDos] = useState([]);
    const [customDoText, setCustomDoText] = useState('');
    const [showOtherCornerstones, setShowOtherCornerstones] = useState(false);
    const [expandedCornerstone, setExpandedCornerstone] = useState(null);
    const [cornerstoneDos, setCornerstoneDos] = useState({});

    // Redirect if not authenticated or email not verified
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/login');
        } else if (!emailVerified) {
            router.push('/verify-email');
        }
    }, [authLoading, isAuthenticated, emailVerified, router]);

    // Fetch daily dose
    const fetchDose = useCallback(async () => {
        try {
            const data = await api.get('/v1/content/daily-dose');
            setDoseData(data);

            if (data.phase === 'week1' && data.dose?.banner) {
                const dismissKey = `banner_${data.programDay}_${new Date().toISOString().slice(0, 10)}`;
                if (!sessionStorage.getItem(dismissKey)) {
                    setBannerVisible(true);
                }
            }
        } catch (err) {
            console.error('[dashboard] Error fetching dose:', err);
        } finally {
            setLoadingDose(false);
        }
    }, []);

    // Fetch daily dos
    const fetchDos = useCallback(async () => {
        try {
            const data = await api.get('/v1/content/daily-dos');
            setDosData(data);
        } catch (err) {
            console.error('[dashboard] Error fetching dos:', err);
        }
    }, []);

    // Fetch today's tracking
    const fetchTodayTracking = useCallback(async () => {
        try {
            const data = await api.get('/v1/tracking/today');
            if (data.tracking?.feelingScore) {
                setFeelingScore(data.tracking.feelingScore);
                setFeelingSubmitted(true);
            }
            if (data.tracking?.completedDos) {
                setCompletedDoIds(new Set(data.tracking.completedDos.map(d => d.doId)));
            }
            if (data.tracking?.customDos) {
                setCustomDos(data.tracking.customDos);
            }
        } catch {
            // No tracking for today yet
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDose();
            fetchDos();
            fetchTodayTracking();
        }
    }, [isAuthenticated, fetchDose, fetchDos, fetchTodayTracking]);

    async function handleFeelingSubmit(score) {
        setFeelingScore(score);
        try {
            await api.post('/v1/tracking/feeling-score', { score });
            setFeelingSubmitted(true);
        } catch (err) {
            console.error('[dashboard] Error submitting feeling score:', err);
        }
    }

    async function handleToggleDo(doId, category) {
        const isCompleted = completedDoIds.has(doId);

        // Optimistic update
        setCompletedDoIds(prev => {
            const next = new Set(prev);
            if (isCompleted) next.delete(doId);
            else next.add(doId);
            return next;
        });

        try {
            if (isCompleted) {
                await api.post('/v1/tracking/uncomplete-do', { doId });
            } else {
                await api.post('/v1/tracking/complete-do', { doId, category });
            }
        } catch (err) {
            console.error('[dashboard] Toggle do error:', err);
            // Revert on error
            setCompletedDoIds(prev => {
                const next = new Set(prev);
                if (isCompleted) next.add(doId);
                else next.delete(doId);
                return next;
            });
        }
    }

    async function handleAddCustomDo() {
        if (!customDoText.trim()) return;
        const text = customDoText.trim();
        const category = dosData?.focusedCornerstone?.id || 'general';
        setCustomDoText('');

        try {
            const data = await api.post('/v1/tracking/custom-do', { text, category });
            if (data.tracking?.customDos) {
                setCustomDos(data.tracking.customDos);
            }
        } catch (err) {
            console.error('[dashboard] Custom do error:', err);
        }
    }

    function dismissBanner() {
        setBannerDismissed(true);
        setBannerVisible(false);
        if (doseData) {
            const dismissKey = `banner_${doseData.programDay}_${new Date().toISOString().slice(0, 10)}`;
            sessionStorage.setItem(dismissKey, 'true');
        }
    }

    if (authLoading || !isAuthenticated) {
        return (
            <main className={styles.page}>
                <div className={styles.loadingWrap}>
                    <div className={styles.spinner} />
                    <p>Loading your wellness journey...</p>
                </div>
            </main>
        );
    }

    const greeting = getTimeGreeting();
    const displayName = profile?.displayName || user?.displayName || 'Friend';
    const focusedCornerstone = dosData?.focusedCornerstone;
    const dos = dosData?.dos || [];
    const allCornerstones = dosData?.allCornerstones || doseData?.allCornerstones || [];
    const otherCornerstones = allCornerstones.filter(c => c.id !== focusedCornerstone?.id);
    const completedCount = dos.filter(d => completedDoIds.has(d.id)).length + customDos.length;
    const totalCount = dos.length + customDos.length;

    return (
        <>
            {/* ─── Pop-up Banner (Week 1) ─── */}
            {bannerVisible && !bannerDismissed && doseData?.dose?.banner && (
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerCard}>
                        <button className={styles.bannerClose} onClick={dismissBanner} aria-label="Close banner">
                            &#x2715;
                        </button>
                        <h2 className={styles.bannerTitle}>Day {doseData.programDay}</h2>
                        <p className={styles.bannerText}>
                            {doseData.dose.banner.text || doseData.dose.banner.paragraph || doseData.dose.banner}
                        </p>
                        {doseData.dose.banner.question && (
                            <p className={styles.bannerQuestion}>{doseData.dose.banner.question}</p>
                        )}
                        <button className={`btn-primary ${styles.bannerCta}`} onClick={dismissBanner}>
                            Continue to My Dose
                        </button>
                    </div>
                </div>
            )}

            <main className={styles.page}>
                {/* ─── Nav Header ─── */}
                <header className={styles.topBar}>
                    <Link href="/dashboard" className={styles.logoLink}>
                        <span className={styles.logoMark}>FF</span>
                    </Link>
                    <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                        <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                    </button>
                </header>

                {menuOpen && (
                    <nav className={styles.menu}>
                        <Link href="/dashboard" className={styles.menuItem} onClick={() => setMenuOpen(false)}>My Wellness</Link>
                        <Link href="/community" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="community-link">Community</Link>
                        <Link href="/report" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="report-link">My Report</Link>
                        <Link href="/settings" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="settings-link">Settings</Link>
                        <button className={styles.menuLogout} onClick={() => { logout(); setMenuOpen(false); }}>Sign Out</button>
                    </nav>
                )}

                <div className="container">
                    {/* ─── Greeting ─── */}
                    <section className={styles.greeting}>
                        <h1>{greeting}, {displayName}</h1>
                        <p className={styles.date}>{formatDate(new Date())}</p>
                        {doseData && doseData.programDay > 0 && (
                            <span className={styles.dayBadge}>Day {doseData.programDay}</span>
                        )}
                    </section>

                    {/* ─── Daily Dose Card ─── */}
                    <section className={styles.section} data-tour="daily-dose">
                        <h2 className={styles.sectionTitle}>Your Daily Dose</h2>
                        {loadingDose ? (
                            <div className={`card ${styles.doseCard}`}>
                                <p className={styles.doseLoading}>Loading today&apos;s dose...</p>
                            </div>
                        ) : doseData?.dose ? (
                            <div
                                className={`card ${styles.doseCard} ${doseRevealed ? styles.doseRevealed : ''}`}
                                onClick={() => !doseRevealed && setDoseRevealed(true)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && !doseRevealed && setDoseRevealed(true)}
                            >
                                <h3 className={styles.doseTitle}>{doseData.dose.title}</h3>
                                {!doseRevealed ? (
                                    <p className={styles.doseTease}>Tap to reveal today&apos;s message</p>
                                ) : (
                                    <div className={styles.doseMessage}>
                                        <p>{doseData.dose.message}</p>
                                    </div>
                                )}
                                {doseData.focusedCornerstone && (
                                    <span className={styles.dosePill}>
                                        {doseData.focusedCornerstone.name || doseData.focusedCornerstone.id}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className={`card ${styles.doseCard}`}>
                                <p className={styles.doseLoading}>Complete your onboarding to start receiving doses.</p>
                            </div>
                        )}
                    </section>

                    {/* ─── Feeling Score ─── */}
                    <section className={styles.section} data-tour="feeling-score">
                        <h2 className={styles.sectionTitle}>How fine are you feeling today?</h2>
                        <div className={`card ${styles.feelingCard}`}>
                            {feelingSubmitted ? (
                                <div className={styles.feelingDone}>
                                    <span className={styles.feelingBigNum}>{feelingScore}</span>
                                    <p>Recorded for today. You&apos;re doing great.</p>
                                </div>
                            ) : (
                                <div className={styles.feelingRow}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                        <button
                                            key={n}
                                            className={`${styles.feelingCircle} ${feelingScore === n ? styles.feelingSelected : ''}`}
                                            onClick={() => handleFeelingSubmit(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className={styles.feelingLabels}>
                                <span>Not great</span>
                                <span>Feeling fine</span>
                            </div>
                        </div>
                    </section>

                    {/* ─── Today's Cornerstone & Daily Dos ─── */}
                    {focusedCornerstone && (
                        <section className={styles.section} data-tour="cornerstones">
                            <div className={styles.focusBadge}>TODAY&apos;S FOCUS</div>
                            <div className={styles.focusHeader}>
                                <span className={styles.focusIcon}>
                                    {getCornerstoneIcon(focusedCornerstone.id)}
                                </span>
                                <h2 className={styles.focusName}>
                                    {focusedCornerstone.name || focusedCornerstone.id}
                                </h2>
                            </div>
                            {focusedCornerstone.description && (
                                <p className={styles.focusDesc}>{focusedCornerstone.description}</p>
                            )}

                            {/* Progress */}
                            <div className={styles.progressRow}>
                                <span>{completedCount} of {totalCount} complete</span>
                                <div className={styles.progressBarSmall}>
                                    <div
                                        className={styles.progressFillSmall}
                                        style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>

                            {/* Daily Dos Checklist */}
                            <div className={`card ${styles.dosCard}`} data-tour="daily-dos">
                                {dos.length === 0 && customDos.length === 0 ? (
                                    <p className={styles.emptyDos}>No tasks for today yet.</p>
                                ) : (
                                    <ul className={styles.dosList}>
                                        {dos.map(d => (
                                            <li key={d.id} className={styles.doItem}>
                                                <button
                                                    className={`${styles.doCheck} ${completedDoIds.has(d.id) ? styles.doChecked : ''}`}
                                                    onClick={() => handleToggleDo(d.id, d.category || focusedCornerstone.id)}
                                                    aria-label={`${completedDoIds.has(d.id) ? 'Uncheck' : 'Check'} ${d.title}`}
                                                >
                                                    {completedDoIds.has(d.id) && (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <span className={`${styles.doText} ${completedDoIds.has(d.id) ? styles.doTextDone : ''}`}>
                                                    {d.title || d.text}
                                                </span>
                                            </li>
                                        ))}
                                        {customDos.map(d => (
                                            <li key={d.id || d.text} className={styles.doItem}>
                                                <span className={`${styles.doCheck} ${styles.doChecked}`}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </span>
                                                <span className={`${styles.doText} ${styles.doTextDone}`}>
                                                    {d.text}
                                                </span>
                                                <span className={styles.customBadge}>custom</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Add Custom Do */}
                                <div className={styles.addDo}>
                                    <input
                                        type="text"
                                        className={styles.addDoInput}
                                        placeholder="Add your own..."
                                        value={customDoText}
                                        onChange={(e) => setCustomDoText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomDo()}
                                    />
                                    <button
                                        className={styles.addDoBtn}
                                        onClick={handleAddCustomDo}
                                        disabled={!customDoText.trim()}
                                        aria-label="Add custom task"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ─── Other Cornerstones Accordion ─── */}
                    {otherCornerstones.length > 0 && (
                        <section className={styles.section} data-tour="other-cornerstones">
                            <button
                                className={styles.showOther}
                                onClick={() => setShowOtherCornerstones(!showOtherCornerstones)}
                            >
                                {showOtherCornerstones ? 'Hide' : 'Show'} Other Cornerstones
                                <svg className={`${styles.chevron} ${showOtherCornerstones ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {showOtherCornerstones && (
                                <div className={styles.cornerstoneList}>
                                    {otherCornerstones.map(c => (
                                        <div key={c.id} className={`card ${styles.cornerstoneCard}`}>
                                            <button
                                                className={styles.cornerstoneHeader}
                                                onClick={() => {
                                                    const newId = expandedCornerstone === c.id ? null : c.id;
                                                    setExpandedCornerstone(newId);
                                                    if (newId && cornerstoneDos[newId] === undefined) {
                                                        api.get(`/v1/content/daily-dos/${newId}`)
                                                            .then(data => setCornerstoneDos(prev => ({ ...prev, [newId]: data.dos || [] })))
                                                            .catch(() => setCornerstoneDos(prev => ({ ...prev, [newId]: [] })));
                                                    }
                                                }}
                                            >
                                                <span className={styles.cornerstoneIcon}>
                                                    {getCornerstoneIcon(c.id)}
                                                </span>
                                                <span className={styles.cornerstoneName}>
                                                    {c.name || c.id}
                                                </span>
                                                <svg className={`${styles.chevronSmall} ${expandedCornerstone === c.id ? styles.chevronOpen : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            {expandedCornerstone === c.id && (
                                                <div className={styles.cornerstoneBody}>
                                                    {c.description && <p className={styles.focusDesc}>{c.description}</p>}
                                                    {cornerstoneDos[c.id] === undefined ? (
                                                        <p className={styles.doseLoading}>Loading tasks...</p>
                                                    ) : cornerstoneDos[c.id].length === 0 ? (
                                                        <p className={styles.emptyDos}>No tasks for this cornerstone yet.</p>
                                                    ) : (
                                                        <ul className={styles.dosList}>
                                                            {cornerstoneDos[c.id].map(d => (
                                                                <li key={d.id} className={styles.doItem}>
                                                                    <button
                                                                        className={`${styles.doCheck} ${completedDoIds.has(d.id) ? styles.doChecked : ''}`}
                                                                        onClick={() => handleToggleDo(d.id, d.category || c.id)}
                                                                        aria-label={`${completedDoIds.has(d.id) ? 'Uncheck' : 'Check'} ${d.text}`}
                                                                    >
                                                                        {completedDoIds.has(d.id) && (
                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="20 6 9 17 4 12" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                    <span className={`${styles.doText} ${completedDoIds.has(d.id) ? styles.doTextDone : ''}`}>
                                                                        {d.text}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}
