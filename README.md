# lc-retention

> *Spaced repetition for competitive programmers. Built on top of LeetCode.*

Most people solve a problem, feel good about it, and forget it within a week. Two months later they see the same pattern in a contest and go blank. `lc-retention` fixes this — it tracks every problem you solve, computes a personalized review schedule using a modified SM-2 algorithm, and surfaces problems right before your memory of them fades.

---

## What it does

- **Tracks every LeetCode submission** automatically — no manual input required
- **Computes a personalized review schedule** for each problem based on how hard it was *for you specifically*, not just its global difficulty rating
- **Surfaces problems due for review** in a clean popup with tag-level breakdown
- **Closes the feedback loop** — when you review a problem, you rate your recall, and the algorithm updates your schedule accordingly
- **Shows your retention health** across topics — see that your DP retention is 41% while Binary Search is 71%
- **Heatmap and streak tracking** — visual proof of consistent effort over time

---

## How it works

### The core problem

Standard spaced repetition tools (Anki, SuperMemo) treat all cards as equally difficult. LeetCode problems are not equal. A problem rated 1800 might be trivial for you in graphs but hard in DP. Your memory retention depends on:

- How many attempts you needed before AC
- How hard the problem was relative to your current skill level
- Whether you understood it or pattern-matched it
- How long ago you solved it

A fixed interval scheduler can't capture this. `lc-retention` builds a personalized retention model.

### The algorithm

`lc-retention` implements a **modified SM-2** (the algorithm behind Anki) with personalized difficulty weighting.

**Standard SM-2** tracks a stability value `S` per item. The next review interval is derived from `S`. After each review, `S` is updated based on recall quality. Items with higher `S` resurface less frequently — your memory of them is stronger.

**The modification** — instead of initializing `S` uniformly for all items, `lc-retention` computes an initial stability based on your personal effort:

```
attemptScore = 1 / numSubmitted
// 1 attempt → 1.0 (high confidence)
// 5 attempts → 0.2 (low confidence)

difficultyMultiplier = { Easy: 1.3, Medium: 1.0, Hard: 0.7 }

initialS = BASE_S × attemptScore × difficultyMultiplier
initialS = max(initialS, 0.5)  // floor: review in at least 12 hours
```

A problem you solved in 1 attempt gets a higher initial `S` (longer before first review). A problem you struggled with for 6 attempts gets a low `S` (review soon — you need it).

**The review loop** closes the feedback cycle. When a problem resurfaces:

| Recall rating | Multiplier | Effect |
|---|---|---|
| Forgot | 0.5× | S halved — resurfaces in half the time |
| Hard | 1.3× | S grows slightly |
| Okay | 2.5× | S grows significantly |
| Easy | 2.5× | S grows significantly |

This means a problem you truly know will eventually have a review interval of months. A problem you keep forgetting will keep surfacing until it sticks.

**Why SM-2 is self-correcting for noisy data** — Initial `S` values are imperfect because `numSubmitted` accumulates across all sessions. But this doesn't matter much: the review feedback loop corrects inaccuracies over time. A problem with an incorrect initial estimate will be re-rated on review, and `S` will converge to the right value.

### Data pipeline

```
LeetCode page loads
        ↓
content.js injects interceptor.js into page context
        ↓
interceptor.js overrides window.fetch
        ↓
User submits solution → LeetCode calls /graphql/
        ↓
Interceptor detects submissionDetails response
        ↓ (fallback: URL-based detection)
content.js extracts submission data + solving time
        ↓
Direct Supabase upsert → problem_retention table
        ↓
SM-2 computes initialS and next_review_at
```

### Cache invalidation

On every LeetCode page load, `content.js` runs a lightweight check:

1. Fetch `userProgressQuestionList` with `limit: 1` — gets `totalNum` and `lastSubmittedAt`
2. Compare against cached values in `chrome.storage`
3. If either changed → full sync (fetch all problems, recompute retention, upsert to Supabase)
4. If unchanged → use cache

This means the extension makes at most one lightweight API call per page load, and only does the expensive full sync when your solve history actually changes.

### The fetch interceptor

