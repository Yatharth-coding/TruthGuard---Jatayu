import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getHealth } from '../api/health';

export default function DemoModeBanner() {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then((res) => {
        if (!mounted) return;
        // Check various standard backend response fields
        const isDemo = res?.demoMode ?? res?.data?.demoMode ?? res?.isDemo ?? false;
        setDemoMode(Boolean(isDemo));
      })
      .catch(() => {
        // Silently ignore or leave false
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!demoMode) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm z-50">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-100" />
      <span>⚠️ DEMO MODE — AI responses are simulated and not verified by a live provider</span>
    </div>
  );
}
