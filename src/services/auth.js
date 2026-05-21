import {
  fetchRecentSubmissions,
} from "./leetcode.js";
export async function verifyLeetCodeHandle(
  username
) {
  const startTime =
    Date.now();
  const TIMEOUT =
    60 * 1000;
  const POLL_INTERVAL =
    2000;
  while (
    Date.now() - startTime <
    TIMEOUT
  ) {
    try {
      const submissions =
        await fetchRecentSubmissions(
          username
        );
      const latest =
        submissions[0];
      if (
        latest &&
        latest.statusDisplay ===
          "Compile Error"
      ) {
        return true;
      }
    } catch (error) {
      console.error(
        "Verification error:",
        error
      );
    }
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          POLL_INTERVAL
        )
    );
  }
  return false;
}