/**
 * Wall-clock exercise timer.
 *
 * The previous timer counted interval ticks, which Android stops delivering as
 * soon as the WebView is backgrounded or the screen locks — so time spent doing
 * the exercise with the phone down was simply not counted (tester feedback
 * 2026-10-25). Here the timestamps are the source of truth and the UI interval
 * only triggers a re-render, so a throttled or entirely suspended interval
 * cannot lose time.
 */

export interface TimerState {
  /** Seconds banked by previous runs, excluding the one in progress. */
  accumulatedMs: number;
  /** Epoch ms when the current run began, or null when paused. */
  startedAt: number | null;
  running: boolean;
}

export function resetTimer(): TimerState {
  return { accumulatedMs: 0, startedAt: null, running: false };
}

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.running) return state;
  return { ...state, startedAt: now, running: true };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (!state.running || state.startedAt === null) return state;
  return {
    accumulatedMs: state.accumulatedMs + Math.max(0, now - state.startedAt),
    startedAt: null,
    running: false,
  };
}

export function elapsedSeconds(state: TimerState, now: number): number {
  const current =
    state.running && state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0;
  return Math.floor((state.accumulatedMs + current) / 1000);
}
