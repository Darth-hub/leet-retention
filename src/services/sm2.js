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
  const attemptScore = 1 / numSubmitted;
  const difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0;
  const initialS = BASE_S *attemptScore *difficultyMultiplier;
  return Math.max(initialS, 0.5);
}

const RECALL_MULTIPLIERS = {
  1: 0.5, // Forgot
  2: 1.3, // Struggled
  3: 2.5, // Remembered easily
};
export function computeNextS(
  currentS,
  recallRating
) {
  const multiplier = RECALL_MULTIPLIERS[recallRating] ?? 1;
  const newS = currentS * multiplier;
  return Math.max(newS, 0.5);
}

export function computeNextReviewDate(
  currentS
) {
  return new Date(
    Date.now() + currentS * 24 * 60 * 60 * 1000);
}

export function initializeRetentionData(questions) {
  return questions.map((question) => {
    const stability = computeInitialS(
      question.numSubmitted,
      question.difficulty
    );
    const nextReviewDate = computeNextReviewDate(stability);
    return {
      question_id: question.titleSlug, 
      title_slug: question.titleSlug,
      difficulty: question.difficulty,
      stability,
      next_review_at: nextReviewDate,
      num_submitted: question.numSubmitted,
      review_count: 0,
      topic_tags: question.topicTags,
      last_submitted_at: question.lastSubmittedAt,
    };
  });
}