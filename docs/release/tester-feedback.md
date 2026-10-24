# Couplemetric closed-test feedback log

Verbatim tester feedback with triage and what we shipped in response. This is the
evidence source for the Play production-access questionnaire ("What feedback did you
receive and what changes did you make?"). Keep entries verbatim; add the fix + ship
date as each one lands.

Closed test (track Alpha) went active 2026-10-20. 14-day window: 2026-10-20 → 2026-11-03.

| # | Date | Tester | Feedback (verbatim) | Category | Status | Change made |
|---|---|---|---|---|---|---|
| 1 | 2026-10-20 | Owner (device test) | "Header overlaps the phone status bar" | Layout / safe area | Fixed, live | `globals.css` `.safe-top`/`.safe-bottom` and fixed bottom bars now use `max(env(safe-area-inset-*), var(--safe-area-inset-*))` because Capacitor 8 on Android reports insets as CSS variables, not `env()`. Commit `4f80846`. |
| 2 | 2026-10-23 | Tester A (friend) | "Not keeping logged in" | Auth / session persistence | **Fixed, in 1.1.2 (9)** | The landing page is the app's start URL and still read the pre-migration unsigned `session` cookie, which no longer exists after the HMAC `session_token` migration, so the redirect never fired and every launch showed the marketing page with "Log in" — indistinguishable from being signed out. Now uses `getSession()` → `/overview`, with a regression test. |
| 3 | 2026-10-23 | Tester A (friend) | "Log in button on top doesn't work and its so high.." | Auth + layout | **Fixed, in 1.1.2 (9)** | One root cause: the landing `<nav>` had no `safe-top`, so it sat under the Android status bar, which also swallowed the taps; the buttons were 28px tall, below the 44px touch minimum. Added `safe-top` and 44px nav buttons. |
| 4 | 2026-10-23 | Tester A (friend) | "The quiz and get started etc UI is bad because user need to scroll down to click next, it should fit the full screen and no scrolling needed.." | Onboarding / quiz UX | **Fixed, in 1.1.2 (9)** | `/quiz` was rendering its own full-height flow *inside* the shared public header and footer, so every step was taller than the screen. It now owns its chrome; each screen is exactly one viewport with a shrinkable body and an always-visible bottom action bar. Onboarding's Back/Next row is sticky for the same reason. Verified at 412x915: intro, Q1 and Q5 all fit with no scrolling. |
| 5 | 2026-10-23 | Tester A (friend) | "App icon doesn't look professional. It shouldnt have the square inside with different color the whole circle should look smooth one color like libby, spotify and many other apps" | Branding / icon | **Fixed, in 1.1.2 (9)** | The adaptive icon inset the *background* layer by 16.7% and shipped an *opaque* foreground (dark gradient square on flat purple), so the launcher mask revealed a square badge. Background is now full-bleed flat brand, foreground is the glyph on transparency, plus a monochrome layer for themed icons. Web/PWA/maskable icons regenerated from the same glyph. |

| 6 | 2026-10-23 | Found verifying #4 | (not reported — caught on a phone viewport while fixing the quiz) | Overlay collision | **Fixed, in 1.1.2 (9)** | The floating cookie notice is fixed to the bottom of the screen, exactly where the step flows pin their CTA, so it covered "Start Quiz" / "Next" and intercepted taps. It now waits until the user is on an ordinary page; its button is a 44px target. |
| 7 | 2026-10-23 | Found verifying #2 | (not reported) | Stale domain | **Fixed, in 1.1.2 (9)** | The bundled offline fallback page's Retry link still pointed at the old Vercel origin instead of couplemetric.app. |

## Themes for the production-access form

1. **Session persistence on Android** — testers reported being logged out. The app's start URL was still reading a cookie removed by an earlier security migration, so signed-in users always saw the signed-out marketing page. Fixed and pinned with a regression test.
2. **Mobile safe areas and tap targets** — the status bar overlapped the header and swallowed taps on controls that were also below the 44px minimum. Fixed across the dashboard header (1.1.1) and the public/landing header (1.1.2), with every affected control raised to 44px.
3. **Step-based flows must fit one screen** — the quiz and onboarding required scrolling to reach the primary action. Both now use full-height layouts with an always-visible bottom action bar, verified at phone size.
4. **Icon quality** — the adaptive launcher icon rendered as a square badge inside the mask. Rebuilt as a full-bleed single-surface mark with a transparent foreground and a themed-icon monochrome layer.
5. **Floating UI must not cover primary actions** — found while verifying (3): the cookie notice sat on top of the step flows' CTA. It now defers to ordinary pages.

All of the above shipped in versionCode 9 / versionName 1.1.2 on the Alpha closed track within the 14-day window.
