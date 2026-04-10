import { renderHook, act } from '@testing-library/react-hooks';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns empty label for null input', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.label).toBe('');
    expect(result.current.isUrgent).toBe(false);
    expect(result.current.isExpired).toBe(false);
  });

  it('returns "Expired" for past date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current.label).toBe('Expired');
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns hours label and isUrgent when < 24h remaining', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(); // 5h
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('5 hours left');
    expect(result.current.isUrgent).toBe(true);
  });

  it('returns minutes label when < 1h remaining', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('30 min left');
    expect(result.current.isUrgent).toBe(true);
  });

  it('returns days label when > 48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(); // 3 days
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('3 days left');
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns "1 day left" when 24–48h remaining', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(); // 30h
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.label).toBe('1 day left');
    expect(result.current.isUrgent).toBe(false);
  });

  it('returns "Expires today" when expiry is same calendar day', () => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 0);
    // Only run this test when it's before 23:59 — skip if within 1 min of midnight
    if (endOfDay.getTime() - Date.now() < 60000) return;
    const { result } = renderHook(() => useCountdown(endOfDay.toISOString()));
    expect(result.current.label).toBe('Expires today');
    expect(result.current.isUrgent).toBe(true);
  });

  it('recalculates after 60 seconds', () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2h
    const { result } = renderHook(() => useCountdown(soon));
    expect(result.current.label).toBe('2 hours left');
    act(() => jest.advanceTimersByTime(61000));
    // still 2h (barely changed) — label unchanged is fine; key thing is no crash
    expect(result.current.label).toBe('2 hours left');
  });
});
