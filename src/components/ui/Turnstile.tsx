'use client';

import { useEffect, useRef } from 'react';

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    theme?: 'light' | 'dark' | 'auto';
}

declare global {
    interface Window {
        turnstile: any;
        onTurnstileLoad: () => void;
    }
}

export default function Turnstile({ siteKey, onVerify, onError, theme = 'auto' }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Load script if not present
        if (!document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')) {
            const script = document.createElement('script');
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const renderWidget = () => {
            if (window.turnstile && containerRef.current) {
                // If a widget already exists, remove it first (safety check)
                if (widgetIdRef.current) {
                    try {
                        window.turnstile.remove(widgetIdRef.current);
                    } catch (e) {
                        // ignore
                    }
                }

                const id = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => onVerify(token),
                    'error-callback': () => onError?.(),
                    theme: theme,
                    size: 'flexible',
                });
                widgetIdRef.current = id;
            }
        };

        if (window.turnstile) {
            renderWidget();
        } else {
            window.onTurnstileLoad = renderWidget;
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                    widgetIdRef.current = null;
                } catch (e) {
                    // Ignore remove error
                }
            }
        };
    }, [siteKey, theme, onVerify, onError]);

    return <div ref={containerRef} className="min-h-[65px] w-full" />;
}
