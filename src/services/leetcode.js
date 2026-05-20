const LEETCODE_API = "https://leetcode.com/graphql/";
export async function fetchProgressList() {
  const query = `
    query userProgressQuestionList(
      $filters: UserProgressQuestionListInput!
    ) {
      userProgressQuestionList(
        filters: $filters
      ) {
        totalNum
        questions {
          title
          titleSlug
          difficulty
          status
          numSubmitted
          lastSubmittedAt
          topicTags {
            name
            slug
          }
        }
      }
    }
  `;
  let allQuestions = [];
  let skip = 0;
  const limit = 50;
  let totalNum = 0;
  try {
    do {
      const response = await fetch(
        LEETCODE_API,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            operationName:
              "userProgressQuestionList",
            query,
            variables: {
              filters: {
                skip,
                limit,
              },
            },
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          "Failed to fetch progress"
        );
      }
      const data =
        await response.json();
      const result =
        data.data
          .userProgressQuestionList;
      totalNum = result.totalNum;
      allQuestions.push(
        ...result.questions
      );
      skip += limit;
    } while (
      allQuestions.length < totalNum
    );
    return {
      totalNum,
      questions: allQuestions,
    };
  } catch (error) {
    console.error(
      "Error fetching progress:",
      error
    );
    return {
      totalNum: 0,
      questions: [],
    };
  }
}
export async function fetchProgressSummary() {
  const query = `
    query userProgressQuestionList(
      $filters: UserProgressQuestionListInput!
    ) {
      userProgressQuestionList(
        filters: $filters
      ) {
        totalNum
        questions {
          lastSubmittedAt
        }
      }
    }
  `;
  try {
    const response = await fetch(
      LEETCODE_API,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          operationName:
            "userProgressQuestionList",
          query,
          variables: {
            filters: {
              skip: 0,
              limit: 1,
            },
          },
        }),
      }
    );
    if (!response.ok) {
      throw new Error(
        "Failed to fetch summary"
      );
    }
    const data =
      await response.json();
    const result =
      data.data
        .userProgressQuestionList;
    return {
      totalNum: result.totalNum,
      lastSubmittedAt:
        result.questions[0]
          ?.lastSubmittedAt,
    };
  } catch (error) {
    console.error(
      "Error fetching summary:",
      error
    );
    return null;
  }
}