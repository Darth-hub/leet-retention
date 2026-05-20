import { createClient } from "@supabase/supabase-js";
import {
  computeInitialS,
  computeNextReviewDate,
} from "../services/sm2.js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.type !== "NEW_SUBMISSION") {
      return;
    }
    handleNewSubmission(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keeps message channel open for async
  }
);
async function handleNewSubmission(submission) {
  const {
    question,
    statusCode,
    topicTags,
    timestamp,
    runtime,
  } = submission;
  // only process accepted submissions
  if (statusCode !== 10) {
    return;
  }
  const { data: existing } = await supabase
    .from("problem_retention")
    .select("id, stability, review_count, num_submitted")
    .eq("question_id", question.questionId)
    .single();

  const numSubmitted = existing?.num_submitted ?? 1;
  const difficulty = submission.difficulty ?? "Medium";
  const initialS = computeInitialS(numSubmitted, difficulty);
  const nextReviewDate = computeNextReviewDate(initialS);

  if (existing) {
    await supabase
      .from("problem_retention")
      .update({
        stability: initialS,
        next_review_at: nextReviewDate,
        updated_at: new Date(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("problem_retention")
      .insert({
        question_id: question.questionId,
        title_slug: question.titleSlug,
        stability: initialS,
        next_review_at: nextReviewDate,
        last_reviewed_at: new Date(timestamp * 1000),
        num_submitted: numSubmitted,
        review_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
  }

  chrome.alarms.create(
    `review_${question.questionId}`,
    { when: nextReviewDate.getTime() }
  );
}