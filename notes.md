The extension has four main parts:

Data Layer (leetcode.js)

Handles all GraphQL API calls
fetchProgressList() fetches all solved problems
fetchProgressSummary() does lightweight cache validation
fetchSubmissionDetails() gets metadata for new submissions

Interception Layer

Injected page script overrides window.fetch
Detects LeetCode’s submissionDetails requests
Captures new accepted submissions in real time
Sends events back to content.js via window.postMessage

SM-2 Retention Engine

Each problem stores:
Stability (S)
Difficulty (D)
Next review interval
Initial S/D derived from:
numSubmitted
lastSubmittedAt
Reviews update S based on recall quality

Storage Layer

Uses chrome.storage.local
Caches:
solved problems
retention metadata
review schedules
On page load:
compare cached summary vs latest summary
refetch only if progress changed


One thing missing — the timer. Add it:

Content script starts timer when problem page loads
Stops when interceptor detects AC verdict
solvingTime stored alongside attempt count in chrome.storage



## Interview Answers

Video copier detection — the review loop exposes shallow understanding naturally
Noisy historical data — weighted less, review feedback loop corrects over time
Fetch interception vs polling — event-driven, instant, how observability tools work
credentials: "include" — why cookies are sent automatically
Cache invalidation — totalNum + lastSubmittedAt comparison


## question
When you override window.fetch, you need to detect the operation name from the request. But operationName is in the request body, not the URL. The URL is always https://leetcode.com/graphql/.
How would you extract operationName from the fetch arguments inside your interceptor?
Think about what args contains when window.fetch is called.


## ANSWER

When `fetch()` is called, the arguments usually look like:
```
fetch(url, options)
```
So inside:
```
window.fetch = async (...args) => {}
```
`args` becomes:
```
[
  "https://leetcode.com/graphql/",
  {
    method: "POST",
    headers: {...},
    body: "..."
  }
]
```
So:
```
const [url, options] = args;
```
Then the GraphQL payload is inside:
```
options.body
```
const requestBody =
  JSON.parse(options.body);


  ## important sm2 function - part1

  const BASE_S = 2;
const DIFFICULTY_MULTIPLIER = {
  Easy: 1.3,
  Medium: 1.0,
  Hard: 0.7,
};
export function computeInitialS(
  numSubmitted,
  difficulty
) {
  const attemptScore =
    1 / numSubmitted;

  const difficultyMultiplier =
    DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0;

  const initialS =
    BASE_S *
    attemptScore *
    difficultyMultiplier;

  return Math.max(
    initialS,
    0.5
  );
}

## explaination:

This function computes the initial Stability (S) for a problem when it first enters your retention system.

Meaning:

“How long should this problem stay in memory
before first review?”
Step 1 — Base Stability
const BASE_S = 2;

This is your default starting memory strength.

Interpretation:

“If nothing special is known,
assume memory lasts ~2 days.”

Everything later modifies this base value.

Step 2 — Difficulty Multipliers
const DIFFICULTY_MULTIPLIER = {
  Easy: 1.3,
  Medium: 1.0,
  Hard: 0.7,
};

This adjusts stability based on problem difficulty.

Easy
Easy → 1.3

Easy problems get:

larger S
longer interval

Because:

they're easier to retain
Hard
Hard → 0.7

Hard problems get:

smaller S
earlier resurfacing

Because:

memory is less stable
Step 3 — Attempt Score
const attemptScore =
  1 / numSubmitted;

This is your personalization layer.

Examples:

numSubmitted	attemptScore
1	1.0
2	0.5
5	0.2
10	0.1

More submissions:

lower confidence
lower stability
faster resurfacing
Step 4 — Final Formula
const initialS =
  BASE_S *
  attemptScore *
  difficultyMultiplier;

This combines:

default memory strength
effort signal
problem difficulty
Example 1
Easy problem
numSubmitted = 1
difficulty = Easy

Calculation:

2 × 1 × 1.3 = 2.6

Meaning:

review after ~2.6 days
Example 2
Hard problem with struggle
numSubmitted = 5
difficulty = Hard

Calculation:

2 × 0.2 × 0.7 = 0.28

Very low stability.

But then:

Step 5 — Minimum Stability Clamp
return Math.max(
  initialS,
  0.5
);

Prevents absurdly tiny intervals.

So minimum review interval becomes:

0.5 days (~12 hours)

Without this:

hard problems could produce near-zero intervals
Overall Meaning

This model says:

More attempts + harder problem
→ weaker initial memory
→ review sooner

while:

Easy problems solved cleanly
→ stronger initial memory
→ longer first interval

## part 2

const RECALL_MULTIPLIERS = {
  1: 0.5, // Forgot
  2: 1.3, // Struggled
  3: 2.5, // Remembered easily
};

export function computeNextS(
  currentS,
  recallRating
) {

  const multiplier =
    RECALL_MULTIPLIERS[recallRating] ?? 1;

  const newS =
    currentS * multiplier;

  return Math.max(
    newS,
    0.5
  );

}

How This Works
Rating	Meaning	Effect
1	Forgot	reset/shrink S
2	Struggled	small growth
3	Easy recall	strong growth
Example
Forgot
currentS = 8
rating = 1
newS = 8 × 0.5 = 4

Problem resurfaces sooner.

Struggled
currentS = 8
rating = 2
newS = 8 × 1.3 = 10.4

Some growth, but cautious.

Easy Recall
currentS = 8
rating = 3
newS = 8 × 2.5 = 20

Memory considered much stronger.

This captures the core SM-2 idea:

S
new
	​

=S
current
	​

×recallMultiplier

Easy recall expands intervals aggressively, while forgetting collapses them.



## part 3

export function computeNextReviewDate(
  currentS
) {

  return new Date(
    Date.now() +
    currentS * 24 * 60 * 60 * 1000
  );

}
What This Does

Converts:

Stability (in days)

into:

Actual future review date
Example
If:
currentS = 7

then:

next review = 7 days from now
Breakdown
24 * 60 * 60 * 1000

means:

milliseconds in one day

So:

currentS * milliseconds_per_day

gives future timestamp.

Then:

new Date(...)

converts timestamp into actual Date object.


