# Couplemetric closed-test feedback log

Verbatim tester feedback with triage and what we shipped in response. This is the
evidence source for the Play production-access questionnaire ("What feedback did you
receive and what changes did you make?"). Keep entries verbatim; add the fix + ship
date as each one lands.

Closed test (track Alpha) went active 2026-10-20. 14-day window: 2026-10-20 → 2026-11-03.

| # | Date | Tester | Feedback (verbatim) | Category | Status | Change made |
|---|---|---|---|---|---|---|
| 1 | 2026-10-20 | Owner (device test) | "Header overlaps the phone status bar" | Layout / safe area | Fixed, live | `globals.css` `.safe-top`/`.safe-bottom` and fixed bottom bars now use `max(env(safe-area-inset-*), var(--safe-area-inset-*))` because Capacitor 8 on Android reports insets as CSS variables, not `env()`. Commit `4f80846`. |
| 2 | 2026-10-23 | Tester A (friend) | "Not keeping logged in" | Auth / session persistence | Open | Session cookie survives app close via `CookieManager` flush in `MainActivity`; investigating whether the 7-day signed cookie is being dropped by the WebView after the domain move to couplemetric.app. |
| 3 | 2026-10-23 | Tester A (friend) | "Log in button on top doesn't work and its so high.." | Auth + layout | Open | Two issues: the top-right Log in link is unresponsive, and it sits under/too close to the status bar on the public (marketing) layout — the safe-area fix covered the dashboard header, not the public header. |
| 4 | 2026-10-23 | Tester A (friend) | "The quiz and get started etc UI is bad because user need to scroll down to click next, it should fit the full screen and no scrolling needed.." | Onboarding / quiz UX | Open | Quiz and onboarding steps must fit `100dvh` with the primary action always visible (sticky footer CTA), no scroll to reach Next. |
| 5 | 2026-10-23 | Tester A (friend) | "App icon doesn't look professional. It shouldnt have the square inside with different color the whole circle should look smooth one color like libby, spotify and many other apps" | Branding / icon | Open | Redesign the launcher icon as a single flat mark on one smooth background, no inner square, and regenerate all densities + the Play listing icon. |

## Themes for the production-access form

1. **Session persistence on Android** — testers reported being logged out; fixing cookie/session lifetime in the WebView.
2. **Mobile safe areas and tap targets** — status-bar overlap and an unresponsive header control; one fix shipped, public layout still to do.
3. **Step-based flows must fit one screen** — quiz and onboarding require scrolling to reach the primary action; moving to full-height layouts with a sticky CTA.
4. **Icon quality** — launcher icon reads as unprofessional; redesigning to a single-surface mark.
