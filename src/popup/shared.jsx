const { useState, useEffect } = React;

const SUPABASE_URL = "__VITE_SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__VITE_SUPABASE_ANON_KEY__";

async function fetchDueProblems() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/problem_retention?next_review_at=lte.${new Date().toISOString()}&order=next_review_at.asc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  return res.json();
}

async function fetchAllProblems() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/problem_retention?select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  return res.json();
}

function computeTagBreakdown(dueProblems) {
  const tagMap = {};
  dueProblems.forEach((p) => {
    const tags = p.topic_tags || [];
    tags.forEach((t) => {
      const name = t.name || t;
      if (!tagMap[name]) tagMap[name] = 0;
      tagMap[name]++;
    });
  });
  return Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag, n]) => ({ tag, n }));
}

function normalizeDiff(difficulty) {
  if (!difficulty) return "med";
  const d = difficulty.toLowerCase();
  if (d === "easy") return "easy";
  if (d === "hard") return "hard";
  return "med";
}

const SPARK = [.92,.91,.89,.88,.86,.84,.83,.82,.80,.79,.78,.77,.76,.74,.73,.72,.71,.70,.68,.67,
               .66,.65,.65,.64,.63,.63,.62,.61,.61,.60,.59,.59,.58,.57,.57,.56,.55,.55,.54,.53,
               .53,.52,.52,.51,.51,.50,.49,.48,.48,.47,.46,.46,.45,.44,.43,.43,.42,.42,.41,.41];

function Ticker({ char = '─', count = 24, color = 'var(--fg-3)' }) {
  return (
    <div style={{
      fontFamily: 'var(--f-mono)', fontSize: 10, color,
      letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden',
    }}>{char.repeat(count)}</div>
  );
}

function MiniSpark({ data = SPARK, w = 120, h = 28, color = 'var(--fg)' }) {
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - v * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function Diff({ d }) {
  const map = { easy: 'EASY', med: 'MED', hard: 'HARD' };
  return <span className={`diff ${d}`}>{map[d]}</span>;
}

Object.assign(window, {
  fetchDueProblems,
  fetchAllProblems,
  computeTagBreakdown,
  normalizeDiff,
  SPARK,
  Ticker,
  MiniSpark,
  Diff,
});