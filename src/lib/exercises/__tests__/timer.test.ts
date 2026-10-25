import { describe, expect, it } from "vitest";
import { elapsedSeconds, startTimer, pauseTimer, resetTimer, type TimerState } from "@/lib/exercises/timer";

/**
 * Tester feedback 2026-10-25: "The exercise timer doesn't run when lock screen."
 *
 * The timer counted interval ticks (`setTimer(t => t + 1)` every 1000ms). Android
 * suspends timers in a backgrounded or screen-locked WebView, so the ticks stop
 * and the elapsed time is lost outright — a 10-minute exercise with the screen
 * off reads as a few seconds.
 *
 * The fix is to treat wall-clock time as the source of truth: record when the
 * timer started, accumulate completed runs across pauses, and derive the elapsed
 * value from `Date.now()`. The interval then only triggers a re-render, so it no
 * longer matters whether it fires once a second or not at all.
 */
describe("exercise timer", () => {
  const t0 = 1_700_000_000_000;

  it("reads zero before it is started", () => {
    expect(elapsedSeconds(resetTimer(), t0)).toBe(0);
  });

  it("counts wall-clock time while running", () => {
    const state = startTimer(resetTimer(), t0);
    expect(elapsedSeconds(state, t0 + 5_000)).toBe(5);
  });

  it("counts time that passed while the screen was locked", () => {
    // The defining case: no ticks fire for ten minutes, yet the time is real.
    const state = startTimer(resetTimer(), t0);
    expect(elapsedSeconds(state, t0 + 10 * 60_000)).toBe(600);
  });

  it("stops accruing once paused", () => {
    const running = startTimer(resetTimer(), t0);
    const paused = pauseTimer(running, t0 + 30_000);
    expect(elapsedSeconds(paused, t0 + 90_000)).toBe(30);
  });

  it("accumulates across a pause and resume", () => {
    let state: TimerState = startTimer(resetTimer(), t0);
    state = pauseTimer(state, t0 + 30_000);
    state = startTimer(state, t0 + 100_000);
    expect(elapsedSeconds(state, t0 + 115_000)).toBe(45);
  });

  it("ignores a second start while already running", () => {
    let state = startTimer(resetTimer(), t0);
    state = startTimer(state, t0 + 10_000);
    expect(elapsedSeconds(state, t0 + 20_000)).toBe(20);
  });

  it("ignores a pause while already paused", () => {
    let state = startTimer(resetTimer(), t0);
    state = pauseTimer(state, t0 + 10_000);
    state = pauseTimer(state, t0 + 50_000);
    expect(elapsedSeconds(state, t0 + 99_000)).toBe(10);
  });

  it("resets back to zero and stopped", () => {
    startTimer(resetTimer(), t0);
    const state = resetTimer();
    expect(state.running).toBe(false);
    expect(elapsedSeconds(state, t0 + 60_000)).toBe(0);
  });

  it("never reports negative time if the device clock moves backwards", () => {
    const state = startTimer(resetTimer(), t0);
    expect(elapsedSeconds(state, t0 - 10_000)).toBe(0);
  });
});
