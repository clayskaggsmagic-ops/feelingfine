'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import styles from './WalkthroughOverlay.module.css';

/**
 * Walkthrough Steps:
 * 1-5: Dashboard spotlight steps (z-index elevation on real DOM elements)
 * 6-7: Screenshot cards for Community & Report (no DOM targeting)
 * 8:   Final "You're All Set" card
 */
const STEPS = [
    {
        target: '[data-tour="daily-dose"]',
        title: 'Your Daily Dose',
        body: 'Every morning, you\'ll get a fresh tip, quote, or wellness insight matched to today\'s health focus. Tap to reveal it!',
        emoji: '💊',
    },
    {
        target: '[data-tour="feeling-score"]',
        title: 'How Are You Feeling?',
        body: 'Rate how you\'re feeling from 1 to 10 each day. This simple check-in builds a picture of your well-being over time.',
        emoji: '😊',
    },
    {
        target: '[data-tour="cornerstones"]',
        title: 'Today\'s Cornerstone',
        body: 'Your wellness has 7 Cornerstones: Movement, Nutrition, Sleep, Social, Mindfulness, Medical, and Purpose. Each day highlights one to focus on.',
        emoji: '🏛️',
    },
    {
        target: '[data-tour="daily-dos"]',
        title: 'Your Daily Dos',
        body: 'Simple, actionable tasks for today\'s Cornerstone. Check them off as you go — even one checked box is a win!',
        emoji: '✅',
    },
    {
        target: '[data-tour="other-cornerstones"]',
        title: 'Other Cornerstones',
        body: 'Not limited to today\'s focus! Tap here to see tasks from all 7 areas. Check off extras from any Cornerstone any day.',
        emoji: '🔽',
    },
    {
        // Screenshot step — Community
        target: null,
        screenshot: true,
        desktopImg: '/walkthrough/community-desktop.png',
        mobileImg: '/walkthrough/community-mobile.png',
        title: 'Community',
        body: 'Connect with friends, join groups, chat, and participate in weekly challenges. Find it in the ☰ menu!',
        emoji: '👥',
    },
    {
        // Screenshot step — Report
        target: null,
        screenshot: true,
        desktopImg: '/walkthrough/report-desktop.png',
        mobileImg: '/walkthrough/report-mobile.png',
        title: 'Your Progress Report',
        body: 'See mood trends, task streaks, and which Cornerstones you\'ve been working on. Track your growth over time!',
        emoji: '📊',
    },
    {
        // Final step
        target: null,
        title: 'You\'re All Set! 🎉',
        body: 'Your wellness journey starts now. Consistency beats perfection — even one task a day makes a difference. We\'re cheering you on!',
        emoji: '🌟',
        isFinal: true,
    },
];

export default function WalkthroughOverlay({ onComplete }) {
    const [step, setStep] = useState(0);
    const [ready, setReady] = useState(false);
    const prevElevated = useRef(null);

    const current = STEPS[step];

    // Lock scrolling on mount
    useEffect(() => {
        const orig = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = orig; };
    }, []);

    // Z-index elevation: lift target above overlay
    const elevateTarget = useCallback(() => {
        // Remove previous elevation
        if (prevElevated.current) {
            prevElevated.current.style.removeProperty('position');
            prevElevated.current.style.removeProperty('z-index');
            prevElevated.current.style.removeProperty('box-shadow');
            prevElevated.current.style.removeProperty('border-radius');
            prevElevated.current.style.removeProperty('background');
            prevElevated.current = null;
        }

        if (!current.target) {
            setReady(true);
            return;
        }

        const el = document.querySelector(current.target);
        if (!el) {
            setReady(true);
            return;
        }

        // Scroll element to center of viewport
        el.scrollIntoView({ behavior: 'instant', block: 'center' });

        // Wait for scroll to settle, then elevate
        setTimeout(() => {
            // Elevate the element above the overlay
            el.style.position = 'relative';
            el.style.zIndex = '10001';
            el.style.boxShadow = '0 0 0 4px rgba(56, 178, 172, 0.7), 0 8px 32px rgba(0,0,0,0.15)';
            el.style.borderRadius = '14px';
            el.style.background = 'white';
            prevElevated.current = el;
            setReady(true);
        }, 100);
    }, [current.target]);

    useEffect(() => {
        setReady(false);
        elevateTarget();
    }, [elevateTarget]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (prevElevated.current) {
                prevElevated.current.style.removeProperty('position');
                prevElevated.current.style.removeProperty('z-index');
                prevElevated.current.style.removeProperty('box-shadow');
                prevElevated.current.style.removeProperty('border-radius');
                prevElevated.current.style.removeProperty('background');
            }
        };
    }, []);

    function handleNext() {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    }

    function handleSkip() {
        onComplete();
    }

    const isLast = current.isFinal;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <>
            <div className={styles.overlay}>
                {/* Dark backdrop — z-index 10000 */}
                <div className={styles.backdrop} />
            </div>

            {/* Tooltip card — OUTSIDE overlay to escape its stacking context */}
            <div className={`${styles.card} ${ready ? styles.cardVisible : ''}`} key={step}>
                {/* Screenshot preview for Community/Report steps */}
                {current.screenshot && (
                    <div className={styles.screenshotWrap}>
                        <Image
                            src={isMobile ? current.mobileImg : current.desktopImg}
                            alt={current.title}
                            width={isMobile ? 300 : 500}
                            height={isMobile ? 400 : 300}
                            className={styles.screenshot}
                            priority
                        />
                    </div>
                )}

                <div className={styles.cardContent}>
                    <div className={styles.emoji}>{current.emoji}</div>
                    <h3 className={styles.title}>{current.title}</h3>
                    <p className={styles.body}>{current.body}</p>

                    <div className={styles.footer}>
                        <span className={styles.dots}>
                            {STEPS.map((_, i) => (
                                <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`} />
                            ))}
                        </span>
                        <div className={styles.actions}>
                            {!isLast && (
                                <button className={styles.skipBtn} onClick={handleSkip}>Skip</button>
                            )}
                            <button className={styles.nextBtn} onClick={handleNext}>
                                {isLast ? 'Get Started' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
