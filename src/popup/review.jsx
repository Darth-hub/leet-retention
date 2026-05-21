import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function Diff({ d }) {
  const map = { easy: 'EASY', med: 'MED', hard: 'HARD' };
  return <span className={`diff ${d}`}>{map[d]}</span>;
}

function Ticker({ char = '─', count = 24 }) {
  return (
    <div style={{
      fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)',
      letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden',
    }}>{char.repeat(count)}</div>
  );
}

function normalizeDiff(difficulty) {
  if (!difficulty) return 'med';
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 'easy';
  if (d === 'hard') return 'hard';
  return 'med';
}

function ReviewB() {
  const [problems, setProblems] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("problem_retention")
        .select("*")
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true });
      setProblems(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleRating(rating) {
    const problem = problems[index];
    
    // compute new S
    const multipliers = { 0: 0.5, 2: 1.3, 3: 2.5, 5: 2.5 };
    const multiplier = multipliers[rating] ?? 1;
    const newS = Math.max(problem.stability * multiplier, 0.5);
    const nextReview = new Date(Date.now() + newS * 24 * 60 * 60 * 1000);

    // update Supabase
    await supabase
      .from("problem_retention")
      .update({
        stability: newS,
        next_review_at: nextReview.toISOString(),
        review_count: (problem.review_count || 0) + 1,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("title_slug", problem.title_slug);

    // log to review_history
    await supabase
      .from("review_history")
      .insert({
        question_id: problem.question_id,
        recall_rating: rating,
        previous_s: problem.stability,
        new_s: newS,
        reviewed_at: new Date().toISOString(),
      });

    if (index + 1 >= problems.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  if (loading) return (
    <div style={{ width: 360, height: 480, background: 'var(--ink-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)', fontFamily: 'var(--f-mono)' }}>
      loading...
    </div>
  );

  if (done) return (
    <div style={{ width: 360, height: 480, background: 'var(--ink-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 32, color: 'var(--fg)' }}>all done.</div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>see you tomorrow.</div>
    </div>
  );
  if (!problems[index]) return null;

  const problem = problems[index];
  const tags = problem.topic_tags || [];
  const daysCold = Math.floor((Date.now() - new Date(problem.last_reviewed_at || problem.last_submitted_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div style={{ width: 360, height: 480, background: 'var(--ink-1)', display: 'flex', flexDirection: 'column', padding: '14px 22px 16px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--fg)' }}>
          review №<span style={{ fontFamily: 'var(--f-mono)', fontStyle: 'normal', fontSize: 14 }}>{String(index + 1).padStart(2, '0')}</span>
        </span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)' }}>of {String(problems.length).padStart(2, '0')}</span>
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
        {problems.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3,
            background: i <= index ? 'var(--fg)' : 'var(--ink-3)',
            opacity: i < index ? 0.4 : 1,
          }}></div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Diff d={normalizeDiff(problem.difficulty)} />
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)' }}>{daysCold} days cold</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--f-display)', fontWeight: 500, fontSize: 26, lineHeight: 1.08, letterSpacing: '-0.015em', color: 'var(--fg)' }}>
          {problem.title_slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map(t => (
            <span key={t.slug} className="chip">#{t.name?.toLowerCase()}</span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <a href={`https://leetcode.com/problems/${problem.title_slug}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn" style={{ width: '100%', justifyContent: 'space-between', borderRadius: 999, padding: '11px 14px', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
            <span>open on leetcode</span>
            <span>↗</span>
          </button>
        </a>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <Ticker char="·" count={40} />
        <div style={{ marginTop: 8, marginBottom: 8, fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--fg-1)', textAlign: 'center' }}>
          how did it go?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {[
            { l: 'forgot', rating: 0, c: 'var(--hard)' },
            { l: 'hard',   rating: 2, c: 'var(--med)'  },
            { l: 'okay',   rating: 3, c: 'var(--fg-1)' },
            { l: 'easy',   rating: 5, c: 'var(--easy)' },
          ].map(b => (
            <button key={b.l} onClick={() => handleRating(b.rating)} style={{
              background: 'transparent', cursor: 'pointer',
              border: '1px solid var(--line-d)', borderRadius: 6,
              padding: '10px 4px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: b.c, lineHeight: 1 }}>{b.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ReviewB />);