`interceptor.js` runs in the **page context** (not the extension's isolated world) by being injected as a `<script>` tag. This is necessary because content scripts have their own `window` object — they can't intercept the page's fetch calls.

```js
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  // intercept and inspect without breaking LeetCode's own requests
  const clone = response.clone(); // response body can only be read once
  // ...
  return response; // original response passes through untouched
};
```

The `response.clone()` is critical — consuming the response body would break LeetCode's UI. The clone is read for submission data while the original passes through.

### Handle verification

LeetCode has no public OAuth. Authentication works because `content.js` runs inside the LeetCode tab — the browser's existing session cookies are automatically sent with every `fetch` call (`credentials: "include"`). The CSRF token is extracted from `document.cookie` and added as `x-csrftoken` header, matching what LeetCode's own frontend sends.

---

## Tech stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| Frontend | React 18, Vite |
| Database | Supabase (PostgreSQL) |
| Bundler | Vite + vite-plugin-web-extension |
| Language | JavaScript (ES2022) |
| Styling | CSS custom properties |
| Typography | Bricolage Grotesque, JetBrains Mono, Instrument Serif |

---

## Project structure

```
lc-retention/
├── src/
│   ├── background/
│   │   └── service-worker.js      # Chrome background worker, handles alarms
│   ├── content/
│   │   ├── content.js             # Main orchestrator — runs on every LC page
│   │   └── interceptor.js         # Injected into page context, intercepts fetch
│   ├── popup/
│   │   ├── popup.html / popup.jsx         # Main popup — due count, tag breakdown
│   │   ├── review.html / review.jsx       # Review screen — recall rating loop
│   │   ├── stats-popup.html / stats-popup.jsx  # Compact stats popup
│   │   ├── stats.html / stats.jsx         # Full dashboard tab
│   │   └── styles.css                     # Design system — CSS variables, typography
│   └── services/
│       ├── leetcode.js    # All LeetCode GraphQL API calls
│       ├── sm2.js         # SM-2 algorithm + retention data initialization
│       └── supabase.js    # Supabase client
├── manifest.json
├── vite.config.js
└── package.json
```

### Architecture principles

- `services/` — pure async functions, no React, no Chrome APIs
- `content.js` — orchestration only, calls services, no business logic
- `popup/*.jsx` — UI only, calls Supabase directly for display data
- No shared state between popup and content script — each reads from Supabase independently

---

## Supabase schema

### `problem_retention`
Stores the current SM-2 state for each problem per user.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | text | LeetCode title slug (unique) |
| `title_slug` | text | LeetCode title slug |
| `difficulty` | text | Easy / Medium / Hard |
| `stability` | float8 | Current SM-2 stability (days) |
| `next_review_at` | timestamptz | When this problem is next due |
| `num_submitted` | int | Total submission count |
| `review_count` | int | Number of times reviewed via extension |
| `topic_tags` | jsonb | Array of `{name, slug}` tag objects |
| `last_submitted_at` | timestamptz | Most recent submission timestamp |

### `review_history`
Audit log of every review action.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | text | Problem reviewed |
| `recall_rating` | int | 0=Forgot, 2=Hard, 3=Okay, 5=Easy |
| `previous_s` | float | Stability before review |
| `new_s` | float | Stability after review |
| `reviewed_at` | timestamptz | Review timestamp |

---

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- Chrome browser

### 1. Clone and install

```bash
git clone https://github.com/Darth-hub/leet-retention
cd leet-retention
npm install
```

### 2. Set up Supabase

Create a new Supabase project and run the following SQL to create the required tables:

```sql
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leetcode_username text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE problem_retention (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  question_id text NOT NULL,
  title_slug text UNIQUE NOT NULL,
  difficulty text,
  stability float8,
  difficulty_score float8,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  last_submitted_at timestamptz,
  num_submitted int DEFAULT 0,
  review_count int DEFAULT 0,
  topic_tags jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE review_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  question_id text,
  recall_rating int,
  previous_s float,
  new_s float,
  reviewed_at timestamptz DEFAULT now()
);

ALTER TABLE problem_retention DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_history DISABLE ROW LEVEL SECURITY;
```

> **Note:** RLS is disabled for development. Enable and configure RLS policies before making this public.

### 3. Configure environment

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

### 4. Build

```bash
npm run dev     # watch mode — rebuilds on file changes
npm run build   # production build
```

### 5. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

### 6. Use it

1. Open any LeetCode problem — the extension starts tracking
2. Solve problems normally
3. Click the extension icon to see your review queue
4. When problems are due, click "start review" and rate your recall

---

## Key engineering decisions

**Why fetch interception over polling?**
Polling would require repeated API calls to check for new verdicts, introducing latency and wasted requests. Fetch interception is event-driven — the handler fires exactly when a verdict lands, zero polling overhead. This is the same pattern used by browser devtools, APM agents, and observability tools.

**Why `titleSlug` as primary key instead of `questionId`?**
`userProgressQuestionList` doesn't return `questionId` — only `titleSlug`. Using `titleSlug` as the conflict key for upserts keeps the data pipeline consistent without requiring an extra API call per problem.

**Why direct Supabase writes from `content.js` instead of routing through the service worker?**
Chrome's Manifest V3 service workers are ephemeral — they shut down after a few seconds of inactivity. Sending messages to an inactive service worker silently drops them. Writing directly from `content.js` eliminates this failure mode entirely.

**Why `response.clone()` in the interceptor?**
Response bodies are streams that can only be consumed once. Reading the body to extract submission data would prevent LeetCode's own code from reading it, breaking the UI. Cloning creates a second readable copy — the extension reads the clone, LeetCode reads the original.

**Cold start handling**
New users have no submission history, so `numSubmitted` starts at 0. The formula uses `numSubmitted + 1` for new submissions, and falls back to LeetCode's global difficulty (`Medium` as default) until real data accumulates. The review feedback loop corrects initial estimates over time.

---

## What makes this genuinely hard

- **No official LeetCode API** — every data point is extracted from internal GraphQL endpoints reverse-engineered from DevTools
- **Cross-context injection** — content scripts run in an isolated world; intercepting page-level fetch requires injecting into the actual page DOM
- **SM-2 personalization** — standard implementations treat all items equally; weighting by personal effort requires deriving difficulty from submission metadata
- **Service worker reliability** — MV3 service workers are not persistent; the architecture must handle silent message drops gracefully
- **Cache invalidation** — balancing freshness against API rate limits requires a lightweight summary check before each full sync

---

## Roadmap

- [ ] Wire heatmap to real `review_history` data (partially done)
- [ ] Timer-based solving time for new problems (implemented, needs polish)
- [ ] Multi-platform support (Codeforces integration planned)
- [ ] RLS + proper auth for multi-user deployment
- [ ] Chrome Web Store listing

---

## License

MIT
