
jsx
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

function Diff({ d }) {
  const colorMap = {
    Easy: "var(--easy)",
    Medium: "var(--med)",
    Hard: "var(--hard)",
  };

  return (
    <span
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: 10,
        color:
          colorMap[d] ||
          "var(--fg-2)",
      }}
    >
      {d}
    </span>
  );
}

function CurveChartB({
  topicCurves,
}) {
  const W = 340;
  const H = 180;

  const pad = {
    l: 28,
    r: 8,
    t: 8,
    b: 22,
  };

  const cw =
    W - pad.l - pad.r;

  const ch =
    H - pad.t - pad.b;

  const toPts = (arr) =>
    arr
      .map((v, i) => {
        const x =
          pad.l +
          (i /
            (arr.length - 1)) *
            cw;

        const y =
          pad.t +
          (1 -
            Math.max(
              0,
              Math.min(1, v)
            )) *
            ch;

        return `${x.toFixed(
          1
        )},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
      >
        {[0, 0.5, 1].map(
          (g, i) => {
            const y =
              pad.t +
              (1 - g) * ch;

            return (
              <g key={i}>
                <line
                  x1={pad.l}
                  x2={W - pad.r}
                  y1={y}
                  y2={y}
                  stroke="var(--line-d)"
                  strokeDasharray="2 4"
                />

                <text
                  x={pad.l - 6}
                  y={y + 3}
                  fontSize="9"
                  fontFamily="var(--f-mono)"
                  fill="var(--fg-3)"
                  textAnchor="end"
                >
                  {Math.round(
                    g * 100
                  )}
                </text>
              </g>
            );
          }
        )}

        {[
          "-60d",
          "-30d",
          "today",
        ].map((l, i) => (
          <text
            key={l}
            x={
              pad.l +
              (i / 2) * cw
            }
            y={H - 6}
            fontSize="9"
            fontFamily="var(--f-mono)"
            fill="var(--fg-3)"
            textAnchor="middle"
          >
            {l}
          </text>
        ))}

        {topicCurves.map(
          (s, i) => (
            <polyline
              key={i}
              points={toPts(
                s.data
              )}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )
        )}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 4,
          fontFamily:
            "var(--f-mono)",
          fontSize: 10,
          color: "var(--fg-2)",
          flexWrap: "wrap",
        }}
      >
        {topicCurves.map(
          (t) => (
            <span
              key={t.tag}
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 2,
                  background:
                    t.color,
                }}
              ></span>
              {t.tag}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function StatsTabB() {
  const [
    totalSolved,
    setTotalSolved,
  ] = useState(0);

  const [
    dueProblems,
    setDueProblems,
  ] = useState([]);

  const [
    retention,
    setRetention,
  ] = useState(0);

  const [
    topicRetention,
    setTopicRetention,
  ] = useState([]);

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
          .select("*", {
            count: "exact",
          });

        const {
          data: due,
        } = await supabase
          .from(
            "problem_retention"
          )
          .select("*")
          .lte(
            "next_review_at",
            new Date().toISOString()
          )
          .order(
            "next_review_at",
            {
              ascending: true,
            }
          );

        const total =
          count || 0;

        const dueData =
          due || [];

        setTotalSolved(total);

        setDueProblems(dueData);

        const retentionPercent =
          total > 0
            ? Math.round(
                ((total -
                  dueData.length) /
                  total) *
                  100
              )
            : 0;

        setRetention(
          retentionPercent
        );

        const topicStats = {};

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
              !topicStats[tag]
            ) {
              topicStats[tag] = {
                total: 0,
                due: 0,
              };
            }

            topicStats[tag]
              .total += 1;

            if (isDue) {
              topicStats[tag]
                .due += 1;
            }
          });
        });

        const topicData =
          Object.entries(
            topicStats
          )
            .map(
              ([tag, stats]) => ({
                tag,
                retention:
                  (stats.total -
                    stats.due) /
                  stats.total,
                n: stats.total,
              })
            )
            .sort(
              (a, b) =>
                a.retention -
                b.retention
            );

        setTopicRetention(
          topicData
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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          background:
            "var(--ink-0)",
          color: "var(--fg)",
          fontFamily:
            "var(--f-mono)",
        }}
      >
        loading...
      </div>
    );
  }

  const topicCurves =
    topicRetention
      .slice(0, 4)
      .map((t, i) => ({
        tag: t.tag,
        color: [
          "var(--hard)",
          "var(--med)",
          "var(--fg)",
          "var(--easy)",
        ][i],
        data: Array.from(
          { length: 12 },
          (_, idx) =>
            Math.max(
              0,
              t.retention -
                idx * 0.02
            )
        ),
      }));

  const heatmap = Array.from(
    { length: 12 },
    (_, w) =>
      Array.from(
        { length: 7 },
        (_, d) => {
          const seed =
            w * 7 + d;

          return (
            (Math.sin(
              seed * 0.7
            ) +
              1) /
            2
          );
        }
      )
  );

  return (
    <div
      style={{
        background:
          "var(--ink-0)",
        color: "var(--fg)",
        fontFamily:
          "var(--f-display)",
        minHeight: "100vh",
        display: "flex",
        flexDirection:
          "column",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
          padding:
            "22px 32px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "baseline",
            justifyContent:
              "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily:
                  "var(--f-mono)",
                fontSize: 10,
                color:
                  "var(--fg-3)",
                letterSpacing:
                  "0.18em",
              }}
            >
              LR · LEET-RETENTION · DASHBOARD
            </div>

            <div
              style={{
                marginTop: 6,
                fontFamily:
                  "var(--f-serif)",
                fontStyle:
                  "italic",
                fontSize: 44,
                color:
                  "var(--fg)",
                lineHeight: 1,
                letterSpacing:
                  "-0.02em",
              }}
            >
              your memory,
              mapped.
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontFamily:
                "var(--f-mono)",
              fontSize: 11,
              color:
                "var(--fg-3)",
            }}
          >
            <div>
              {totalSolved} solved · {dueProblems.length} due
            </div>

            <div
              style={{
                marginTop: 2,
              }}
            >
              synced just now
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
          }}
        >
          <Ticker
            char="─"
            count={140}
          />
        </div>
      </div>

      <div
        style={{
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
          padding:
            "22px 32px 40px",
          flex: 1,
          display: "grid",
          gridTemplateColumns:
            "1fr 380px",
          gap: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
            gap: 22,
            paddingRight: 32,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              borderTop:
                "1px solid var(--line-d)",
              borderBottom:
                "1px solid var(--line-d)",
            }}
          >
            {[
              {
                lab: "due today",
                val: dueProblems.length,
                unit: "problems",
              },
              {
                lab: "retention",
                val: retention,
                unit: "%",
              },
              {
                lab: "review streak",
                val: 12,
                unit: "days",
              },
            ].map((s, i) => (
              <div
                key={s.lab}
                style={{
                  padding:
                    "18px 0",
                  borderLeft:
                    i === 0
                      ? "none"
                      : "1px solid var(--line-d)",
                  paddingLeft:
                    i === 0
                      ? 0
                      : 20,
                }}
              >
                <div
                  className="eyebrow"
                  style={{
                    marginBottom: 4,
                  }}
                >
                  {s.lab}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "baseline",
                    gap: 6,
                  }}
                >
                  <span
                    className="tabular"
                    style={{
                      fontFamily:
                        "var(--f-serif)",
                      fontStyle:
                        "italic",
                      fontSize: 64,
                      lineHeight: 0.9,
                      letterSpacing:
                        "-0.03em",
                      color:
                        "var(--fg)",
                    }}
                  >
                    {s.val}
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--f-mono)",
                      fontSize: 12,
                      color:
                        "var(--fg-2)",
                    }}
                  >
                    {s.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "baseline",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  className="eyebrow"
                  style={{
                    marginBottom: 4,
                  }}
                >
                  review heatmap
                </div>

                <div
                  style={{
                    fontFamily:
                      "var(--f-serif)",
                    fontStyle:
                      "italic",
                    fontSize: 22,
                    color:
                      "var(--fg)",
                  }}
                >
                  12 weeks of effort
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 4,
              }}
            >
              {heatmap.map(
                (wk, wi) => (
                  <div
                    key={wi}
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 4,
                    }}
                  >
                    {wk.map(
                      (v, di) => (
                        <div
                          key={di}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            background:
                              v < 0.1
                                ? "var(--ink-2)"
                                : `oklch(${0.22 + v * 0.55} 0.01 75)`,
                            border:
                              "1px solid var(--line-d)",
                          }}
                        ></div>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "baseline",
                marginBottom: 10,
              }}
            >
              <div className="eyebrow">
                at risk · slipping in 7 days
              </div>

              <span
                style={{
                  fontFamily:
                    "var(--f-mono)",
                  fontSize: 11,
                  color:
                    "var(--fg-3)",
                }}
              >
                {dueProblems.length} problems
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
              }}
            >
              {dueProblems
                .slice(0, 4)
                .map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "60px 1fr auto 90px 60px",
                      alignItems:
                        "baseline",
                      gap: 14,
                      padding:
                        "10px 0",
                      borderBottom:
                        "1px dotted var(--line)",
                    }}
                  >
                    <span
                      className="tabular"
                      style={{
                        fontFamily:
                          "var(--f-mono)",
                        fontSize: 11,
                        color:
                          "var(--fg-3)",
                      }}
                    >
                      №{i + 1}
                    </span>

                    <span
                      style={{
                        fontFamily:
                          "var(--f-display)",
                        fontSize: 15,
                        color:
                          "var(--fg)",
                      }}
                    >
                      {p.title_slug}
                    </span>

                    <Diff
                      d={p.difficulty}
                    />

                    <span
                      style={{
                        fontFamily:
                          "var(--f-mono)",
                        fontSize: 10,
                        color:
                          "var(--fg-2)",
                      }}
                    >
                      {(p.topic_tags || [])
                        .slice(0, 2)
                        .map(
                          (t) =>
                            t.name || t
                        )
                        .join(" · ")}
                    </span>

                    <span
                      className="tabular"
                      style={{
                        fontFamily:
                          "var(--f-serif)",
                        fontStyle:
                          "italic",
                        fontSize: 16,
                        color:
                          "var(--fg-1)",
                        textAlign:
                          "right",
                      }}
                    >
                      {Math.max(
                        1,
                        Math.floor(
                          (Date.now() -
                            new Date(
                              p.next_review_at
                            ).getTime()) /
                            (1000 *
                              60 *
                              60 *
                              24)
                        )
                      )}
                      d
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div
          style={{
            borderLeft:
              "1px solid var(--line-d)",
            paddingLeft: 32,
            display: "flex",
            flexDirection:
              "column",
            gap: 22,
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                marginBottom: 4,
              }}
            >
              forgetting curve
            </div>

            <div
              style={{
                fontFamily:
                  "var(--f-serif)",
                fontStyle:
                  "italic",
                fontSize: 22,
                color:
                  "var(--fg)",
                marginBottom: 10,
              }}
            >
              memory over 60 days
            </div>

            <CurveChartB
              topicCurves={
                topicCurves
              }
            />
          </div>

          <div>
            <div
              className="eyebrow"
              style={{
                marginBottom: 10,
              }}
            >
              retention by topic
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 9,
              }}
            >
              {topicRetention.map(
                (t) => (
                  <div
                    key={t.tag}
                    style={{
                      display: "flex",
                      alignItems:
                        "baseline",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily:
                          "var(--f-display)",
                        fontSize: 12,
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
                          "var(--f-mono)",
                        fontSize: 9,
                        color:
                          "var(--fg-3)",
                      }}
                    >
                      ({t.n})
                    </span>

                    <span
                      className="tabular"
                      style={{
                        fontFamily:
                          "var(--f-serif)",
                        fontStyle:
                          "italic",
                        fontSize: 16,
                        color:
                          t.retention <
                          0.5
                            ? "var(--hard)"
                            : t.retention <
                              0.7
                            ? "var(--med)"
                            : "var(--fg)",
                        minWidth: 36,
                        textAlign:
                          "right",
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
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )
).render(<StatsTabB />);
