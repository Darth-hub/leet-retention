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


  







