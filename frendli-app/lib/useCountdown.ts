import { useState, useEffect } from 'react';

interface CountdownResult {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
}

function compute(valid_until: string | null): CountdownResult {
  if (!valid_until) return { label: '', isUrgent: false, isExpired: false };

  const now = new Date();
  const end = new Date(valid_until);
  if (isNaN(end.getTime())) return { label: '', isUrgent: false, isExpired: false };

  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { label: 'Expired', isUrgent: false, isExpired: true };

  const diffHours = diffMs / (1000 * 60 * 60);

  // "Expires today" overrides hour/min labels when same calendar day
  const sameDay =
    end.getFullYear() === now.getFullYear() &&
    end.getMonth() === now.getMonth() &&
    end.getDate() === now.getDate();

  if (sameDay) return { label: 'Expires today', isUrgent: true, isExpired: false };

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return { label: `${mins} min left`, isUrgent: true, isExpired: false };
  }

  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return { label: `${hours} hour${hours !== 1 ? 's' : ''} left`, isUrgent: true, isExpired: false };
  }

  if (diffHours < 48) {
    return { label: '1 day left', isUrgent: false, isExpired: false };
  }

  const days = Math.floor(diffHours / 24);
  return { label: `${days} days left`, isUrgent: false, isExpired: false };
}

export function useCountdown(valid_until: string | null): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => compute(valid_until));

  useEffect(() => {
    setResult(compute(valid_until));
    const id = setInterval(() => setResult(compute(valid_until)), 60_000);
    return () => clearInterval(id);
  }, [valid_until]);

  return result;
}
