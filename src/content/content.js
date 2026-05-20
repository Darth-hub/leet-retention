import {
  fetchProgressList,
  fetchProgressSummary,
  fetchSubmissionDetails,
} from "../services/leetcode.js";

import {
  initializeRetentionData,
} from "../services/sm2.js";

import {
  supabase,
} from "../services/supabase.js";

const STORAGE_KEY =
  "leetcodeData";

const TIMER_KEY =
  "activeProblemTimer";

async function startTimer(slug) {

  await chrome.storage.local.set({

    [TIMER_KEY]: {
      slug,
      startTime: Date.now(),
    },

  });

  console.log(
    `Started timer for ${slug}`
  );

}

async function stopTimer(slug) {

  const stored =
    await chrome.storage.local.get(
      TIMER_KEY
    );

  const timer =
    stored[TIMER_KEY];

  if (
    !timer ||
    timer.slug !== slug
  ) {

    console.log(
      "No active timer found"
    );

    return null;

  }

  const endTime =
    Date.now();

  const solvingTime =
    Math.floor(
      (endTime - timer.startTime)
      / 1000
    );

  await chrome.storage.local.remove(
    TIMER_KEY
  );

  console.log(
    `Solved ${slug} in ${solvingTime} seconds`
  );

  return solvingTime;

}

async function shouldRefetch() {

  const storedData =
    await chrome.storage.local.get(
      STORAGE_KEY
    );

  const cached =
    storedData[STORAGE_KEY];

  if (!cached) {
    return true;
  }

  const currentSummary =
    await fetchProgressSummary();

  if (!currentSummary) {
    return true;
  }

  return (

    currentSummary.totalNum !==
      cached.totalNum ||

    currentSummary.lastSubmittedAt !==
      cached.lastSubmittedAt

  );

}

async function syncData() {

  try {

    const {
      totalNum,
      questions,
    } = await fetchProgressList();

    const retentionData =
      initializeRetentionData(
        questions
      );

    await chrome.storage.local.set({

      [STORAGE_KEY]: {

        totalNum,

        lastSubmittedAt:
          questions[0]
            ?.lastSubmittedAt,

        questions,

      },

    });

    const {
      error,
    } = await supabase
      .from("problem_retention")
      .upsert(
        retentionData,
        {
          onConflict:
            "title_slug",
        }
      );

    if (error) {
      throw error;
    }

    console.log(
      "Retention data synced"
    );

    return retentionData;

  } catch (error) {

    console.error(
      "Error syncing data:",
      error
    );

    return null;

  }

}

async function handleSubmissionPage(
  slug,
  submissionId
) {

  try {

    const submission =
      await fetchSubmissionDetails(
        submissionId
      );

    if (!submission) {
      return;
    }

    const solvingTime =
      await stopTimer(slug);

    console.log(
      "Submission detected:",
      {
        slug,
        submissionId,
        solvingTime,
      }
    );

    chrome.runtime.sendMessage({

      type:
        "NEW_SUBMISSION",

      payload: {
        ...submission,
        solvingTime,
      },

    });

  } catch (error) {

    console.error(
      "Error handling submission:",
      error
    );

  }

}

async function init() {
console.log("pathname:", window.location.pathname);
const problemMatch = window.location.pathname.match( /^\/problems\/([^/]+)\/?(?:description\/?)?$/);
  if (problemMatch) {
    const slug =
      problemMatch[1];

    await startTimer(slug);

  }

  const submissionMatch =
    window.location.pathname.match(
      /^\/problems\/([^/]+)\/submissions\/(\d+)/
    );

  if (submissionMatch) {

    const slug =
      submissionMatch[1];

    const submissionId =
      parseInt(
        submissionMatch[2]
      );

    await handleSubmissionPage(
      slug,
      submissionId
    );

  }

  const needsRefetch =
    await shouldRefetch();

  if (needsRefetch) {

    console.log(
      "Fetching fresh data..."
    );

    await syncData();

  } else {

    console.log(
      "Using cached data"
    );

    const storedData =
      await chrome.storage.local.get(
        STORAGE_KEY
      );

    console.log(
      storedData[STORAGE_KEY]
    );

  }

}

init();