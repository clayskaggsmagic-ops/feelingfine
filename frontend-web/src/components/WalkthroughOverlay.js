'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './WalkthroughOverlay.module.css';

const STEPS = [
    {
        target: '[data-tour="daily-dose"]',
        title: 'Your Daily Dose',
        body: 'Each day brings a fresh message designed to nourish your mind and body. Tap to reveal today\'s dose of wellness wisdom.',
        emoji: '💊',
    },
    {
        target: '[data-tour="feeling-score"]',
        title: 'How Are You Feeling?',
        body: 'Rate your mood on a simple scale. This one-tap check-in helps track your emotional well-being over time.',
        emoji: '😊',
    },
    {
        target: '[data-tour="cornerstones"]',
        title: '7 Cornerstones of Health',
        body: 'Each day focuses on one Cornerstone — movement, nutrition, sleep, social, mindfulness, medical, and purpose. Tap any to learn more.',
        emoji: '🏛️',
    },
    {
        target: '[data-tour="daily-dos"]',
        title: 'Daily Dos Checklist',
        body: 'Simple, actionable tasks for today. Check them off as you go — small steps lead to big changes!',
        emoji: '✅',
    },
    {
        target: '[data-tour="report-link"]',
        title: 'Track Your Progress',
        body: 'Visit your Report to see trends in mood, streaks, and Cornerstone activity. Watch your journey unfold.',
        emoji: '📊',
    },
    {
        target: '[data-tour="settings-link"]',
        title: 'Make It Yours',
        body: 'Adjust font sizes, notification preferences, and more in Settings. This app adapts to you.',
        emoji: '⚙️',
    },
    {
        target: null,
        title: 'You\'re All Set! 🎉',
        body: 'Your wellness journey starts now. Remember — consistency beats perfection. We\'re here with you every step of the way.',
        emoji: '🌟',
        isFinal: true,
    },
];

export default function WalkthroughOverlay({ onComplete }) {
    const [step, setStep] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState(null);
    const tooltipRef = useRef(null);

    const current = STEPS[step];

    const measureTarget = useCallback(() => {
        if (!current.target) {
            setSpotlightRect(null);
            return;
        }
        const el = document.querySelector(current.target);
        if (el) {
            const rect = el.getBoundingClientRect();
            const pad = 8;
            setSpotlightRect({
                top: rect.top - pad + window.scrollY,
                left: rect.left - pad,
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
            });
            // Scroll element into view
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            setSpotlightRect(null);
        }
    }, [current.target]);

    useEffect(() => {
        // Small delay so DOM is ready
        const timer = setTimeout(measureTarget, 300);
        window.addEventListener('resize', measureTarget);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', measureTarget);
        };
    }, [measureTarget]);

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

    // Tooltip positioning
    const tooltipStyle = {};
    if (spotlightRect) {
        const below = spotlightRect.top + spotlightRect.height + 16;
        const viewH = window.innerHeight + window.scrollY;
        if (below + 200 < viewH) {
            tooltipStyle.top = `${below}px`;
        } else {
            tooltipStyle.top = `${Math.max(16, spotlightRect.top - 220)}px`;
        }
        tooltipStyle.left = `${Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 360))}px`;
    }

    return (
        <div className={styles.overlay}>
            {/* Spotlight cutout */}
            {spotlightRect && (
                <div
                    className={styles.spotlight}
                    style={{
                        top: `${spotlightRect.top}px`,
                        left: `${spotlightRect.left}px`,
                        width: `${spotlightRect.width}px`,
                        height: `${spotlightRect.height}px`,
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`${styles.tooltip} ${current.isFinal ? styles.tooltipCenter : ''}`}
                style={current.isFinal ? {} : tooltipStyle}
            >
                <div className={styles.tooltipEmoji}>{current.emoji}</div>
                <h3 className={styles.tooltipTitle}>{current.title}</h3>
                <p className={styles.tooltipBody}>{current.body}</p>

                <div className={styles.tooltipFooter}>
                    <span className={styles.stepIndicator}>
                        Step {step + 1} of {STEPS.length}
                    </span>
                    <div className={styles.tooltipActions}>
                        {!current.isFinal && (
                            <button className={styles.skipBtn} onClick={handleSkip}>
                                Skip Tour
                            </button>
                        )}
                        <button className={styles.nextBtn} onClick={handleNext}>
                            {current.isFinal ? 'Get Started' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
