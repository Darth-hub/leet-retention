import React, {
  useState,
  useEffect,
} from "react";

import ReactDOM from "react-dom/client";

import {
  createClient,
} from "@supabase/supabase-js";

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

function MiniSpark({
  w,
  h,
}) {

  const points =
    "0,30 25,28 50,20 75,18 100,22 125,14 150,12 175,16 200,10 225,8 250,12 275,6 316,4";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
    >

      <polyline
        points={points}
        stroke="var(--fg)"
        strokeWidth="1.5"
        fill="none"
      />

    </svg>
  );

}

function StatsPopupB() {

  const [
    totalSolved,
    setTotalSolved,
  ] = useState(0);

  const [
    dueCount,
    setDueCount,
  ] = useState(0);

  const [
    retention,
    setRetention,
  ] = useState(0);

  const [
    tagBreakdown,
    setTagBreakdown,
  ] = useState([]);

  const [
    streak,
    setStreak,
  ] = useState(12);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {

    async function load() {

      try {

        const {
          data: allProblems,
          count,
        } = await supabase
          .from(
            "problem_retention"
          )
          .select(
            "*",
            {
              count: "exact",
            }
          );

        const {
          data: dueProblems,
        } = await supabase
          .from(
            "problem_retention"
          )
          .select("*")
          .lte(
            "next_review_at",
            new Date()
              .toISOString()
          );

        const total =
          count || 0;

        const due =
          dueProblems || [];

        setTotalSolved(
          total
        );

        setDueCount(
          due.length
        );

        const retentionPercent =
          total > 0
            ? Math.max(
                0,
                Math.round(
                  (
                    (
                      total -
                      due.length
                    ) /
                    total
                  ) * 100
                )
              )
            : 0;

        setRetention(
          retentionPercent
        );

        const tagStats = {};

        (
          allProblems || []
        ).forEach((p) => {

          const isDue =
            new Date(
              p.next_review_at
            ) <= new Date();

          (
            p.topic_tags || []
          ).forEach((t) => {

            const tag =
              t.name || t;

            if (
              !tagStats[tag]
            ) {

              tagStats[tag] = {
                total: 0,
                due: 0,
              };

            }

            tagStats[tag]
              .total += 1;

            if (isDue) {

              tagStats[tag]
                .due += 1;

            }

          });

        });

        const breakdown =
          Object.entries(
            tagStats
          )
            .map(
              ([
                tag,
                stats,
              ]) => ({

                tag,

                retention:
                  (
                    stats.total -
                    stats.due
                  ) /
                  stats.total,

              })
            )
            .sort(
              (a, b) =>
                b.retention -
                a.retention
            )
            .slice(0, 4);

        setTagBreakdown(
          breakdown
        );

      } catch (error) {

        console.error(
          "Error loading stats:",
          error
        );

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);

  if (loading) {

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

  return (

    <div
      style={{
        width: 360,
        height: 480,
        background:
          "var(--ink-1)",
        padding:
          "14px 22px 14px",
        display: "flex",
        flexDirection:
          "column",
      }}
    >

      <div
        style={{
          display: "flex",
          gap: 14,
          borderBottom:
            "1px solid var(--line-d)",
        }}
      >

        {[
          "today",
          "stats",
        ].map(
          (t, i) => (

            <div
              key={t}
              style={{
                padding:
                  "0 0 8px",
                fontFamily:
                  "var(--f-serif)",
                fontStyle:
                  "italic",
                fontSize: 15,
                color:
                  i === 1
                    ? "var(--fg)"
                    : "var(--fg-3)",
                borderBottom:
                  i === 1
                    ? "2px solid var(--fg)"
                    : "2px solid transparent",
                marginBottom:
                  "-1px",
                cursor:
                  "pointer",
              }}
            >
              {t}
            </div>

          )
        )}

      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "baseline",
          gap: 8,
          marginTop: 16,
          marginBottom: 4,
        }}
      >

        <span
          style={{
            fontFamily:
              "var(--f-serif)",
            fontStyle:
              "italic",
            fontSize: 72,
            lineHeight: 0.85,
            letterSpacing:
              "-0.03em",
            color:
              "var(--fg)",
          }}
        >

          {retention}

          <span
            style={{
              fontSize: 28,
              color:
                "var(--fg-2)",
            }}
          >
            %
          </span>

        </span>

        <div
          style={{
            marginLeft:
              "auto",
            textAlign:
              "right",
          }}
        >

          <div
            className="eyebrow"
          >
            still remembered
          </div>

          <div
            style={{
              fontFamily:
                "var(--f-mono)",
              fontSize: 10,
              color:
                "var(--easy)",
              marginTop: 2,
            }}
          >
            ↑ {
              totalSolved -
              dueCount
            } retained
          </div>

        </div>

      </div>

      <div
        style={{
          marginTop: 10,
        }}
      >

        <MiniSpark
          w={316}
          h={42}
        />

      </div>

      <div
        style={{
          marginTop: 14,
          marginBottom: 10,
        }}
      >

        <Ticker
          char="─"
          count={46}
        />

      </div>

      <div
        style={{
          display: "flex",
          flexDirection:
            "column",
          gap: 10,
        }}
      >

        {tagBreakdown.map(
          (t) => (

            <div
              key={t.tag}
              style={{
                display:
                  "flex",
                alignItems:
                  "baseline",
                gap: 8,
              }}
            >

              <span
                style={{
                  fontFamily:
                    "var(--f-display)",
                  fontSize: 13,
                  color:
                    "var(--fg)",
                  flex:
                    "0 0 auto",
                }}
              >
                {t.tag}
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
                  fontFamily:
                    "var(--f-serif)",
                  fontStyle:
                    "italic",
                  fontSize: 16,
                  color:
                    "var(--fg)",
                }}
              >

                {Math.round(
                  t.retention *
                  100
                )}

                <span
                  style={{
                    fontSize: 11,
                    color:
                      "var(--fg-3)",
                  }}
                >
                  %
                </span>

              </span>

            </div>

          )
        )}

      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent:
            "space-between",
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
              fontFamily:
                "var(--f-serif)",
              fontStyle:
                "italic",
              fontSize: 13,
              color:
                "var(--fg-1)",
            }}
          >
            {streak}
          </span>{" "}
          day streak

        </span>

        <a
          href="stats.html"
          target="_blank"
          style={{
            color:
              "var(--fg-1)",
            cursor:
              "pointer",
            textDecoration:
              "none",
          }}
        >
          open full ↗
        </a>

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
  .render(<StatsPopupB />);