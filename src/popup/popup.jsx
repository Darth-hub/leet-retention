import React, {
  useState,
  useEffect,
} from "react";

import ReactDOM from "react-dom/client";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  verifyLeetCodeHandle,
} from "../services/auth.js";

const supabase = createClient(
  import.meta.env
    .VITE_SUPABASE_URL,
  import.meta.env
    .VITE_SUPABASE_ANON_KEY
);

function Ticker({
  char,
  count,
}) {

  return (
    <div
      style={{
        overflow: "hidden",
        whiteSpace: "nowrap",
        color: "var(--line)",
        fontFamily: "var(--f-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
      }}
    >
      {Array(count)
        .fill(char)
        .join("")}
    </div>
  );

}

function PopupB() {

  const [
    username,
    setUsername,
  ] = useState(null);

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  const [
    inputValue,
    setInputValue,
  ] = useState("");

  const [
    dueProblems,
    setDueProblems,
  ] = useState([]);

  const [
    tagBreakdown,
    setTagBreakdown,
  ] = useState([]);

  const [
    totalSolved,
    setTotalSolved,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authChecked,
    setAuthChecked,
  ] = useState(false);

  const today =
    new Date();

  const dateStr =
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}·${String(
      today.getDate()
    ).padStart(2, "0")}`;

  useEffect(() => {

    chrome.storage.local.get(
      "lc_username",
      (result) => {

        if (
          result.lc_username
        ) {

          setUsername(
            result.lc_username
          );

        }

        setAuthChecked(true);

      }
    );

    async function load() {

      try {

        const { data } =
          await supabase
            .from(
              "problem_retention"
            )
            .select("*")
            .lte(
              "next_review_at",
              new Date()
                .toISOString()
            )
            .order(
              "next_review_at",
              {
                ascending: true,
              }
            );

        const { count } =
          await supabase
            .from(
              "problem_retention"
            )
            .select(
              "*",
              {
                count: "exact",
                head: true,
              }
            );

        const due =
          data || [];

        setDueProblems(due);

        setTotalSolved(
          count || 0
        );

        const tagMap = {};

        due.forEach((p) => {

          (
            p.topic_tags || []
          ).forEach((t) => {

            const name =
              t.name || t;

            tagMap[name] =
              (
                tagMap[name] ||
                0
              ) + 1;

          });

        });

        const breakdown =
          Object.entries(
            tagMap
          )
            .sort(
              (a, b) =>
                b[1] - a[1]
            )
            .slice(0, 4)
            .map(
              ([tag, n]) => ({
                tag,
                n,
              })
            );

        setTagBreakdown(
          breakdown
        );

      } catch (error) {

        console.error(
          "Error loading popup data:",
          error
        );

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);

  async function handleVerify() {

    if (
      !inputValue.trim()
    ) {
      return;
    }

    setVerifying(true);

    const verified =
      await verifyLeetCodeHandle(
        inputValue.trim()
      );

    if (verified) {

      await chrome.storage.local.set({
        lc_username:
          inputValue.trim(),
      });

      setUsername(
        inputValue.trim()
      );

      setVerifying(false);

    } else {

      setVerifying(false);

      alert(
        "Verification failed. Try again."
      );

    }

  }

  if (
    !authChecked ||
    loading
  ) {

    return (
      <div
        style={{
          width: 360,
          height: 480,
          background:
            "var(--ink-1)",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          color: "var(--fg)",
          fontFamily:
            "var(--f-mono)",
        }}
      >
        loading...
      </div>
    );

  }

  if (!username) {

    return (

      <div
        style={{
          width: 360,
          height: 480,
          background:
            "var(--ink-1)",
          display: "flex",
          flexDirection:
            "column",
          padding: "28px 22px",
        }}
      >

        <div
          style={{
            fontFamily:
              "var(--f-mono)",
            fontSize: 9.5,
            color:
              "var(--fg-3)",
            letterSpacing:
              "0.14em",
          }}
        >
          LR · SETUP
        </div>

        <div
          style={{
            marginTop: 24,
            fontFamily:
              "var(--f-serif)",
            fontStyle:
              "italic",
            fontSize: 32,
            color:
              "var(--fg)",
            lineHeight: 1.1,
          }}
        >
          prove your handle.
        </div>

        <div
          style={{
            marginTop: 12,
            fontFamily:
              "var(--f-mono)",
            fontSize: 11,
            color:
              "var(--fg-3)",
            lineHeight: 1.7,
          }}
        >
          Enter your LeetCode username.
          Then open the verification
          problem and submit invalid
          code to trigger a compile
          error automatically.
        </div>

        <input
          value={inputValue}
          onChange={(e) =>
            setInputValue(
              e.target.value
            )
          }
          placeholder="your-lc-username"
          style={{
            marginTop: 20,
            padding: "11px 12px",
            background:
              "var(--ink-2)",
            border:
              "1px solid var(--line)",
            borderRadius: 6,
            color:
              "var(--fg)",
            fontFamily:
              "var(--f-mono)",
            fontSize: 12,
            outline: "none",
          }}
        />

        {!verifying ? (

          <button
            className="btn primary"
            onClick={handleVerify}
            style={{
              marginTop: 14,
              width: "100%",
              justifyContent:
                "center",
              borderRadius: 999,
              padding:
                "12px 14px",
            }}
          >
            start verification →
          </button>

        ) : (

          <div
            style={{
              marginTop: 16,
            }}
          >

            <a
              href="https://leetcode.com/problems/trapping-rain-water-ii/"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {

                e.preventDefault();

                chrome.tabs.create({
                  url:
                    "https://leetcode.com/problems/trapping-rain-water-ii/",
                });

              }}
              style={{
                display: "block",
                padding:
                  "11px 14px",
                background:
                  "var(--ink-2)",
                border:
                  "1px solid var(--line)",
                borderRadius: 999,
                fontFamily:
                  "var(--f-mono)",
                fontSize: 11,
                color:
                  "var(--fg)",
                textDecoration:
                  "none",
                textAlign:
                  "center",
              }}
            >
              open verification problem ↗
            </a>

            <div
              style={{
                marginTop: 14,
                fontFamily:
                  "var(--f-mono)",
                fontSize: 10,
                color:
                  "var(--fg-3)",
                textAlign:
                  "center",
                lineHeight: 1.6,
              }}
            >
              Submit invalid code and
              wait for the compile
              error to be detected.
            </div>

          </div>

        )}

      </div>

    );

  }

  return (

    <div
      style={{
        width: 360,
        height: 480,
        background:
          "var(--ink-1)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection:
          "column",
      }}
    >

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 14,
          fontFamily:
            "var(--f-mono)",
          fontSize: 9.5,
          color:
            "var(--fg-3)",
          letterSpacing:
            "0.14em",
        }}
      >
        LR · {dateStr}
      </div>

      <div
        style={{
          padding:
            "46px 22px 0",
          position:
            "relative",
        }}
      >

        <div
          style={{
            fontFamily:
              "var(--f-serif)",
            fontStyle:
              "italic",
            fontSize: 188,
            lineHeight: 0.82,
            letterSpacing:
              "-0.04em",
            color:
              "var(--fg)",
            textIndent:
              "-6px",
          }}
        >
          {
            dueProblems.length
          }
        </div>

        <div
          style={{
            position:
              "absolute",
            right: 22,
            bottom: 18,
            textAlign:
              "right",
          }}
        >

          <div
            style={{
              fontFamily:
                "var(--f-display)",
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.1,
              color:
                "var(--fg)",
            }}
          >
            problems
            <br />
            are due
          </div>

          <div
            style={{
              fontFamily:
                "var(--f-mono)",
              fontSize: 10,
              color:
                "var(--fg-3)",
              marginTop: 4,
              letterSpacing:
                "0.04em",
            }}
          >
            ↓ before they slip
          </div>

        </div>

      </div>

      <div
        style={{
          padding:
            "22px 22px 0",
        }}
      >

        <Ticker
          char="·"
          count={48}
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection:
              "column",
            gap: 5,
          }}
        >

          {tagBreakdown.map(
            ({
              tag,
              n,
            }) => (

              <div
                key={tag}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "baseline",
                  gap: 8,
                  fontFamily:
                    "var(--f-mono)",
                  fontSize: 11,
                }}
              >

                <span
                  style={{
                    color:
                      "var(--fg-1)",
                  }}
                >
                  {tag}
                </span>

                <span
                  style={{
                    flex: 1,
                    borderBottom:
                      "1px dotted var(--line)",
                    transform:
                      "translateY(-3px)",
                  }}
                ></span>

                <span
                  className="tabular"
                  style={{
                    color:
                      "var(--fg)",
                  }}
                >
                  {n}
                </span>

              </div>

            )
          )}

        </div>

      </div>

      <div
        style={{
          padding:
            "18px 22px 0",
        }}
      >

        <button
          className="btn primary"
          onClick={() =>
            chrome.tabs.create({
              url:
                chrome.runtime.getURL(
                  "src/popup/review.html"
                ),
            })
          }
          style={{
            width: "100%",
            justifyContent:
              "space-between",
            display: "flex",
            alignItems:
              "center",
            padding:
              "12px 14px",
            borderRadius:
              999,
            fontFamily:
              "var(--f-display)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0,
          }}
        >

          <span>
            start review
          </span>

          <span
            style={{
              fontFamily:
                "var(--f-serif)",
              fontStyle:
                "italic",
              fontSize: 16,
            }}
          >
            let's go →
          </span>

        </button>

      </div>

      <div
        style={{
          marginTop: "auto",
          padding:
            "14px 22px 16px",
        }}
      >

        <Ticker
          char="─"
          count={64}
        />

        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            fontFamily:
              "var(--f-mono)",
            fontSize: 10,
            color:
              "var(--fg-3)",
          }}
        >

          <span>
            <span
              style={{
                color:
                  "var(--fg-1)",
              }}
            >
              {Math.max(
                0,
                100 -
                Math.floor(
                  (
                    dueProblems.length /
                    Math.max(
                      totalSolved,
                      1
                    )
                  ) * 100
                )
              )}
              %
            </span>{" "}
            still in memory
          </span>

          <span>
            {totalSolved} solved
          </span>

          <span
            onClick={() =>
              chrome.tabs.create({
                url:
                  chrome.runtime.getURL(
                    "src/popup/stats.html"
                  ),
              })
            }
            style={{
              color:
                "var(--fg-1)",
              cursor:
                "pointer",
            }}
          >
            stats →
          </span>

        </div>

      </div>

    </div>

  );

}

ReactDOM
  .createRoot(
    document.getElementById(
      "root"
    )
  )
  .render(<PopupB />);