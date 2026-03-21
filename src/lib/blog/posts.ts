export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  author: string;
  tags: string[];
  readingTime: string;
  content: string; // HTML string with Tailwind prose classes
}

export const blogPosts: BlogPost[] = [
  {
    slug: "science-behind-relationship-scoring",
    title: "The Science Behind Relationship Scoring",
    description:
      "Discover how OmniLife uses 9 weighted dimensions, multi-objective optimization, and the Pareto frontier to produce a single relationship score that actually means something.",
    date: "2026-03-18",
    author: "OmniLife Research Team",
    tags: ["relationship score", "data science", "couples assessment"],
    readingTime: "7 min read",
    content: `
<p>Most couples apps give you a vague thumbs-up or a mood emoji. OmniLife takes a fundamentally different approach: we treat your relationship the way an engineer treats a complex system — with measurable inputs, transparent weights, and a score you can act on.</p>

<h2>The 9 Dimensions We Measure</h2>

<p>Every daily check-in feeds data into <strong>nine distinct dimensions</strong> grouped into two layers. The first layer — your <em>Life Score</em> — captures four pillars that research shows are prerequisites for healthy partnerships:</p>

<ul>
  <li><strong>Vitality</strong> — sleep quality, exercise, energy level. When your body is running on fumes, empathy is the first thing to go.</li>
  <li><strong>Growth</strong> — learning, career momentum, creative output. Stagnation breeds resentment; growth breeds generosity.</li>
  <li><strong>Security</strong> — financial stability, routine consistency. Chronic money stress is cited in over 35% of divorces.</li>
  <li><strong>Connection</strong> — social engagement, community, friendship outside the couple. Isolation makes partners over-rely on each other.</li>
</ul>

<p>The second layer — your <em>Relationship Score</em> — measures five dimensions drawn from clinical psychology and attachment theory:</p>

<ul>
  <li><strong>Emotional Responsiveness</strong> — how quickly and sensitively partners respond to bids for connection, a concept pioneered by Dr. John Gottman.</li>
  <li><strong>Trust &amp; Safety</strong> — perceived reliability, honesty, and psychological safety in the partnership.</li>
  <li><strong>Fairness &amp; Equity</strong> — the balance of labor, decision-making power, and compromise.</li>
  <li><strong>Stress Regulation</strong> — how effectively the couple manages external stressors without turning them inward.</li>
  <li><strong>Autonomy Respect</strong> — space for individual identity, hobbies, and boundaries within the relationship.</li>
</ul>

<h2>Weighted Scoring: Not All Dimensions Are Equal</h2>

<p>A flat average across nine dimensions would be misleading. Research tells us that trust erosion harms a relationship more quickly than, say, a dip in exercise habits. OmniLife applies <strong>configurable weights</strong> — default values drawn from meta-analyses — so the final number reflects severity, not just magnitude.</p>

<p>Your Life Score is the weighted average of the four pillars, scaled to 0-100. Your Relationship Score is the weighted average of the five relational dimensions, also 0-100. The two combine via a tunable alpha/beta blend into a single <strong>Total Quality</strong> score.</p>

<h2>Penalties: When Something Is Seriously Wrong</h2>

<p>Raw averages can hide problems. A couple might score 9/10 on four dimensions but 2/10 on trust. The average looks fine; the relationship is not. OmniLife applies three penalty functions:</p>

<ol>
  <li><strong>Redline Penalties</strong> — if any dimension drops below a critical threshold, a quadratic penalty kicks in. This models the clinical reality that a single severe deficit can outweigh many strengths.</li>
  <li><strong>Imbalance Penalties</strong> — high variance across dimensions triggers a correction. A relationship that is wildly uneven is less stable than one that is uniformly moderate.</li>
  <li><strong>Budget Overrun Penalties</strong> — when time or financial constraints are violated, the score reflects the real-world pressure those overruns create.</li>
</ol>

<h2>The Pareto Frontier: Optimizing Trade-offs</h2>

<p>In multi-objective optimization, the <strong>Pareto frontier</strong> is the set of solutions where you cannot improve one objective without worsening another. OmniLife borrows this concept: your ideal state is the point on the frontier where life satisfaction and relationship satisfaction are both maximized — without sacrificing either.</p>

<p>The scoring engine identifies where you sit relative to that frontier and recommends the smallest changes that move you toward it. This is why the couples assessment in OmniLife feels different: it is not just a snapshot, it is a direction vector.</p>

<h2>Why a Single Number Matters</h2>

<p>Skeptics ask: can you really reduce a relationship to a number? The answer is nuanced. The number is not the relationship — it is a <em>compass bearing</em>. It tells you whether things are improving, stable, or declining. It removes the guesswork from "are we doing okay?" and replaces it with data you can discuss together.</p>

<p>The relationship score becomes most powerful when tracked over time. A single data point is interesting; a trend line is actionable. OmniLife's weekly review shows you that trend and connects it to specific behaviors, exercises, and life events.</p>

<p>If you are curious what your baseline looks like, <a href="/quiz" class="text-primary underline">take our free relationship quiz</a> and see your first score in under five minutes.</p>
`,
  },
  {
    slug: "why-most-couples-apps-fail",
    title: "Why Most Couples Apps Fail (And What We Do Differently)",
    description:
      "The couples app market is littered with abandoned downloads. Here is why most fail and how OmniLife's relationship optimizer avoids their mistakes.",
    date: "2026-03-15",
    author: "OmniLife Research Team",
    tags: ["couples app", "product design", "relationship optimizer"],
    readingTime: "6 min read",
    content: `
<p>There are dozens of couples apps on the market. Most follow the same playbook: daily questions, a shared journal, maybe a date-night generator. Downloads spike after launch, engagement craters within two weeks, and the app joins the graveyard of good intentions. Why?</p>

<h2>Problem 1: No Feedback Loop</h2>

<p>Most couples apps collect input but never close the loop. You answer questions, but nothing measurable changes. There is no score, no trend, no clear signal that your effort is working. Humans are wired to repeat behaviors that produce visible results. Without a feedback loop, motivation dies.</p>

<p>OmniLife closes the loop with a <strong>daily relationship score</strong> and a weekly trend review. Every check-in moves a number. Every exercise has a measurable impact. You can see, concretely, that the 10 minutes you spent on a gratitude exercise this morning moved your emotional responsiveness score up by 0.3 points.</p>

<h2>Problem 2: One-Size-Fits-All Content</h2>

<p>A couple navigating a newborn's first months has radically different needs than a couple in a long-distance phase or one where a partner is deep in exam season. Generic advice — "plan a date night!" — is tone-deaf when you are sleep-deprived and haven't showered in two days.</p>

<p>OmniLife's <strong>scenario modes</strong> adapt every recommendation to your current life context. The app knows that during crisis mode, exercises should be short, low-energy, and focused on stress regulation. During a growth phase, it can push more ambitious connection-building activities.</p>

<h2>Problem 3: Ignoring Individual Well-Being</h2>

<p>Relationship health does not exist in a vacuum. If one partner is burnt out, anxious, or financially stressed, no amount of couples exercises will fix the relationship. Most couples apps treat the relationship as an isolated system.</p>

<p>OmniLife measures <strong>both individual life quality and relationship quality</strong>. The four life pillars — vitality, growth, security, connection — feed directly into the relationship assessment. The app might recommend that the best thing you can do for your relationship today is go for a run or sort out that overdue bill.</p>

<h2>Problem 4: No Accountability Structure</h2>

<p>Journaling apps rely on intrinsic motivation. That works for about 8% of the population. The rest of us need structure: reminders, streaks, partner challenges, and visible consequences for skipping.</p>

<p>OmniLife builds accountability into the system. Daily logs feed the scoring engine. Missed days are visible in your trend line. Partner challenges create gentle social pressure. The weekly review is a natural checkpoint that both partners can discuss over coffee.</p>

<h2>Problem 5: Privacy Concerns Kill Honesty</h2>

<p>If both partners can see every answer in real time, honesty evaporates. Nobody will rate their satisfaction with equity as a 3/10 if their partner is watching the screen. Most couples apps either force full transparency or ignore the problem.</p>

<p>OmniLife keeps <strong>individual logs private by default</strong>. The shared view shows aggregated scores and trends, not raw answers. This lets each partner be honest without fear of triggering a fight. When both people are honest, the data is useful. When they are performing, it is noise.</p>

<h2>What a Relationship Optimizer Actually Looks Like</h2>

<p>The term "relationship optimizer" sounds clinical, but the experience is not. It is a five-minute daily check-in, a curated exercise matched to your current needs, and a weekly conversation starter backed by real data. The math runs silently in the background. What you see is clarity.</p>

<p>The difference between OmniLife and a typical couples app is the difference between a fitness tracker and a motivational poster. Both want you to be healthier. Only one gives you data you can act on.</p>

<p>Ready to see the difference? <a href="/register" class="text-primary underline">Create a free account</a> and run your first couples assessment today.</p>
`,
  },
  {
    slug: "scenario-modes-navigate-life-challenges",
    title: "How to Use Scenario Modes to Navigate Life's Challenges",
    description:
      "Exam season, a new baby, a long-distance stretch — life throws curveballs. Learn how OmniLife's scenario modes adapt your relationship plan to what's actually happening.",
    date: "2026-03-12",
    author: "OmniLife Research Team",
    tags: ["scenario modes", "relationship optimizer", "couples app"],
    readingTime: "7 min read",
    content: `
<p>Life is not steady-state. Some months are calm; others feel like everything is on fire at once. A relationship strategy that works during a peaceful summer will fail spectacularly during exam season, a cross-country move, or the first weeks with a newborn. OmniLife's <strong>scenario modes</strong> solve this by dynamically adjusting your scoring weights, exercise recommendations, and daily expectations.</p>

<h2>The Six Built-In Modes</h2>

<p>OmniLife ships with six scenario presets, each designed around a specific life phase:</p>

<h3>1. Default Mode</h3>
<p>Balanced weights across all dimensions. Use this when life is relatively stable and you want general relationship optimization. The scoring engine treats all nine dimensions with their standard research-backed weights.</p>

<h3>2. Exam / High-Pressure Mode</h3>
<p>When one or both partners are under academic or professional pressure, this mode shifts weight toward <strong>stress regulation</strong> and <strong>autonomy respect</strong>. It reduces the penalty for lower connection scores (you are busy, not neglectful) and recommends shorter exercises — five minutes or less — focused on quick emotional check-ins rather than deep conversations.</p>

<h3>3. Newborn Mode</h3>
<p>Sleep deprivation changes everything. Newborn mode heavily weights <strong>vitality</strong> and <strong>fairness</strong> — the two dimensions most disrupted by a new baby. Exercise recommendations shift to micro-moments: a 60-second appreciation text, a two-minute shoulder rub, a simple "I see how hard you're working" acknowledgment. The bar is lower, but clearing it still counts.</p>

<h3>4. Crisis Mode</h3>
<p>Financial emergencies, health scares, family conflicts — crisis mode activates when external stressors are overwhelming. It maximizes weight on <strong>trust</strong> and <strong>stress regulation</strong> while temporarily reducing growth expectations. The app's tone shifts: fewer aspirational prompts, more stabilization exercises. The goal is survival with dignity, not optimization.</p>

<h3>5. Long-Distance Mode</h3>
<p>Physical separation creates unique challenges. Long-distance mode increases weight on <strong>emotional responsiveness</strong> and <strong>connection</strong> while adjusting fairness metrics to account for asymmetric daily routines. Recommended exercises emphasize asynchronous bonding: shared playlists, video-call rituals, written reflections exchanged at the end of each day.</p>

<h3>6. Recovery Mode</h3>
<p>After a major conflict or breach of trust, recovery mode applies heightened weight to <strong>trust and safety</strong> with elevated redline thresholds. It recommends structured repair conversations, accountability check-ins, and gradual trust-rebuilding exercises drawn from clinical repair frameworks.</p>

<h2>How Weight Adjustments Work</h2>

<p>Each scenario mode stores a set of <strong>weight overrides</strong> as a JSON profile. When active, these overrides replace the default weights in the scoring engine. The Total Quality formula remains the same — weighted average minus penalties — but the weights shift to reflect current priorities.</p>

<p>For example, in Exam Mode, the autonomy respect weight might increase from 0.18 to 0.28, while the connection weight drops from 0.22 to 0.14. The relationship score now rewards giving each other space rather than penalizing reduced quality time.</p>

<h2>Creating Custom Scenarios</h2>

<p>The six presets cover common phases, but your life may not fit neatly into a box. OmniLife lets you create <strong>custom scenario profiles</strong> with your own weight distributions. Moving to a new city? Blend elements of crisis mode and long-distance mode. Starting a business together? Combine growth emphasis with stress regulation focus.</p>

<h2>When to Switch Modes</h2>

<p>The app does not switch modes automatically — that is a deliberate design choice. Scenario changes should be a <strong>conscious conversation</strong> between partners. "Hey, exams start next week — should we switch to exam mode?" That conversation itself is a relationship-building moment.</p>

<p>OmniLife will suggest a mode switch when your score patterns match a known scenario signature (e.g., vitality scores dropping suddenly often correlates with a new-baby or crisis phase), but the final decision is always yours.</p>

<p>Scenario modes are available on all plans. <a href="/register" class="text-primary underline">Sign up free</a> and explore which mode fits your current chapter.</p>
`,
  },
  {
    slug: "psychology-of-relationship-exercises",
    title: "The Psychology of Relationship Exercises",
    description:
      "From Gottman's Love Maps to Self-Determination Theory, here is the research behind every exercise OmniLife recommends — and why they work.",
    date: "2026-03-08",
    author: "OmniLife Research Team",
    tags: ["psychology", "relationship quiz", "Gottman", "couples assessment"],
    readingTime: "8 min read",
    content: `
<p>When OmniLife recommends an exercise, it is not pulling from a generic list of "things couples should do." Every recommendation is grounded in at least one of three major psychological frameworks, selected because your current scores indicate it will move the needle. Here is the research behind the system.</p>

<h2>Framework 1: The Gottman Method</h2>

<p>Dr. John Gottman spent four decades studying couples in his "Love Lab" at the University of Washington. His research identified specific, observable behaviors that predict relationship success or failure with over 90% accuracy. Three of his concepts are central to OmniLife's exercise library:</p>

<h3>Bids for Connection</h3>
<p>A bid is any attempt to connect — a question, a touch, a sigh, a shared observation. Gottman found that in stable relationships, partners respond to bids positively ("turning toward") about 86% of the time. In relationships that eventually dissolve, that number drops to 33%.</p>

<p>OmniLife's <strong>emotional responsiveness</strong> dimension tracks this directly. When your score is low, the app recommends "bid awareness" exercises: structured prompts to notice and respond to your partner's bids throughout the day. These are small — a text reply, a moment of eye contact — but the data shows they compound dramatically.</p>

<h3>Love Maps</h3>
<p>A Love Map is Gottman's term for the mental model you hold of your partner's inner world — their fears, dreams, stressors, and joys. Couples with detailed Love Maps navigate conflict better because they understand the emotional landscape behind their partner's reactions.</p>

<p>OmniLife includes Love Map exercises: structured question exchanges designed to update and deepen your knowledge of each other. These appear more frequently when your <strong>trust and safety</strong> score is moderate but your <strong>emotional responsiveness</strong> is lagging — a pattern that suggests familiarity without intimacy.</p>

<h3>The Four Horsemen</h3>
<p>Criticism, contempt, defensiveness, and stonewalling — Gottman's "Four Horsemen of the Apocalypse" — are the most reliable predictors of relationship failure. OmniLife's scoring engine detects patterns associated with these behaviors (rising stress scores combined with falling fairness and trust) and recommends targeted antidotes: gentle start-ups instead of criticism, appreciation exercises to counter contempt, responsibility-taking prompts for defensiveness, and self-soothing techniques for stonewalling.</p>

<h2>Framework 2: Attachment Theory</h2>

<p>Developed by John Bowlby and expanded by Sue Johnson into Emotionally Focused Therapy (EFT), attachment theory holds that adult romantic bonds follow the same patterns as infant-caregiver bonds. Secure attachment — the feeling that your partner is a reliable safe haven — is the foundation of relationship satisfaction.</p>

<p>OmniLife's <strong>trust and safety</strong> dimension is a direct measure of attachment security. When this score drops, the recommendation engine prioritizes exercises that rebuild felt safety: vulnerability exchanges, consistent small gestures (the "daily deposit"), and structured conversations about needs and fears.</p>

<p>The couples assessment in OmniLife does not measure attachment style directly — that requires clinical instruments — but it tracks the <em>behavioral outputs</em> of attachment patterns. A partner who scores high on autonomy but low on emotional responsiveness may be exhibiting avoidant patterns. The exercises adapt accordingly, gently encouraging connection without overwhelming the avoidant partner's need for space.</p>

<h2>Framework 3: Self-Determination Theory (SDT)</h2>

<p>SDT, developed by Deci and Ryan, identifies three universal psychological needs: <strong>autonomy</strong>, <strong>competence</strong>, and <strong>relatedness</strong>. When all three are met within a relationship, intrinsic motivation flourishes — partners <em>want</em> to invest in the relationship, rather than feeling obligated.</p>

<p>OmniLife maps these needs directly:</p>

<ul>
  <li><strong>Autonomy</strong> → the autonomy respect dimension. Exercises that protect individual identity: solo hobby time, boundary-setting conversations, independent goal tracking.</li>
  <li><strong>Competence</strong> → the growth pillar. Exercises that build shared skills: cooking a new recipe together, learning a language, tackling a home project. Mastery experiences strengthen the partnership.</li>
  <li><strong>Relatedness</strong> → the connection pillar and emotional responsiveness dimension. Exercises that deepen belonging: shared rituals, gratitude practices, physical affection prompts.</li>
</ul>

<h2>How the Recommendation Engine Selects Exercises</h2>

<p>The engine follows a priority-ordered rule set. It examines your current scores, identifies which dimensions are lowest relative to their weighted importance, and maps those deficits to exercises from the relevant psychological framework. It also factors in the active scenario mode — crisis mode prefers short, stabilizing exercises; default mode allows longer, deeper activities.</p>

<p>The result is a relationship quiz that does not just tell you how you are doing — it tells you exactly what to do next, and <em>why</em> that specific exercise was chosen for you.</p>

<p>Curious about your current profile? <a href="/quiz" class="text-primary underline">Take the free relationship quiz</a> and get your first personalized recommendation in minutes.</p>
`,
  },
  {
    slug: "understanding-your-relationship-score",
    title: "Understanding Your Relationship Score: A Complete Guide",
    description:
      "Your OmniLife score is more than a number. This guide explains how to read it, what the penalties mean, and exactly what to improve first.",
    date: "2026-03-05",
    author: "OmniLife Research Team",
    tags: ["relationship score", "guide", "relationship quiz"],
    readingTime: "7 min read",
    content: `
<p>You have taken the relationship quiz, submitted your first daily log, and now you are staring at a number. Maybe it is 72. Maybe it is 45. What does it mean? This guide breaks down every component of your OmniLife relationship score so you know exactly where you stand and what to do about it.</p>

<h2>The Three Numbers That Matter</h2>

<p>Your dashboard shows three primary scores:</p>

<h3>Life Score (0-100)</h3>
<p>This is the weighted average of your four life pillars: vitality, growth, security, and connection. Each pillar is rated 1-10 in your daily log, then combined using weights that reflect their relative importance to relationship health. The result is scaled to 0-100.</p>

<p>A Life Score above 70 means your individual foundation is solid. Below 50 signals that personal stressors are likely bleeding into your relationship. The most common culprit? Security — financial stress or chaotic routines.</p>

<h3>Relationship Score (0-100)</h3>
<p>The weighted average of five relationship dimensions: emotional responsiveness, trust, fairness, stress regulation, and autonomy. Same 1-10 input, same weighted combination.</p>

<p>A Relationship Score above 75 indicates a healthy partnership by clinical standards. Between 50-75 is the improvement zone — things are functional but there are clear areas to work on. Below 50 suggests significant distress in at least one dimension.</p>

<h3>Total Quality (0-100)</h3>
<p>The headline number. Total Quality blends your Life Score and Relationship Score using a tunable alpha/beta ratio (default: 40% life, 60% relationship), then subtracts any active penalties. This is the number that captures your overall relationship health in a single figure.</p>

<h2>Understanding Penalties</h2>

<p>Penalties are what make OmniLife's couples assessment smarter than a simple average. Three types of penalties can reduce your Total Quality score:</p>

<h3>Redline Penalties</h3>
<p>If any single dimension drops below its critical threshold (typically 3/10), a quadratic penalty activates. Quadratic means the penalty grows faster as the score gets worse. A dimension at 3 might cost you 2 points; a dimension at 1 costs you 8.</p>

<p>This models a clinical truth: a relationship with one catastrophically low dimension is in more trouble than the average suggests. If your trust score is 2/10 but everything else is 8/10, the raw average says you are fine. The redline penalty says you are not.</p>

<h3>Imbalance Penalties</h3>
<p>High variance across your dimensions triggers this penalty. If your scores are [9, 9, 9, 2, 9], the imbalance penalty fires even though the average is high. A relationship that is excellent in four areas but failing in one is less stable than a relationship that is uniformly 7/10 across the board.</p>

<h3>Budget Overrun Penalties</h3>
<p>If you have set time or financial constraints in your profile and your logged activities exceed them, a linear penalty applies. This reflects the real-world impact of overcommitting — spending three hours on a relationship exercise when you have a deadline tomorrow creates more stress than it resolves.</p>

<h2>Reading Your Trend Line</h2>

<p>A single score is a snapshot. The weekly trend view is where insight lives. Look for these patterns:</p>

<ul>
  <li><strong>Steady upward trend</strong> — your exercises and daily practices are working. Stay the course.</li>
  <li><strong>Plateau</strong> — you have optimized the easy wins. Time to address a dimension you have been avoiding.</li>
  <li><strong>Sudden drop</strong> — something changed. Check which dimension fell. External stressor? Consider switching scenario modes. Internal conflict? The app will recommend repair exercises.</li>
  <li><strong>Oscillating</strong> — scores swinging wildly day-to-day usually indicate inconsistent effort or an unresolved conflict that flares and fades. The imbalance penalty will reflect this.</li>
</ul>

<h2>What to Improve First</h2>

<p>The recommendation engine handles prioritization, but here is the logic if you want to understand it:</p>

<ol>
  <li><strong>Fix redlines first.</strong> Any dimension below the critical threshold should be your immediate focus. Penalties from redlines are the most expensive.</li>
  <li><strong>Address the lowest-weighted-score dimension.</strong> This is the dimension where the gap between your score and the ideal is largest after accounting for weights.</li>
  <li><strong>Reduce imbalance.</strong> Once no dimension is in crisis, bring your lower scores closer to your higher ones. Consistency matters more than peaks.</li>
  <li><strong>Optimize from the Pareto frontier.</strong> When all dimensions are healthy, the engine suggests micro-improvements that push you closer to the theoretical maximum without creating trade-offs.</li>
</ol>

<h2>Sharing Scores With Your Partner</h2>

<p>OmniLife shows each partner their own scores by default. The shared dashboard displays <em>combined</em> trends — an average of both partners' inputs — without revealing individual answers. This protects honesty while enabling joint reflection.</p>

<p>During your weekly review, we recommend discussing the trend direction rather than the absolute number. "Our trust score has been climbing for three weeks" is a more productive conversation starter than "Your trust score is only 6."</p>

<p>If you have not started tracking yet, the fastest way to get your baseline is the <a href="/quiz" class="text-primary underline">free relationship quiz</a>. It takes under five minutes and gives you all three scores immediately.</p>
`,
  },
];

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
