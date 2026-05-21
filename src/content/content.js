import {
  fetchProgressList,
  fetchProgressSummary,
  fetchSubmissionDetails,
} from "../services/leetcode.js";

import {
  initializeRetentionData,
  computeInitialS,
  computeNextReviewDate,
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

  return solvingTime;

}

function sendMessageWithRetry(message) {

  chrome.runtime.sendMessage(
    message,
    () => {

      if (
        chrome.runtime.lastError
      ) {

        setTimeout(() => {

          chrome.runtime.sendMessage(
            message
          );

        }, 1000);

      }

    }
  );

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

    return retentionData;

  } catch (error) {

    console.error(
      "Error syncing data:",
      error
    );

    return null;

  }

}

async function handleSubmissionPage(slug, submissionId) {
  try {
    const submission = await fetchSubmissionDetails(submissionId);
    if (!submission) return;

    const solvingTime = await stopTimer(slug);

    if (submission.statusCode !== 10) return;

    const { data: existing } = await supabase
      .from("problem_retention")
      .select("stability, num_submitted")
      .eq("question_id", submission.question.titleSlug)
      .single();

    const numSubmitted = (existing?.num_submitted ?? 0) + 1;
    const difficulty = "Medium";
    const initialS = computeInitialS(numSubmitted, difficulty);
    const nextReviewDate = computeNextReviewDate(initialS);

    const { error } = await supabase
      .from("problem_retention")
      .upsert(
        {
          question_id: submission.question.titleSlug,
          title_slug: submission.question.titleSlug,
          stability: initialS,
          next_review_at: nextReviewDate.toISOString(),
          num_submitted: numSubmitted,
          review_count: 0,
          topic_tags: submission.topicTags,
          last_submitted_at: new Date(submission.timestamp * 1000).toISOString(),
          difficulty,
        },
        { onConflict: "title_slug" }
      );

    sendMessageWithRetry({
      type: "NEW_SUBMISSION",
      payload: { ...submission, solvingTime },
    });

  } catch (error) {
    console.error("Error handling submission:", error);
  }
}
  
async function init() {
  const problemMatch =
    window.location.pathname.match(
      /^\/problems\/([^/]+)\/?(?:description\/?)?$/
    );

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

    await syncData();

  }

}

init();