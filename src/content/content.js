import {
  fetchProgressList,fetchProgressSummary,} from "../services/leetcode.js";
import {initializeRetentionData,} from "../services/sm2.js";
import { supabase,} from "../services/supabase.js";
const STORAGE_KEY ="leetcodeData";
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
async function init() {
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