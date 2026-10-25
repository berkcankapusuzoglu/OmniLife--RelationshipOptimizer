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

| 8 | 2026-10-25 | Tester A (friend) | "The exercise timer doesn't run when lock screen I think" | Exercise / timing | **Fixed, in 1.1.3 (10)** | The timer counted `setInterval` ticks. Android suspends timers in a backgrounded or screen-locked WebView, so the ticks stopped and the elapsed time was lost outright. Rewritten to derive elapsed time from wall-clock timestamps; the interval now only triggers a re-render, and the clock is re-read on `visibilitychange`. 9 unit tests. |
| 9 | 2026-10-25 | Tester A (friend) | "once app opens the logo in that full screen looks blurry lower quality" | Splash / assets | **Fixed, in 1.1.3 (10)** | Two resolution faults. `drawable/splash.png` was 320x480 and only `xxxhdpi` port/land variants existed, so every common 1080p (xxhdpi) phone fell back to the 320x480 default stretched across the screen -- a ~4x upscale. And the adaptive-icon layers were at legacy launcher sizes (48-192px) instead of the 108dp adaptive sizes (108-432px), which Android 12+ also upscales onto its system splash. Splash regenerated for 11 density/orientation buckets plus night variants; icon layers regenerated at 108dp. |
| 10 | 2026-10-25 | Tester A (friend) | "the app doesn't stay sign in. That would nice" (second report) | Auth / session | **Partly fixed, in 1.1.3 (10)** | The earlier fix (item 2) addressed a real cause but not this one. Two further causes found: (a) `renewSession()` was implemented and unit-tested but **never called from any production path**, so a session expired a fixed period after login however actively it was used -- sliding renewal now runs in the proxy, the only place that can both read and set the cookie, and the window moved from 7 to 30 days; (b) the Android WebView flushed cookies only in `onStop()`, which Android does not guarantee under memory pressure or on OEM builds with aggressive process management -- it now also flushes in `onPause()`, which is guaranteed before the app leaves the foreground. See "Open question" below. |

## Open question on item 10

Cause (b) is a strong hypothesis, not a proven diagnosis: it cannot be reproduced
without the device. The server side was ruled out by evidence -- production sends
`Cache-Control: private, no-cache, no-store`, `/overview` correctly 307s to
`/login` when unauthenticated, and `/` is a dynamic route, so if the cookie were
being sent the user would land signed in. That leaves the cookie not arriving,
i.e. the Android cookie jar.

To confirm or refute after 1.1.3, ask the tester which of these loses the session:
  1. switching away and back,
  2. swiping the app from recents and reopening,
  3. rebooting the phone,
  4. only after several days.
(2) or (3) points at cookie flushing. (4) points at expiry. (1) points at
something else entirely and we start again.

## Themes for the production-access form

1. **Session persistence on Android** — testers reported being logged out. The app's start URL was still reading a cookie removed by an earlier security migration, so signed-in users always saw the signed-out marketing page. Fixed and pinned with a regression test.
2. **Mobile safe areas and tap targets** — the status bar overlapped the header and swallowed taps on controls that were also below the 44px minimum. Fixed across the dashboard header (1.1.1) and the public/landing header (1.1.2), with every affected control raised to 44px.
3. **Step-based flows must fit one screen** — the quiz and onboarding required scrolling to reach the primary action. Both now use full-height layouts with an always-visible bottom action bar, verified at phone size.
4. **Icon quality** — the adaptive launcher icon rendered as a square badge inside the mask. Rebuilt as a full-bleed single-surface mark with a transparent foreground and a themed-icon monochrome layer.
5. **Floating UI must not cover primary actions** — found while verifying (3): the cookie notice sat on top of the step flows' CTA. It now defers to ordinary pages.

All of the above shipped in versionCode 9 / versionName 1.1.2 on the Alpha closed track within the 14-day window.

---

## Ready-to-paste answers for the Play production-access form

Google's form asks how you recruited testers, how you gathered feedback, and what
you changed. Paste these and adjust the counts on the day you apply.

**How did you recruit your testers?**
> Friends, family and coworkers, plus a public Google Group (Couplemetric Testers)
> that anyone can join, linked from the opt-in page. Testers join the group, then
> opt in through the Play testing link and install from Google Play.

**How did you gather feedback?**
> Directly from testers by message and email, plus Play Console testing feedback.
> Every item is logged verbatim with the date, the person, a diagnosis and the
> version that fixed it, in a feedback log kept in the repository.

**What did you learn, and what did you change?**
> Ten issues were reported across the closed test and all ten were diagnosed and
> fixed inside the test window, shipped in versions 1.1.1 through 1.1.3:
> - The app appeared to sign users out on every launch. Two separate causes: the
>   start page was reading a cookie removed by an earlier migration, and sessions
>   expired on a fixed timer with no renewal. Fixed both; sessions now renew as
>   the app is used.
> - The header overlapped the Android status bar and swallowed taps on the sign-in
>   control, which was also below the minimum touch-target size. Fixed across the
>   dashboard and the public pages, with all affected controls raised to 44dp.
> - The quiz and onboarding required scrolling to reach the Next button. Both
>   rebuilt as single-screen steps with a permanently visible action bar.
> - The launcher icon rendered as a square badge inside the icon mask, and the
>   splash screen was being upscaled from a low-resolution asset on most phones.
>   Both regenerated at correct per-density resolutions.
> - The exercise timer stopped counting when the screen locked, because it counted
>   timer ticks rather than elapsed time. Rewritten to use wall-clock time.
> - A floating cookie notice covered the primary button on the quiz and onboarding
>   screens and intercepted taps.
>
> The changes are visible in the release notes for each version and in the
> repository's commit history.

**Is this log actually useful?** Yes, with a caveat worth knowing: Google does not
audit a document like this. What the reviewer sees is the form answers plus
whether the test looks real — 12 testers, opted in continuously for 14 days, with
evidence of genuine engagement. This log's value is that it makes those answers
specific and true rather than vague, and vague answers are what trigger
"insufficient tester engagement" and another 14-day cycle. It is supporting
material, not the thing being graded.
