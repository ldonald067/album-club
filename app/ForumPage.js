"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import {
  getListenUrl,
  getTodayKey,
  getDayOfYear,
  ALBUMS,
  VIBES,
  CAROUSEL_ICONS,
  getPuzzleAlbum,
  getPuzzleClues,
  getMarqueeMessage,
  getAlbumForDate,
  getGameType,
  getCoverPuzzleAlbum,
  getScrambleAlbum,
  getHeardleAlbum,
  getLyricPuzzleAlbum,
  scrambleArtist,
  getBingoCard,
  getMonthMatches,
  checkBingo,
  getGenreCategory,
  getNearBingoLines,
} from "@/lib/albums";

/* ─── Constants ─── */
const MAX_SUGGESTIONS = 5;
const SHAKE_MS = 400;
const COPIED_FEEDBACK_MS = 2000;

/* ─── Pre-lowercased album search index (avoids repeated toLowerCase per keystroke) ─── */
const ALBUM_SEARCH = ALBUMS.map((a) => ({
  ...a,
  _titleLc: a.title.toLowerCase(),
  _artistLc: a.artist.toLowerCase(),
}));

/* ─── Confetti utility (cached dynamic import, respects reduced motion) ─── */
let _confetti = null;
async function fireConfetti(options = {}) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  if (!_confetti) _confetti = (await import("canvas-confetti")).default;
  _confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    ...options,
  });
}

/* ─── Shared Components ─── */

/** Reusable share button with clipboard copy + "Copied!" feedback */
function ShareResultButton({ getText, label = "📋 Share Results" }) {
  const btnRef = useRef(null);
  return (
    <button
      ref={btnRef}
      className="btn-submit share-btn"
      onClick={() => {
        navigator.clipboard
          .writeText(getText())
          .then(() => {
            const btn = btnRef.current;
            if (btn) {
              btn.textContent = "Copied!";
              setTimeout(() => {
                btn.textContent = label;
              }, COPIED_FEEDBACK_MS);
            }
          })
          .catch(() => {});
      }}
    >
      {label}
    </button>
  );
}

/** Guess history list — shows previous guesses with ✅/❌ */
function GuessHistory({ guesses, checkFn }) {
  return (
    <div className="guess-history">
      {guesses.map((g, i) => (
        <div
          key={i}
          className={`guess-item ${checkFn(g) ? "correct" : "wrong"}`}
        >
          <span className="guess-num">#{i + 1}</span>
          <span className="guess-text">{g}</span>
          <span>{checkFn(g) ? "✅" : "❌"}</span>
        </div>
      ))}
    </div>
  );
}

/** Album autocomplete input with dropdown suggestions + keyboard navigation */
function AlbumAutocomplete({
  guesses,
  currentGuess,
  onGuessChange,
  onSubmit,
  shaking,
  inputRef,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const excluded = useMemo(
    () => new Set(guesses.map((g) => g.toLowerCase())),
    [guesses],
  );
  const filtered = useMemo(() => {
    if (!currentGuess.trim()) return [];
    const q = currentGuess.toLowerCase();
    return ALBUM_SEARCH.filter(
      (a) =>
        !excluded.has(a._titleLc) &&
        (a._titleLc.includes(q) || a._artistLc.includes(q)),
    ).slice(0, MAX_SUGGESTIONS);
  }, [currentGuess, excluded]);

  return (
    <div className={`guess-input-wrap${shaking ? " shaking" : ""}`}>
      <div className="guess-input-container">
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          value={currentGuess}
          aria-label="Guess the album"
          onChange={(e) => {
            onGuessChange(e.target.value);
            setShowSuggestions(true);
            setSuggestionIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type an album name..."
          role="combobox"
          aria-expanded={showSuggestions && filtered.length > 0}
          aria-autocomplete="list"
          onKeyDown={(e) => {
            if (
              showSuggestions &&
              filtered.length > 0 &&
              e.key === "ArrowDown"
            ) {
              e.preventDefault();
              setSuggestionIndex((prev) =>
                prev < filtered.length - 1 ? prev + 1 : 0,
              );
            } else if (
              showSuggestions &&
              filtered.length > 0 &&
              e.key === "ArrowUp"
            ) {
              e.preventDefault();
              setSuggestionIndex((prev) =>
                prev > 0 ? prev - 1 : filtered.length - 1,
              );
            } else if (e.key === "Enter") {
              if (suggestionIndex >= 0 && filtered[suggestionIndex]) {
                onGuessChange(filtered[suggestionIndex].title);
                setShowSuggestions(false);
                setSuggestionIndex(-1);
              } else {
                onSubmit();
              }
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
              setSuggestionIndex(-1);
            }
          }}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="suggestions" role="listbox">
            {filtered.map((a, i) => (
              <div
                key={i}
                className={`suggestion-item${i === suggestionIndex ? " highlighted" : ""}`}
                role="option"
                aria-selected={i === suggestionIndex}
                onMouseDown={() => {
                  onGuessChange(a.title);
                  setShowSuggestions(false);
                  setSuggestionIndex(-1);
                }}
                onMouseEnter={() => setSuggestionIndex(i)}
              >
                {a.cover} <strong>{a.title}</strong>{" "}
                <span style={{ color: "#888" }}>— {a.artist}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        className="btn-submit"
        onClick={onSubmit}
        disabled={!currentGuess.trim()}
      >
        Guess
      </button>
    </div>
  );
}

/* ─── Forum signatures (easter egg) ─── */
const FORUM_SIGS = [
  "— xXMusicFan2004Xx | 'If the bass don't hit, I don't sit'",
  "— vinyl_4_life | 'Albums > playlists, always.'",
  "— StereoPhoenix | 'I rate albums, therefore I am.'",
  "— bassline_queen | 'Turn it up until the neighbors complain.'",
  "— The_Riff_Lord | 'My ears have trust issues with singles.'",
  "— lo-fi_larry | 'Listening is not a passive sport.'",
  "— NightOwlBeats | 'Every album deserves at least one full listen.'",
  "— PixelPunk99 | '128kbps? In this economy?'",
  "— CrateDigger3000 | 'My backlog has a backlog.'",
  "— echo_chamber | 'I don't have a problem, I have a collection.'",
];

/* ─── Visit rank (forum-style) ─── */
const VISIT_RANKS = [
  { min: 0, label: "Lurker", icon: "👁️" },
  { min: 3, label: "Newbie", icon: "🌱" },
  { min: 7, label: "Regular", icon: "🎧" },
  { min: 14, label: "Member", icon: "💿" },
  { min: 30, label: "Veteran", icon: "🎸" },
  { min: 60, label: "Elder", icon: "👑" },
  { min: 100, label: "Legend", icon: "⭐" },
];

function getVisitRank() {
  const count = parseInt(localStorage.getItem("aotd_visit_count") || "0", 10);
  let rank = VISIT_RANKS[0];
  let rankIndex = 0;
  for (let i = 0; i < VISIT_RANKS.length; i++) {
    if (count >= VISIT_RANKS[i].min) {
      rank = VISIT_RANKS[i];
      rankIndex = i;
    }
  }
  const nextRank = VISIT_RANKS[rankIndex + 1] || null;
  const progress = nextRank
    ? (count - rank.min) / (nextRank.min - rank.min)
    : 1;
  return { ...rank, count, nextRank, progress };
}

/* ─── Streak milestones ─── */
const STREAK_MILESTONES = [
  { at: 3, msg: "3 days strong! You're building a habit." },
  { at: 7, msg: "A whole week! You're a regular now!" },
  { at: 14, msg: "Two weeks straight — serious dedication." },
  { at: 30, msg: "One month! You belong here." },
  { at: 60, msg: "60 days?! You're practically staff." },
  { at: 100, msg: "LEGEND STATUS ACHIEVED. 100 days." },
];
// Pre-computed: highest milestone first for .find() lookups
const STREAK_MILESTONES_DESC = [...STREAK_MILESTONES].reverse();

function getCelebratedMilestones() {
  try {
    return JSON.parse(
      localStorage.getItem("aotd_milestones_celebrated") || "[]",
    );
  } catch {
    return [];
  }
}

function markMilestoneCelebrated(milestone) {
  const celebrated = getCelebratedMilestones();
  if (!celebrated.includes(milestone)) {
    celebrated.push(milestone);
    localStorage.setItem(
      "aotd_milestones_celebrated",
      JSON.stringify(celebrated),
    );
  }
}

function incrementVisitCount(todayKey) {
  const lastVisit = localStorage.getItem("aotd_last_visit");
  if (lastVisit === todayKey) return; // already counted today
  const count = parseInt(localStorage.getItem("aotd_visit_count") || "0", 10);
  localStorage.setItem("aotd_visit_count", (count + 1).toString());
  localStorage.setItem("aotd_last_visit", todayKey);
}

/* ─── Konami Code detector ─── */
const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/* ─── Color utility ─── */
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/* ─── Rate & Reveal ─── */
function RateReveal({ albumKey }) {
  const [myRating, setMyRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_rated_${albumKey}`);
    if (saved) {
      setMyRating(parseInt(saved));
      setRevealed(true);
      fetch("/api/rate")
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }
  }, [albumKey]);

  const submit = async () => {
    if (myRating === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        throw new Error(msg || "Failed to submit");
      }
      const data = await res.json();
      localStorage.setItem(`aotd_rated_${albumKey}`, myRating.toString());
      window.dispatchEvent(new Event("aotd-activity"));
      setLocking(true);
      await new Promise((r) => setTimeout(r, 600));
      setLocking(false);
      fireConfetti({ particleCount: 40, spread: 50 });
      setResults(data);
      setRevealed(true);
      setJustRevealed(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    }
    setSubmitting(false);
  };

  const getPercentile = () => {
    if (!results) return 0;
    const below = Object.entries(results.distribution)
      .filter(([r]) => parseInt(r) < myRating)
      .reduce((sum, [, count]) => sum + count, 0);
    return results.total > 0 ? Math.round((below / results.total) * 100) : 0;
  };

  if (revealed && results) {
    const maxCount = Math.max(...Object.values(results.distribution), 1);
    return (
      <div className={`panel${justRevealed ? " animate-reveal" : ""}`}>
        <div className="panel-header">
          <span>
            <i className="hn hn-star" aria-hidden="true" /> RATE &amp; REVEAL —
            YOUR RESULTS
          </span>
        </div>
        <div className="panel-body">
          <div className="rate-summary">
            <div className="rate-stat">
              <div className="rate-stat-num">{myRating}/10</div>
              <div className="rate-stat-label">Your Rating</div>
            </div>
            <div className="rate-stat">
              <div className="rate-stat-num">{results.average}/10</div>
              <div className="rate-stat-label">Average</div>
            </div>
            <div className="rate-stat">
              <div className="rate-stat-num">{results.total}</div>
              <div className="rate-stat-label">Total Ratings</div>
            </div>
            <div className="rate-stat">
              <div className="rate-stat-num">{getPercentile()}%</div>
              <div className="rate-stat-label">Rated Higher Than</div>
            </div>
          </div>
          {results.total <= 1 && (
            <p className="activity-prompt" style={{ textAlign: "center" }}>
              You&apos;re the first to rate! Check back later to see how others
              voted.
            </p>
          )}
          <div className="histogram">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="histo-col">
                <div className="histo-bar-wrap">
                  <div
                    className={`histo-bar ${n === myRating ? "mine" : ""}${justRevealed ? " animate-grow" : ""}`}
                    style={{
                      height: `${(results.distribution[n] / maxCount) * 100}%`,
                      animationDelay: justRevealed ? `${n * 80}ms` : undefined,
                    }}
                  />
                </div>
                <div className={`histo-count ${n === myRating ? "mine" : ""}`}>
                  {results.distribution[n]}
                </div>
                <div className={`histo-label ${n === myRating ? "mine" : ""}`}>
                  {n}
                </div>
              </div>
            ))}
          </div>
          <ShareResultButton
            label="📋 Share Rating"
            getText={() => {
              const stars =
                "\u2605".repeat(myRating) + "\u2606".repeat(10 - myRating);
              return [
                `Album Of The Day Club`,
                `\u2b50 Rate & Reveal \u2014 ${albumKey}`,
                `My Rating: ${myRating}/10 ${stars}`,
                `Community Avg: ${results.average}/10 (${results.total} ratings)`,
                window.location.origin,
              ].join("\n");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-star" aria-hidden="true" /> RATE &amp; REVEAL
        </span>
      </div>
      <div className="panel-body rate-input">
        <p className="activity-prompt">
          Rate this album, then see what everyone else thinks. No take-backs.
        </p>
        <div className="star-row">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              className={`star-lg${n <= (hover || myRating) ? " active" : ""}${locking && n <= myRating ? " pulsing" : ""}`}
              style={
                locking && n <= myRating
                  ? { animationDelay: `${(n - 1) * 50}ms` }
                  : undefined
              }
              onClick={() => !locking && setMyRating(n)}
              onMouseEnter={() => !locking && setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`Rate ${n} out of 10`}
            >
              <span aria-hidden="true">★</span>
            </button>
          ))}
        </div>
        {myRating > 0 && <div className="score-lg">{myRating}/10</div>}
        {error && (
          <p className="submit-error" role="alert">
            {error}
          </p>
        )}
        <button
          className={`btn-submit${locking ? " locking" : ""}`}
          onClick={submit}
          disabled={myRating === 0 || submitting || locking}
        >
          {locking
            ? "✨ Locking..."
            : submitting
              ? "⏳ Submitting..."
              : "🔒 Lock It In"}
        </button>
      </div>
    </div>
  );
}

/* ─── Playlist Poll ─── */
/** Compute playlist voting streak from localStorage */
function getPlaylistStreak() {
  let addStreak = 0;
  let skipStreak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const val = localStorage.getItem(`aotd_playlist_${key}`);
    if (!val) break;
    if (i === 0 && val === "yes") {
      addStreak = 1;
    } else if (i === 0 && val === "no") {
      skipStreak = 1;
    } else if (val === "yes" && addStreak > 0) {
      addStreak++;
    } else if (val === "no" && skipStreak > 0) {
      skipStreak++;
    } else {
      break;
    }
  }
  return { addStreak, skipStreak };
}

/** Compute monthly playlist add rate from localStorage */
function getMonthlyAddRate() {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let added = 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("aotd_playlist_")) continue;
    const dateStr = key.replace("aotd_playlist_", "");
    if (!dateStr.startsWith(monthPrefix)) continue;
    total++;
    if (localStorage.getItem(key) === "yes") added++;
  }
  return { added, total };
}

function PlaylistPoll({ albumKey }) {
  const [myVote, setMyVote] = useState(null);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_playlist_${albumKey}`);
    if (saved) {
      setMyVote(saved === "yes");
      setSubmitted(true);
      fetch("/api/playlist")
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }
  }, [albumKey]);

  const submit = async (vote) => {
    if (submitting || locking) return;
    setMyVote(vote);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        throw new Error(msg || "Failed to submit");
      }
      const data = await res.json();
      localStorage.setItem(`aotd_playlist_${albumKey}`, vote ? "yes" : "no");
      window.dispatchEvent(new Event("aotd-activity"));
      setLocking(true);
      setSubmitting(false);
      await new Promise((r) => setTimeout(r, 500));
      setLocking(false);
      fireConfetti({ particleCount: 30, spread: 40 });
      setResults(data);
      setSubmitted(true);
      setJustRevealed(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setMyVote(null);
      setSubmitting(false);
    }
  };

  if (submitted && results) {
    const yesPct =
      results.total > 0 ? Math.round((results.yes / results.total) * 100) : 0;
    const noPct = 100 - yesPct;
    const { addStreak, skipStreak } = getPlaylistStreak();
    const monthRate = getMonthlyAddRate();
    const streakMsg =
      addStreak >= 2
        ? `\ud83d\udd25 ${addStreak} adds in a row`
        : skipStreak >= 2
          ? `\ud83e\uddd0 ${skipStreak} skips in a row \u2014 picky listener`
          : null;
    return (
      <div className={`playlist-poll${justRevealed ? " animate-reveal" : ""}`}>
        <div className="playlist-question">
          {myVote ? "\ud83c\udfa7" : "\ud83d\udeab"} You voted{" "}
          <strong>{myVote ? "Yes" : "Nah"}</strong>
        </div>
        <div className="playlist-bar-wrap">
          <div
            className={`playlist-bar-yes${justRevealed ? " animate-bar" : ""}`}
            style={{ width: `${yesPct}%` }}
          >
            {yesPct > 15 && `${yesPct}%`}
          </div>
          <div
            className={`playlist-bar-no${justRevealed ? " animate-bar" : ""}`}
            style={{ width: `${noPct}%` }}
          >
            {noPct > 15 && `${noPct}%`}
          </div>
        </div>
        <div className="playlist-labels">
          <span>\ud83c\udfa7 Add it ({results.yes})</span>
          <span>\ud83d\udeab Skip it ({results.no})</span>
        </div>
        {(streakMsg || monthRate.total >= 2) && (
          <div className="playlist-meta">
            {streakMsg && <span className="playlist-streak">{streakMsg}</span>}
            {monthRate.total >= 2 && (
              <span className="playlist-month-rate">
                This month: {monthRate.added}/{monthRate.total} added (
                {Math.round((monthRate.added / monthRate.total) * 100)}%)
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="playlist-poll">
      <div className="playlist-question">
        Would you add this to your playlist?
      </div>
      {error && (
        <p className="submit-error" role="alert">
          {error}
        </p>
      )}
      <div className="playlist-buttons">
        <button
          className={`playlist-btn playlist-yes${locking && myVote ? " pulsing" : ""}`}
          onClick={() => submit(true)}
          disabled={submitting || locking}
        >
          {locking && myVote
            ? "\u2728 Locking..."
            : "\ud83c\udfa7 Yeah, add it"}
        </button>
        <button
          className={`playlist-btn playlist-no${locking && !myVote ? " pulsing" : ""}`}
          onClick={() => submit(false)}
          disabled={submitting || locking}
        >
          {locking && !myVote
            ? "\u2728 Locking..."
            : "\ud83d\udeab Nah, skip it"}
        </button>
      </div>
    </div>
  );
}

/* ─── Vibe Check ─── */
function VibeCheck({ albumKey }) {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [justToggledVibe, setJustToggledVibe] = useState(null);
  const [atLimit, setAtLimit] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_vibed_${albumKey}`);
    if (saved) {
      setSelected(JSON.parse(saved));
      setSubmitted(true);
      fetch("/api/vibe")
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }
  }, [albumKey]);

  const toggle = (label) => {
    if (submitted) return;
    const isAdding = !selected.includes(label);
    if (isAdding && selected.length >= 3) {
      setAtLimit(true);
      setTimeout(() => setAtLimit(false), 600);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(label)) return prev.filter((v) => v !== label);
      return [...prev, label];
    });
    if (isAdding) {
      setJustToggledVibe(label);
      setTimeout(() => setJustToggledVibe(null), 300);
    }
  };

  const submit = async () => {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibes: selected }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        throw new Error(msg || "Failed to submit");
      }
      const data = await res.json();
      localStorage.setItem(`aotd_vibed_${albumKey}`, JSON.stringify(selected));
      window.dispatchEvent(new Event("aotd-activity"));
      setResults(data);
      setSubmitted(true);
      setJustSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    }
    setSubmitting(false);
  };

  const maxCount = results
    ? Math.max(...Object.values(results.distribution), 1)
    : 1;

  // Compute top vibe narrative
  const topVibe = useMemo(
    () =>
      submitted && results?.distribution
        ? Object.entries(results.distribution).sort((a, b) => b[1] - a[1])[0]
        : null,
    [submitted, results],
  );
  const topVibePct =
    topVibe && results?.total > 0
      ? Math.round((topVibe[1] / results.total) * 100)
      : 0;
  const topVibeData = topVibe
    ? VIBES.find((v) => v.label === topVibe[0])
    : null;

  return (
    <div className={`panel${justSubmitted ? " animate-reveal" : ""}`}>
      <div className="panel-header">
        <span>
          <i className="hn hn-headphones" aria-hidden="true" />{" "}
          {submitted ? "VIBE CHECK — RESULTS" : "VIBE CHECK"}
        </span>
        {submitted && results && (
          <span
            style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}
          >
            {results.total} vibes cast
          </span>
        )}
      </div>
      <div className="panel-body">
        {!submitted && (
          <p className="activity-prompt">
            What vibes did this album give you? Pick up to 3.
          </p>
        )}
        {submitted && topVibeData && (
          <div className="vibe-narrative">
            <img
              src={topVibeData.icon}
              alt=""
              className="vibe-narrative-icon"
              aria-hidden="true"
            />
            <span>
              Top Vibe: <strong>{topVibeData.label}</strong> — {topVibePct}%
            </span>
          </div>
        )}
        <div className="vibe-grid">
          {VIBES.map((v, idx) => {
            const count = results?.distribution?.[v.label] || 0;
            const pct =
              maxCount > 0 && submitted ? (count / maxCount) * 100 : 0;
            return (
              <button
                key={v.label}
                className={`vibe-btn${selected.includes(v.label) ? " selected" : ""}${submitted ? " locked" : ""}${justToggledVibe === v.label ? " just-selected" : ""}${!submitted && selected.length >= 3 && !selected.includes(v.label) ? " capped" : ""}`}
                style={{
                  backgroundColor: selected.includes(v.label)
                    ? v.color
                    : `${v.color}40`,
                }}
                onClick={() => toggle(v.label)}
                disabled={submitted}
                aria-label={`${v.label}${selected.includes(v.label) ? ", selected" : ""}`}
                aria-pressed={selected.includes(v.label)}
              >
                <img
                  src={v.icon}
                  alt=""
                  className="vibe-pixel-icon"
                  aria-hidden="true"
                  draggable={false}
                />
                <span className="vibe-label">{v.label}</span>
                {selected.includes(v.label) && !submitted && (
                  <span className="vibe-check" aria-hidden="true">
                    ✓
                  </span>
                )}
                {submitted && (
                  <div className="vibe-bar-wrap">
                    <div
                      className={`vibe-bar${justSubmitted ? " animate-slide" : ""}`}
                      style={{
                        width: `${pct}%`,
                        animationDelay: justSubmitted
                          ? `${idx * 50}ms`
                          : undefined,
                      }}
                    />
                    <span className="vibe-count">{count}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {error && (
          <p className="submit-error" role="alert">
            {error}
          </p>
        )}
        {submitted && (
          <ShareResultButton
            label="📋 Share Vibes"
            getText={() => {
              const vibeEmojis = selected
                .map((s) => {
                  const v = VIBES.find((vb) => vb.label === s);
                  return v ? `${v.emoji} ${v.label}` : s;
                })
                .join(", ");
              const lines = [
                `Album Of The Day Club`,
                `\ud83c\udfad Vibe Check \u2014 ${albumKey}`,
                `My Vibes: ${vibeEmojis}`,
              ];
              if (topVibeData) {
                lines.push(
                  `Top Vibe: ${topVibeData.emoji} ${topVibeData.label} (${topVibePct}%)`,
                );
              }
              lines.push(window.location.origin);
              return lines.join("\n");
            }}
          />
        )}
        {!submitted && (
          <div className="activity-footer">
            <span className={`activity-hint${atLimit ? " at-limit" : ""}`}>
              {atLimit
                ? "Max 3 vibes! Deselect one first."
                : selected.length === 0
                  ? "Pick at least 1 vibe"
                  : `${selected.length}/3 selected`}
            </span>
            <button
              className="btn-submit"
              onClick={submit}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? "⏳ Vibing..." : "🎭 Submit Vibes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Guess the Album ─── */
function GuessGame() {
  const todayKey = getTodayKey();
  const puzzleAlbum = useMemo(() => getPuzzleAlbum(), []);
  const clues = useMemo(() => getPuzzleClues(puzzleAlbum), [puzzleAlbum]);

  const [cluesRevealed, setCluesRevealed] = useState(2);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [justRevealedClue, setJustRevealedClue] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_guess_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setCluesRevealed(Math.min(state.guesses.length + 2, 6));
      setGameOver(state.gameOver);
      setSolved(state.solved);
    }
    fetch("/api/guess")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [todayKey]);

  const saveState = (newGuesses, isGameOver, isSolved) => {
    localStorage.setItem(
      `aotd_guess_${todayKey}`,
      JSON.stringify({
        guesses: newGuesses,
        gameOver: isGameOver,
        solved: isSolved,
      }),
    );
    if (isGameOver) window.dispatchEvent(new Event("aotd-activity"));
  };

  const postResult = async (attempts, isSolved) => {
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts, solved: isSolved }),
      });
      if (res.ok) setStats((await res.json()).stats);
    } catch {
      // Silently fail — stats are non-critical for gameplay
    }
  };

  const submitGuess = async () => {
    const guess = currentGuess.trim();
    if (!guess || gameOver) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    const isCorrect = guess.toLowerCase() === puzzleAlbum.title.toLowerCase();

    if (isCorrect) {
      setSolved(true);
      setGameOver(true);
      saveState(newGuesses, true, true);
      postResult(newGuesses.length, true);
      fireConfetti({ particleCount: 120, spread: 90, startVelocity: 30 });
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      saveState(newGuesses, true, false);
      postResult(6, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
    } else {
      const nextClue = Math.min(newGuesses.length + 2, 6);
      setCluesRevealed(nextClue);
      setJustRevealedClue(nextClue - 1);
      setTimeout(() => setJustRevealedClue(-1), 400);
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      inputRef.current?.focus();
    }
  };

  const isCorrectGuess = (g) =>
    g.toLowerCase() === puzzleAlbum.title.toLowerCase();

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-question" aria-hidden="true" /> GUESS THE ALBUM —
          DAILY PUZZLE
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {gameOver
            ? solved
              ? `Solved in ${guesses.length}/6`
              : "Better luck tomorrow"
            : `Guess ${guesses.length + 1}/6`}
        </span>
      </div>
      <div className="panel-body">
        {!gameOver && guesses.length === 0 && (
          <p
            className="activity-prompt"
            style={{ margin: "0 0 8px", fontSize: "11px" }}
          >
            Guess a mystery album from the rotation. Wrong guesses reveal more
            clues!
          </p>
        )}
        {/* Clues */}
        <div className="clues-grid">
          {clues.map((clue, i) => (
            <div
              key={i}
              className={`clue ${i < cluesRevealed ? "revealed" : "hidden"}${i === justRevealedClue ? " just-revealed" : ""}`}
            >
              <span className="clue-label">{clue.label}:</span>
              <span className="clue-value">
                {i < cluesRevealed ? clue.value : "???"}
              </span>
            </div>
          ))}
        </div>

        {/* Guess history */}
        {guesses.length > 0 && (
          <GuessHistory guesses={guesses} checkFn={isCorrectGuess} />
        )}

        {/* Input */}
        {!gameOver && (
          <AlbumAutocomplete
            guesses={guesses}
            currentGuess={currentGuess}
            onGuessChange={setCurrentGuess}
            onSubmit={submitGuess}
            shaking={shaking}
            inputRef={inputRef}
          />
        )}

        {/* Game over */}
        {gameOver && (
          <div
            className={`guess-result ${solved ? "solved" : "failed"}`}
            role="status"
            aria-live="polite"
          >
            {solved ? (
              <span>
                🎉 You got it in <strong>{guesses.length}/6</strong>!
              </span>
            ) : (
              <span>
                The answer was: <strong>{puzzleAlbum.title}</strong> by{" "}
                {puzzleAlbum.artist}
              </span>
            )}

            {/* Listen link on failure */}
            {!solved && (
              <a
                href={getListenUrl(puzzleAlbum)}
                target="_blank"
                rel="noopener noreferrer"
                className="listen-btn guess-listen-btn"
              >
                ▶ Listen on YouTube
              </a>
            )}

            {stats && stats.totalPlayers > 0 && (
              <div className="guess-community">
                {stats.totalSolved}/{stats.totalPlayers} players solved it today
                ({Math.round((stats.totalSolved / stats.totalPlayers) * 100)}%)
              </div>
            )}

            {/* Attempt distribution chart */}
            {stats && stats.attemptDist && (
              <div className="attempt-chart">
                <div className="attempt-chart-title">Solve Distribution</div>
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const count = stats.attemptDist[n] || 0;
                  const maxAttempts = Math.max(
                    ...Object.values(stats.attemptDist),
                    1,
                  );
                  const pct = maxAttempts > 0 ? (count / maxAttempts) * 100 : 0;
                  const isYou = solved && guesses.length === n;
                  return (
                    <div key={n} className="attempt-row">
                      <span className="attempt-num">{n}</span>
                      <div className="attempt-bar-wrap">
                        <div
                          className={`attempt-bar${isYou ? " yours" : ""}`}
                          style={{
                            transform: `scaleX(${Math.max(pct, count > 0 ? 5 : 0) / 100})`,
                          }}
                        />
                      </div>
                      <span className="attempt-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Share card */}
            <ShareResultButton
              getText={() => {
                const squares = guesses
                  .map((g) => (isCorrectGuess(g) ? "🟩" : "⬛"))
                  .join("");
                return [
                  `Album Of The Day Club`,
                  `🎵 Daily Puzzle — ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/6`
                    : `X/6 — Better luck tomorrow`,
                  squares,
                  window.location.origin,
                ].join("\n");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Cover Art Challenge ─── */
const BLUR_LEVELS = [2, 1.5, 1, 0.5, 0];

function CoverChallenge() {
  const todayKey = getTodayKey();
  const puzzleAlbum = useMemo(() => getCoverPuzzleAlbum(), []);

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_cover_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setGameOver(state.gameOver);
      setSolved(state.solved);
    }
    fetch(`/api/guess?type=cover`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [todayKey]);

  const saveState = (newGuesses, isGameOver, isSolved) => {
    localStorage.setItem(
      `aotd_cover_${todayKey}`,
      JSON.stringify({
        guesses: newGuesses,
        gameOver: isGameOver,
        solved: isSolved,
      }),
    );
    if (isGameOver) window.dispatchEvent(new Event("aotd-activity"));
  };

  const postResult = async (attempts, isSolved) => {
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts, solved: isSolved, type: "cover" }),
      });
      if (res.ok) setStats((await res.json()).stats);
    } catch {}
  };

  const submitGuess = () => {
    const guess = currentGuess.trim();
    if (!guess || gameOver) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    const isCorrect = guess.toLowerCase() === puzzleAlbum.title.toLowerCase();

    if (isCorrect) {
      setSolved(true);
      setGameOver(true);
      saveState(newGuesses, true, true);
      postResult(newGuesses.length, true);
      fireConfetti({ particleCount: 120, spread: 90, startVelocity: 30 });
    } else if (newGuesses.length >= 5) {
      setGameOver(true);
      saveState(newGuesses, true, false);
      postResult(5, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
    } else {
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      inputRef.current?.focus();
    }
  };

  const blurLevel = gameOver
    ? 0
    : BLUR_LEVELS[Math.min(guesses.length, BLUR_LEVELS.length - 1)];

  const isCorrectGuess = (g) =>
    g.toLowerCase() === puzzleAlbum.title.toLowerCase();

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-star" aria-hidden="true" /> COVER ART CHALLENGE
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {gameOver
            ? solved
              ? `Solved in ${guesses.length}/5`
              : "Better luck tomorrow"
            : `Guess ${guesses.length + 1}/5`}
        </span>
      </div>
      <div className="panel-body">
        <p className="activity-prompt" style={{ textAlign: "center" }}>
          Can you identify the album from its blurred cover art? Each wrong
          guess clears the blur a little more.
        </p>

        {/* Blurred cover */}
        <div className="cover-challenge-img-wrap">
          <img
            src={puzzleAlbum.image}
            alt={
              gameOver ? `${puzzleAlbum.title} cover` : "Mystery album cover"
            }
            className="cover-challenge-img"
            style={{
              filter: `blur(${blurLevel}px)`,
              transition: "filter 0.6s ease",
            }}
            draggable={false}
          />
          {!gameOver && (
            <div className="cover-challenge-overlay">
              <span className="cover-challenge-q">?</span>
            </div>
          )}
        </div>

        {/* Guess history */}
        {guesses.length > 0 && (
          <GuessHistory guesses={guesses} checkFn={isCorrectGuess} />
        )}

        {/* Input */}
        {!gameOver && (
          <AlbumAutocomplete
            guesses={guesses}
            currentGuess={currentGuess}
            onGuessChange={setCurrentGuess}
            onSubmit={submitGuess}
            shaking={shaking}
            inputRef={inputRef}
          />
        )}

        {/* Game over */}
        {gameOver && (
          <div
            className={`guess-result ${solved ? "solved" : "failed"}`}
            role="status"
            aria-live="polite"
          >
            {solved ? (
              <span>
                🎉 You got it in <strong>{guesses.length}/5</strong>!
              </span>
            ) : (
              <span>
                The answer was: <strong>{puzzleAlbum.title}</strong> by{" "}
                {puzzleAlbum.artist}
              </span>
            )}
            {!solved && (
              <a
                href={getListenUrl(puzzleAlbum)}
                target="_blank"
                rel="noopener noreferrer"
                className="listen-btn guess-listen-btn"
              >
                ▶ Listen on YouTube
              </a>
            )}
            {stats && stats.totalPlayers > 0 && (
              <div className="guess-community">
                {stats.totalSolved}/{stats.totalPlayers} players solved it today
                ({Math.round((stats.totalSolved / stats.totalPlayers) * 100)}%)
              </div>
            )}
            <ShareResultButton
              getText={() => {
                const squares = guesses
                  .map((g) => (isCorrectGuess(g) ? "🟩" : "⬛"))
                  .join("");
                return [
                  `Album Of The Day Club`,
                  `🖼️ Cover Art Challenge — ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/5`
                    : `X/5 — Better luck tomorrow`,
                  squares,
                  window.location.origin,
                ].join("\n");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Heardle / Audio Intro ─── */
const HEARDLE_CLIP_LENGTHS = [1, 2, 4, 8, 16, 30];

function HeardleGame() {
  const todayKey = getTodayKey();
  const puzzleAlbum = useMemo(() => getHeardleAlbum(), []);
  const hasYouTube = !!puzzleAlbum.youtubeId;

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const inputRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_heardle_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setGameOver(state.gameOver);
      setSolved(state.solved);
    }
    fetch(`/api/guess?type=heardle`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [todayKey]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!hasYouTube) return;

    let cancelled = false;

    function initPlayer() {
      if (cancelled || playerRef.current) return;
      playerRef.current = new window.YT.Player("heardle-player", {
        height: "0",
        width: "0",
        videoId: puzzleAlbum.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
        },
        events: { onReady: () => !cancelled && setPlayerReady(true) },
      });
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      cancelled = true;
      window.onYouTubeIframeAPIReady = null;
      clearTimeout(timerRef.current);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
      playerRef.current = null;
    };
  }, [hasYouTube, puzzleAlbum.youtubeId]);

  const clipLength =
    HEARDLE_CLIP_LENGTHS[
      Math.min(guesses.length, HEARDLE_CLIP_LENGTHS.length - 1)
    ];

  const playClip = () => {
    if (!playerRef.current || playing) return;
    const player = playerRef.current;
    player.seekTo(0, true);
    player.playVideo();
    setPlaying(true);
    timerRef.current = setTimeout(() => {
      player.pauseVideo();
      setPlaying(false);
    }, clipLength * 1000);
  };

  const saveState = (newGuesses, isGameOver, isSolved) => {
    localStorage.setItem(
      `aotd_heardle_${todayKey}`,
      JSON.stringify({
        guesses: newGuesses,
        gameOver: isGameOver,
        solved: isSolved,
      }),
    );
    if (isGameOver) window.dispatchEvent(new Event("aotd-activity"));
  };

  const postResult = async (attempts, isSolved) => {
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts, solved: isSolved, type: "heardle" }),
      });
      if (res.ok) setStats((await res.json()).stats);
    } catch {}
  };

  const submitGuess = () => {
    const guess = currentGuess.trim();
    if (!guess || gameOver) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    const isCorrect = guess.toLowerCase() === puzzleAlbum.title.toLowerCase();

    if (isCorrect) {
      setSolved(true);
      setGameOver(true);
      saveState(newGuesses, true, true);
      postResult(newGuesses.length, true);
      fireConfetti({ particleCount: 120, spread: 90, startVelocity: 30 });
      if (playerRef.current) playerRef.current.pauseVideo();
      clearTimeout(timerRef.current);
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      saveState(newGuesses, true, false);
      postResult(6, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      if (playerRef.current) playerRef.current.pauseVideo();
      clearTimeout(timerRef.current);
    } else {
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      inputRef.current?.focus();
    }
  };

  // If no YouTube ID, fall back to Cover Challenge
  if (!hasYouTube) return <CoverChallenge />;

  const isCorrectGuess = (g) =>
    g.toLowerCase() === puzzleAlbum.title.toLowerCase();

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-sound-on" aria-hidden="true" /> HEARDLE — NAME
          THAT TUNE
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {gameOver
            ? solved
              ? `Solved in ${guesses.length}/6`
              : "Better luck tomorrow"
            : `Guess ${guesses.length + 1}/6`}
        </span>
      </div>
      <div className="panel-body">
        <p className="activity-prompt" style={{ textAlign: "center" }}>
          Listen to progressively longer clips and guess the album. You get{" "}
          {clipLength}s this round.
        </p>

        {/* Hidden YouTube player */}
        <div
          id="heardle-player"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        />

        {/* Play button */}
        <div className="heardle-controls">
          <button
            className="btn-submit heardle-play-btn"
            onClick={playClip}
            disabled={!playerReady || playing || gameOver}
          >
            {playing
              ? `🔊 Playing ${clipLength}s...`
              : `▶ Play ${clipLength}s clip`}
          </button>
          <div className="heardle-timeline">
            {HEARDLE_CLIP_LENGTHS.map((len, i) => (
              <div
                key={len}
                className={`heardle-tick${i <= guesses.length ? " active" : ""}${i === guesses.length && !gameOver ? " current" : ""}`}
              >
                {len}s
              </div>
            ))}
          </div>
        </div>

        {/* Guess history */}
        {guesses.length > 0 && (
          <GuessHistory guesses={guesses} checkFn={isCorrectGuess} />
        )}

        {/* Input */}
        {!gameOver && (
          <AlbumAutocomplete
            guesses={guesses}
            currentGuess={currentGuess}
            onGuessChange={setCurrentGuess}
            onSubmit={submitGuess}
            shaking={shaking}
            inputRef={inputRef}
          />
        )}

        {/* Game over */}
        {gameOver && (
          <div
            className={`guess-result ${solved ? "solved" : "failed"}`}
            role="status"
            aria-live="polite"
          >
            {solved ? (
              <span>
                🎉 You got it in <strong>{guesses.length}/6</strong>!
              </span>
            ) : (
              <span>
                The answer was: <strong>{puzzleAlbum.title}</strong> by{" "}
                {puzzleAlbum.artist}
              </span>
            )}
            {!solved && (
              <a
                href={getListenUrl(puzzleAlbum)}
                target="_blank"
                rel="noopener noreferrer"
                className="listen-btn guess-listen-btn"
              >
                ▶ Listen on YouTube
              </a>
            )}
            {stats && stats.totalPlayers > 0 && (
              <div className="guess-community">
                {stats.totalSolved}/{stats.totalPlayers} players solved it today
                ({Math.round((stats.totalSolved / stats.totalPlayers) * 100)}%)
              </div>
            )}
            <ShareResultButton
              getText={() => {
                const squares = guesses
                  .map((g) => (isCorrectGuess(g) ? "🟩" : "⬛"))
                  .join("");
                return [
                  `Album Of The Day Club`,
                  `🎧 Heardle — ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/6`
                    : `X/6 — Better luck tomorrow`,
                  squares,
                  window.location.origin,
                ].join("\n");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Lyric Fill-in-the-Blank ─── */
function LyricGame() {
  const todayKey = getTodayKey();
  const puzzleAlbum = useMemo(() => getLyricPuzzleAlbum(), []);
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  // Load lyrics data
  useEffect(() => {
    import("@/lib/lyrics.json")
      .then((mod) => {
        const key =
          `${puzzleAlbum.artist} - ${puzzleAlbum.title}`.toLowerCase();
        const data = mod.default || mod;
        // Find matching lyrics (case-insensitive key match)
        const match = Object.entries(data).find(
          ([k]) => k.toLowerCase() === key,
        );
        if (match) setLyrics(match[1]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [puzzleAlbum]);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_lyric_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setGameOver(state.gameOver);
      setSolved(state.solved);
    }
    fetch(`/api/guess?type=lyric`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [todayKey]);

  // If no lyrics available, fall back to Cover Challenge
  if (!loading && !lyrics) return <CoverChallenge />;
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span>
            <i className="hn hn-music" aria-hidden="true" /> LYRIC CHALLENGE
          </span>
        </div>
        <div
          className="panel-body"
          style={{ textAlign: "center", padding: 30 }}
        >
          Loading...
        </div>
      </div>
    );
  }

  // Pick a lyric line deterministically based on day
  const dayOfYear = getDayOfYear();
  const lineIndex = dayOfYear % lyrics.lines.length;
  const fullLine = lyrics.lines[lineIndex];

  // Blank out 1-2 significant words (>3 chars)
  const words = fullLine.split(" ");
  const blankableIndices = words
    .map((w, i) => ({ w: w.replace(/[^a-zA-Z]/g, ""), i }))
    .filter((x) => x.w.length > 3);

  const seed = dayOfYear * 997 + puzzleAlbum.title.length;
  const blankIdx1 =
    blankableIndices.length > 0
      ? blankableIndices[seed % blankableIndices.length].i
      : 0;
  const blankIdx2 =
    blankableIndices.length > 1
      ? blankableIndices[(seed + 7) % blankableIndices.length].i
      : -1;

  const blankedWords = words.map((w, i) => {
    if (i === blankIdx1 || (i === blankIdx2 && blankIdx2 !== blankIdx1)) {
      return "____";
    }
    return w;
  });
  const blankedLine = blankedWords.join(" ");

  const answerWords = [];
  if (blankIdx1 >= 0)
    answerWords.push(words[blankIdx1].replace(/[^a-zA-Z']/g, "").toLowerCase());
  if (blankIdx2 >= 0 && blankIdx2 !== blankIdx1)
    answerWords.push(words[blankIdx2].replace(/[^a-zA-Z']/g, "").toLowerCase());

  const checkAnswer = (guess) => {
    const guessWords = guess
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z' ]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    // Every answer word must appear as a whole word in the guess
    return answerWords.every((a) => guessWords.some((w) => w === a));
  };

  const saveState = (newGuesses, isGameOver, isSolved) => {
    localStorage.setItem(
      `aotd_lyric_${todayKey}`,
      JSON.stringify({
        guesses: newGuesses,
        gameOver: isGameOver,
        solved: isSolved,
      }),
    );
    if (isGameOver) window.dispatchEvent(new Event("aotd-activity"));
  };

  const postResult = async (attempts, isSolved) => {
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts, solved: isSolved, type: "lyric" }),
      });
      if (res.ok) setStats((await res.json()).stats);
    } catch {}
  };

  const submitGuess = () => {
    const guess = currentGuess.trim();
    if (!guess || gameOver) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (checkAnswer(guess)) {
      setSolved(true);
      setGameOver(true);
      saveState(newGuesses, true, true);
      postResult(newGuesses.length, true);
      fireConfetti({ particleCount: 80, spread: 60 });
    } else if (newGuesses.length >= 4) {
      setGameOver(true);
      saveState(newGuesses, true, false);
      postResult(4, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
    } else {
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      inputRef.current?.focus();
    }
  };

  // Hints based on attempts
  const hints = [];
  const firstAnswer = answerWords[0] || "";
  if (guesses.length >= 1 && !gameOver && firstAnswer.length > 0)
    hints.push(`The missing word has ${firstAnswer.length} letters`);
  if (guesses.length >= 2 && !gameOver && firstAnswer.length > 0)
    hints.push(`It starts with "${firstAnswer[0].toUpperCase()}"`);
  if (guesses.length >= 3 && !gameOver)
    hints.push(`From the album "${puzzleAlbum.title}"`);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-music" aria-hidden="true" /> LYRIC CHALLENGE
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {gameOver
            ? solved
              ? `Solved in ${guesses.length}/4`
              : "Better luck tomorrow"
            : `Guess ${guesses.length + 1}/4`}
        </span>
      </div>
      <div className="panel-body">
        <p className="activity-prompt" style={{ textAlign: "center" }}>
          Fill in the missing word(s) from this lyric. You have 4 attempts.
        </p>

        {/* Lyric display */}
        <div className="lyric-display">
          <span className="lyric-quote">&ldquo;</span>
          <span className="lyric-text">{blankedLine}</span>
          <span className="lyric-quote">&rdquo;</span>
        </div>

        {/* Hints */}
        {hints.length > 0 && (
          <div className="lyric-hints">
            {hints.map((h, i) => (
              <div key={i} className="lyric-hint">
                💡 {h}
              </div>
            ))}
          </div>
        )}

        {/* Guess history */}
        {guesses.length > 0 && (
          <GuessHistory guesses={guesses} checkFn={checkAnswer} />
        )}

        {/* Input */}
        {!gameOver && (
          <div className={`guess-input-wrap${shaking ? " shaking" : ""}`}>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              value={currentGuess}
              aria-label="Guess the missing lyrics"
              onChange={(e) => setCurrentGuess(e.target.value)}
              placeholder="Type the missing word(s)..."
              onKeyDown={(e) => {
                if (e.key === "Enter") submitGuess();
              }}
            />
            <button
              className="btn-submit"
              onClick={submitGuess}
              disabled={!currentGuess.trim()}
            >
              Guess
            </button>
          </div>
        )}

        {/* Game over */}
        {gameOver && (
          <div
            className={`guess-result ${solved ? "solved" : "failed"}`}
            role="status"
            aria-live="polite"
          >
            {solved ? (
              <span>
                🎉 You got it in <strong>{guesses.length}/4</strong>!
              </span>
            ) : (
              <span>
                The answer was: <strong>{answerWords.join(", ")}</strong>
                <br />
                <em style={{ fontSize: 11 }}>
                  From &ldquo;{puzzleAlbum.title}&rdquo; by {puzzleAlbum.artist}
                </em>
              </span>
            )}
            {stats && stats.totalPlayers > 0 && (
              <div className="guess-community">
                {stats.totalSolved}/{stats.totalPlayers} players solved it today
                ({Math.round((stats.totalSolved / stats.totalPlayers) * 100)}%)
              </div>
            )}
            <ShareResultButton
              getText={() => {
                const squares = guesses
                  .map((g) => (checkAnswer(g) ? "🟩" : "⬛"))
                  .join("");
                return [
                  `Album Of The Day Club`,
                  `🎤 Lyric Challenge — ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/4`
                    : `X/4 — Better luck tomorrow`,
                  squares,
                  window.location.origin,
                ].join("\n");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Artist Scramble ─── */
function ScrambleGame() {
  const todayKey = getTodayKey();
  const puzzleAlbum = useMemo(() => getScrambleAlbum(), []);
  const scrambled = useMemo(
    () => scrambleArtist(puzzleAlbum.artist, getDayOfYear()),
    [puzzleAlbum],
  );

  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  const maxAttempts = 5;

  // Hints revealed after each wrong guess
  const hints = useMemo(() => {
    return [
      { label: "Genre", value: puzzleAlbum.genre },
      { label: "Decade", value: `${Math.floor(puzzleAlbum.year / 10) * 10}s` },
      {
        label: "Title starts with",
        value: `"${puzzleAlbum.title[0]}"`,
      },
      { label: "Year", value: puzzleAlbum.year.toString() },
    ];
  }, [puzzleAlbum]);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_scramble_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setGameOver(state.gameOver);
      setSolved(state.solved);
    }
    fetch(`/api/guess?type=scramble`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [todayKey]);

  const saveState = (newGuesses, isGameOver, isSolved) => {
    localStorage.setItem(
      `aotd_scramble_${todayKey}`,
      JSON.stringify({
        guesses: newGuesses,
        gameOver: isGameOver,
        solved: isSolved,
      }),
    );
    if (isGameOver) window.dispatchEvent(new Event("aotd-activity"));
  };

  const postResult = async (attempts, isSolved) => {
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempts,
          solved: isSolved,
          type: "scramble",
        }),
      });
      if (res.ok) setStats((await res.json()).stats);
    } catch {}
  };

  const submitGuess = async () => {
    const guess = currentGuess.trim();
    if (!guess || gameOver) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");
    setShowSuggestions(false);

    const isCorrect = guess.toLowerCase() === puzzleAlbum.title.toLowerCase();

    if (isCorrect) {
      setSolved(true);
      setGameOver(true);
      saveState(newGuesses, true, true);
      postResult(newGuesses.length, true);
      fireConfetti({ particleCount: 120, spread: 90, startVelocity: 30 });
    } else if (newGuesses.length >= maxAttempts) {
      setGameOver(true);
      saveState(newGuesses, true, false);
      postResult(maxAttempts, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
    } else {
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_MS);
      inputRef.current?.focus();
    }
  };

  const excluded = useMemo(
    () => new Set(guesses.map((g) => g.toLowerCase())),
    [guesses],
  );
  const filtered = useMemo(() => {
    if (!currentGuess.trim()) return [];
    const q = currentGuess.toLowerCase();
    return ALBUM_SEARCH.filter(
      (a) =>
        !excluded.has(a._titleLc) &&
        (a._titleLc.includes(q) || a._artistLc.includes(q)),
    ).slice(0, MAX_SUGGESTIONS);
  }, [currentGuess, excluded]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-question" aria-hidden="true" /> ARTIST SCRAMBLE
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {gameOver
            ? solved
              ? `Solved in ${guesses.length}/${maxAttempts}`
              : "Better luck tomorrow"
            : `Guess ${guesses.length + 1}/${maxAttempts}`}
        </span>
      </div>
      <div className="panel-body">
        <p className="activity-prompt">
          Unscramble the artist name and guess the album.
        </p>

        {/* Scrambled artist name */}
        <div className="scramble-display">{scrambled}</div>

        {/* Hints — revealed progressively after wrong guesses */}
        {guesses.length > 0 && (
          <div className="clues-grid">
            {hints.map((hint, i) => (
              <div
                key={i}
                className={`clue ${i < guesses.length ? "revealed" : "hidden"}`}
              >
                <span className="clue-label">{hint.label}:</span>
                <span className="clue-value">
                  {i < guesses.length ? hint.value : "???"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Guess history */}
        {guesses.length > 0 && (
          <div className="guess-history">
            {guesses.map((g, i) => (
              <div key={i} className="guess-row">
                <span className="guess-num">#{i + 1}</span>
                <span className="guess-text">{g}</span>
                <span className="guess-icon">
                  {g.toLowerCase() === puzzleAlbum.title.toLowerCase()
                    ? "\u2705"
                    : "\u274c"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {!gameOver && (
          <div className="guess-input" style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Guess the album"
              placeholder="Type an album name..."
              value={currentGuess}
              onChange={(e) => {
                setCurrentGuess(e.target.value);
                setShowSuggestions(true);
                setSuggestionIndex(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSuggestionIndex((prev) =>
                    Math.min(prev + 1, filtered.length - 1),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSuggestionIndex((prev) => Math.max(prev - 1, -1));
                } else if (e.key === "Enter") {
                  if (suggestionIndex >= 0 && filtered[suggestionIndex]) {
                    setCurrentGuess(filtered[suggestionIndex].title);
                    setShowSuggestions(false);
                  } else {
                    submitGuess();
                  }
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => currentGuess.trim() && setShowSuggestions(true)}
              className={shaking ? "shaking" : ""}
            />
            <button onClick={submitGuess}>Guess</button>
            {showSuggestions && filtered.length > 0 && (
              <div className="suggestions">
                {filtered.map((a, i) => (
                  <div
                    key={a.title}
                    className={`suggestion-item${i === suggestionIndex ? " active" : ""}`}
                    onMouseDown={() => {
                      setCurrentGuess(a.title);
                      setShowSuggestions(false);
                    }}
                  >
                    {a.cover} {a.title} &mdash; {a.artist}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Game over results */}
        {gameOver && (
          <div className="guess-result" role="status" aria-live="polite">
            {solved ? (
              <div className="guess-correct">
                {"\ud83c\udf89"} You got it in {guesses.length}/{maxAttempts}!
              </div>
            ) : (
              <div className="guess-wrong">
                The answer was: <strong>{puzzleAlbum.title}</strong> by{" "}
                {puzzleAlbum.artist}
              </div>
            )}
            {!solved && puzzleAlbum.youtubeId && (
              <a
                href={`https://www.youtube.com/watch?v=${puzzleAlbum.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="listen-link"
              >
                {"\u25b6"} Listen on YouTube
              </a>
            )}
            {gameOver && (
              <div className="scramble-reveal">
                {scrambled} {"\u2192"} {puzzleAlbum.artist}
              </div>
            )}
            {stats && stats.totalPlayers > 0 && (
              <div className="guess-community">
                {stats.totalSolved}/{stats.totalPlayers} players solved it today
                ({Math.round((stats.totalSolved / stats.totalPlayers) * 100)}%)
              </div>
            )}
            <ShareResultButton
              getText={() => {
                const squares = guesses
                  .map((g) =>
                    g.toLowerCase() === puzzleAlbum.title.toLowerCase()
                      ? "\ud83d\udfe9"
                      : "\u2b1b",
                  )
                  .join("");
                return [
                  `Album Of The Day Club`,
                  `\ud83d\udd00 Artist Scramble \u2014 ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/${maxAttempts}`
                    : `X/${maxAttempts} \u2014 Better luck tomorrow`,
                  squares,
                  window.location.origin,
                ].join("\n");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Yesterday's Results ─── */
function YesterdayRecap() {
  const [expanded, setExpanded] = useState(false);
  const [yesterdayData, setYesterdayData] = useState(null);
  const [hasData, setHasData] = useState(false);

  // Compute yesterday in UTC to match getTodayKey() which uses toISOString (UTC)
  const yesterday = useMemo(() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
    );
  }, []);
  const yesterdayKey = yesterday.toISOString().split("T")[0];
  const yesterdayAlbum = useMemo(() => getAlbumForDate(yesterday), [yesterday]);

  useEffect(() => {
    const rated = localStorage.getItem(`aotd_rated_${yesterdayKey}`);
    const vibed = localStorage.getItem(`aotd_vibed_${yesterdayKey}`);
    const guessRaw = localStorage.getItem(`aotd_guess_${yesterdayKey}`);
    const coverRaw = localStorage.getItem(`aotd_cover_${yesterdayKey}`);
    const heardleRaw = localStorage.getItem(`aotd_heardle_${yesterdayKey}`);
    const lyricRaw = localStorage.getItem(`aotd_lyric_${yesterdayKey}`);

    if (!rated && !vibed && !guessRaw && !coverRaw && !heardleRaw && !lyricRaw)
      return;
    setHasData(true);

    const data = {
      myRating: rated ? parseInt(rated) : null,
      myVibes: null,
      myGuess: null,
    };
    if (vibed) {
      try {
        data.myVibes = JSON.parse(vibed);
      } catch {}
    }
    for (const raw of [guessRaw, coverRaw, heardleRaw, lyricRaw]) {
      if (raw) {
        try {
          data.myGuess = JSON.parse(raw);
          break;
        } catch {}
      }
    }

    // Fetch community data
    Promise.all([
      fetch(`/api/rate?key=${yesterdayKey}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/vibe?key=${yesterdayKey}`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([rateData, vibeData]) => {
      data.communityAvg = rateData?.average ?? null;
      data.communityTotal = rateData?.total ?? 0;
      data.topVibe = vibeData?.distribution
        ? Object.entries(vibeData.distribution).sort(
            (a, b) => b[1] - a[1],
          )[0]?.[0]
        : null;
      setYesterdayData(data);
    });
  }, [yesterdayKey]);

  if (!hasData) return null;

  return (
    <div className="panel yesterday-recap">
      <div
        className="panel-header"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(!expanded);
        }}
        aria-expanded={expanded}
      >
        <span>
          <i className="hn hn-calender" aria-hidden="true" /> YESTERDAY&apos;S
          RECAP — {yesterdayAlbum.title}
        </span>
        <span style={{ fontSize: "14px" }}>{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && yesterdayData && (
        <div className="panel-body yesterday-body">
          <div className="yesterday-album-row">
            <span className="yesterday-emoji">{yesterdayAlbum.cover}</span>
            <div>
              <strong>{yesterdayAlbum.title}</strong>
              <div style={{ fontSize: 11, color: "#888" }}>
                by {yesterdayAlbum.artist} · {yesterdayAlbum.genre} ·{" "}
                {yesterdayAlbum.year}
              </div>
            </div>
          </div>
          <div className="yesterday-stats-row">
            {yesterdayData.myRating && (
              <div className="yesterday-stat">
                <div className="yesterday-stat-num">
                  ⭐ {yesterdayData.myRating}/10
                </div>
                <div className="yesterday-stat-label">Your Rating</div>
              </div>
            )}
            {yesterdayData.communityAvg !== null && (
              <div className="yesterday-stat">
                <div className="yesterday-stat-num">
                  📊 {yesterdayData.communityAvg}/10
                </div>
                <div className="yesterday-stat-label">
                  Community ({yesterdayData.communityTotal} votes)
                </div>
              </div>
            )}
            {yesterdayData.topVibe && (
              <div className="yesterday-stat">
                <div className="yesterday-stat-num">
                  {VIBES.find((v) => v.label === yesterdayData.topVibe)
                    ?.emoji || "🎵"}{" "}
                  {yesterdayData.topVibe}
                </div>
                <div className="yesterday-stat-label">Top Vibe</div>
              </div>
            )}
            {yesterdayData.myGuess && (
              <div className="yesterday-stat">
                <div className="yesterday-stat-num">
                  {yesterdayData.myGuess.solved ? "✅" : "❌"}{" "}
                  {yesterdayData.myGuess.solved
                    ? `${yesterdayData.myGuess.guesses.length} tries`
                    : "Missed"}
                </div>
                <div className="yesterday-stat-label">Puzzle</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Archive Section ─── */
function ArchiveSection() {
  const rows = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const result = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const album = getAlbumForDate(date);
      result.push({ ...album, dateStr: fmt.format(date) });
    }
    return result;
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-calender" aria-hidden="true" /> ARCHIVE — RECENT
          ALBUMS
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          Last 30 days
        </span>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table className="archive-table">
          <thead>
            <tr>
              <th>Date</th>
              <th></th>
              <th>Album</th>
              <th>Artist</th>
              <th className="archive-hide-mobile">Genre</th>
              <th className="archive-hide-mobile">Year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} className={i % 2 === 0 ? "even" : ""}>
                <td className="archive-date">{row.dateStr}</td>
                <td className="archive-emoji">{row.cover}</td>
                <td className="archive-title">{row.title}</td>
                <td className="archive-artist">{row.artist}</td>
                <td className="archive-genre archive-hide-mobile">
                  {row.genre}
                </td>
                <td className="archive-year archive-hide-mobile">{row.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Stats Section ─── */
function StatsSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span>
            <i className="hn hn-trending" aria-hidden="true" /> SITE STATISTICS
          </span>
        </div>
        <div className="panel-body">
          <p className="activity-prompt">Loading stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span>
            <i className="hn hn-trending" aria-hidden="true" /> SITE STATISTICS
          </span>
        </div>
        <div className="panel-body">
          <p className="activity-prompt">Could not load statistics.</p>
        </div>
      </div>
    );
  }

  const solveRate =
    stats.totalPuzzlePlayed > 0
      ? Math.round((stats.totalPuzzleSolved / stats.totalPuzzlePlayed) * 100)
      : 0;

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <span>
            <i className="hn hn-trending" aria-hidden="true" /> SITE STATISTICS
          </span>
        </div>
        <div className="panel-body">
          {stats.totalRatings === 0 && (
            <p
              className="activity-prompt"
              style={{ textAlign: "center", marginBottom: 12 }}
            >
              No ratings yet — be the first! Head to <strong>Home</strong> and
              rate today&apos;s album.
            </p>
          )}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-num">{stats.totalRatings}</div>
              <div className="stat-label">Total Ratings</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.avgRating}/10</div>
              <div className="stat-label">Global Average</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.albumsRated}</div>
              <div className="stat-label">Albums Rated</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{ALBUMS.length}</div>
              <div className="stat-label">In Rotation</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.totalPuzzlePlayed}</div>
              <div className="stat-label">Puzzles Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{solveRate}%</div>
              <div className="stat-label">Puzzle Solve Rate</div>
            </div>
          </div>
        </div>
      </div>

      {stats.topVibes.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span>
              <i className="hn hn-headphones" aria-hidden="true" /> TOP VIBES —
              ALL TIME
            </span>
          </div>
          <div className="panel-body">
            <div className="top-vibes-list">
              {stats.topVibes.map((v, i) => {
                const vibeData = VIBES.find((vb) => vb.label === v.vibe);
                const maxCount = stats.topVibes[0].count;
                const pct = (v.count / maxCount) * 100;
                return (
                  <div key={v.vibe} className="top-vibe-row">
                    <span className="top-vibe-rank">#{i + 1}</span>
                    <img
                      src={
                        vibeData?.icon || "/pixel-icons/music-notes-music-1.svg"
                      }
                      alt=""
                      className="top-vibe-pixel-icon"
                      aria-hidden="true"
                    />
                    <span className="top-vibe-name">{v.vibe}</span>
                    <div className="top-vibe-bar-wrap">
                      <div
                        className="top-vibe-bar"
                        style={{ transform: `scaleX(${pct / 100})` }}
                      />
                    </div>
                    <span className="top-vibe-count">{v.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── FAQ Section ─── */
const FAQ_ITEMS = [
  {
    q: "How does the daily album work?",
    a: `Every day at midnight UTC, a new album is selected from our rotation of ${ALBUMS.length}+ albums. The selection uses a seeded shuffle — the same date always shows the same album, but the order feels random. You'll see everything from classic rock to lofi mixes to obscure deep cuts.`,
  },
  {
    q: "What is Rate & Reveal?",
    a: "Rate the daily album from 1-10, then see how everyone else rated it. Your rating is anonymous and permanent — no take-backs. Once you submit, you'll see the full distribution histogram and where you stand.",
  },
  {
    q: "What are Vibes?",
    a: "Vibes let you describe how the album made you feel. Pick up to 3 moods (like Melancholy, Energetic, Dreamy, etc.) and see what everyone else felt. It's a collective emotional fingerprint for each album.",
  },
  {
    q: "How does the daily puzzle work?",
    a: "Guess the Album gives you 6 attempts to identify a mystery album from the rotation. You get progressive clues: genre, decade, title word count, artist initial, release year, and finally the full artist name. The puzzle album is always different from the featured album.",
  },
  {
    q: "Do I need an account?",
    a: "Nope. Everything is anonymous. Your participation is tracked locally in your browser so you can only rate/vibe/guess once per day, but we never collect accounts, emails, or personal data.",
  },
  {
    q: "When does the album change?",
    a: "Midnight UTC, every day. All ratings, vibes, and puzzle progress reset with the new album.",
  },
  {
    q: "What kind of albums are in the rotation?",
    a: "A wide mix: classic albums, deep cuts, lofi mixes, DJ sets, ambient compilations, bedroom pop, soundtracks, live sessions, vaporwave, and international music. We aim for variety over mainstream hits.",
  },
];

/** Shared bingo data hook — used by BingoSection and BingoMini */
function useBingoData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const card = useMemo(() => getBingoCard(year, month), [year, month]);
  const matched = useMemo(() => getMonthMatches(year, month), [year, month]);
  const matchCount = card.filter(
    (c) => c.free || matched.has(c.category),
  ).length;
  const hasBingo = useMemo(() => checkBingo(card, matched), [card, matched]);
  const nearLines = useMemo(
    () => getNearBingoLines(card, matched),
    [card, matched],
  );
  // Today's genre category for highlighting
  const todayAlbum = useMemo(() => getAlbumForDate(new Date()), []);
  const todayCategory = getGenreCategory(todayAlbum.genre);
  return {
    year,
    month,
    monthName,
    card,
    matched,
    matchCount,
    hasBingo,
    nearLines,
    todayCategory,
  };
}

function BingoMini({ onNavigate }) {
  const { matchCount, hasBingo, nearLines } = useBingoData();
  const nearMsg =
    nearLines.length > 0
      ? `1 away from ${nearLines.length > 1 ? `${nearLines.length} lines` : "a line"}! Need: ${nearLines[0].missing}`
      : null;
  return (
    <div
      className="bingo-mini"
      onClick={() => onNavigate("bingo")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onNavigate("bingo")}
    >
      <span className="bingo-mini-label">
        {hasBingo ? "\ud83c\udf89 BINGO!" : `\u2b50 Bingo: ${matchCount}/25`}
      </span>
      {nearMsg && !hasBingo && (
        <span className="bingo-mini-near">{nearMsg}</span>
      )}
    </div>
  );
}

function BingoSection() {
  const {
    year,
    month,
    monthName,
    card,
    matched,
    matchCount,
    hasBingo,
    nearLines,
    todayCategory,
  } = useBingoData();

  useEffect(() => {
    if (hasBingo) {
      const celebrated = localStorage.getItem(
        `aotd_bingo_celebrated_${year}-${month}`,
      );
      if (!celebrated) {
        fireConfetti({ particleCount: 100, spread: 80 });
        localStorage.setItem(`aotd_bingo_celebrated_${year}-${month}`, "1");
      }
    }
  }, [hasBingo, year, month]);

  // Cells that are part of a near-bingo line (for subtle highlight)
  const nearCells = useMemo(() => {
    const s = new Set();
    for (const line of nearLines) {
      for (const ci of line.cells) s.add(ci);
    }
    return s;
  }, [nearLines]);

  const getShareText = () => {
    const lines = [`Genre Bingo \u2014 ${monthName} ${year}`];
    for (let r = 0; r < 5; r++) {
      let row = "";
      for (let c = 0; c < 5; c++) {
        const cell = card[r * 5 + c];
        if (cell.free) row += "\u2b50";
        else if (matched.has(cell.category)) row += "\ud83d\udfe9";
        else row += "\u2b1c";
      }
      lines.push(row);
    }
    lines.push(`${matchCount}/25 matched${hasBingo ? " \u2014 BINGO!" : ""}`);
    lines.push(window.location.origin);
    return lines.join("\n");
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-star" aria-hidden="true" /> GENRE BINGO &mdash;{" "}
          {monthName.toUpperCase()}
        </span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
          {matchCount}/25
        </span>
      </div>
      <div className="panel-body">
        <p className="activity-prompt" style={{ textAlign: "center" }}>
          Genres light up as they appear this month. Get 5 in a row for BINGO!
        </p>
        {hasBingo && (
          <div className="bingo-win">
            \ud83c\udf89 BINGO! You got 5 in a row!
          </div>
        )}
        {!hasBingo && nearLines.length > 0 && (
          <div className="bingo-near">
            \ud83d\udd25 Almost there! Need{" "}
            {nearLines
              .slice(0, 2)
              .map((l) => <strong key={l.type + l.index}>{l.missing}</strong>)
              .reduce(
                (acc, el, i) => (i === 0 ? [el] : [...acc, " or ", el]),
                [],
              )}{" "}
            for bingo
          </div>
        )}
        <div className="bingo-grid">
          {card.map((cell, i) => {
            const isMatched = cell.free || matched.has(cell.category);
            const isToday = !cell.free && cell.category === todayCategory;
            const isNear = nearCells.has(i) && !isMatched;
            return (
              <div
                key={i}
                className={`bingo-cell${isMatched ? " matched" : ""}${cell.free ? " free" : ""}${isToday && isMatched ? " today" : ""}${isNear ? " near" : ""}`}
                title={
                  isToday
                    ? "Today's genre!"
                    : isNear
                      ? "1 away from bingo!"
                      : undefined
                }
              >
                {cell.free ? "\u2b50" : cell.category}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <ShareResultButton
            label="\ud83d\udccb Share Bingo"
            getText={getShareText}
          />
        </div>
      </div>
    </div>
  );
}

function FAQSection() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>
          <i className="hn hn-question" aria-hidden="true" /> FREQUENTLY ASKED
          QUESTIONS
        </span>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="faq-thread">
            <div className="faq-question">
              <span className="faq-icon">Q:</span>
              <span>{item.q}</span>
            </div>
            <div className="faq-answer">
              <span className="faq-icon faq-icon-a">A:</span>
              <span>{item.a}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Countdown to next album ─── */
const NextAlbumCountdown = memo(function NextAlbumCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const diff = tomorrow - now;
      if (diff <= 0) {
        setTimeLeft("Any moment now\u2026");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else if (m >= 5) setTimeLeft(`${m}m`);
      else setTimeLeft(`${m}m ${s}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="wrap-countdown">
      Next album in <span className="countdown-time">{timeLeft}</span>
    </div>
  );
});

/* ─── Personal stats from localStorage ─── */
function computePersonalStats() {
  let ratedCount = 0;
  let ratingSum = 0;
  let puzzlesSolved = 0;
  let puzzlesAttempted = 0;
  const vibeCounts = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("aotd_")) continue;

    if (key.startsWith("aotd_rated_")) {
      const val = parseInt(localStorage.getItem(key), 10);
      if (val > 0 && val <= 10) {
        ratedCount++;
        ratingSum += val;
      }
    } else if (key.startsWith("aotd_vibed_")) {
      try {
        const vibes = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(vibes)) {
          vibes.forEach((v) => {
            vibeCounts[v] = (vibeCounts[v] || 0) + 1;
          });
        }
      } catch {}
    } else if (
      key.startsWith("aotd_guess_") ||
      key.startsWith("aotd_cover_") ||
      key.startsWith("aotd_heardle_") ||
      key.startsWith("aotd_lyric_") ||
      key.startsWith("aotd_scramble_")
    ) {
      try {
        const state = JSON.parse(localStorage.getItem(key));
        if (state && state.gameOver) {
          puzzlesAttempted++;
          if (state.solved) puzzlesSolved++;
        }
      } catch {}
    }
  }

  let favoriteVibe = null;
  let maxVibeCount = 0;
  for (const [label, count] of Object.entries(vibeCounts)) {
    if (count > maxVibeCount) {
      maxVibeCount = count;
      favoriteVibe = label;
    }
  }

  const favoriteVibeObj = favoriteVibe
    ? VIBES.find((v) => v.label === favoriteVibe)
    : null;

  return {
    ratedCount,
    avgRating: ratedCount > 0 ? (ratingSum / ratedCount).toFixed(1) : null,
    puzzlesSolved,
    puzzlesAttempted,
    favoriteVibe: favoriteVibeObj
      ? {
          emoji: favoriteVibeObj.emoji,
          label: favoriteVibeObj.label,
          count: maxVibeCount,
        }
      : null,
  };
}

/* ─── Streak utility ─── */
function getStreak() {
  try {
    const raw = localStorage.getItem("aotd_streak");
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastDate: null };
  }
}

function updateStreak(todayKey) {
  const streak = getStreak();
  if (streak.lastDate === todayKey) return streak; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split("T")[0];

  const newCount = streak.lastDate === yesterdayKey ? streak.count + 1 : 1;
  const best = Math.max(newCount, streak.best || 0);
  const newStreak = { count: newCount, lastDate: todayKey, best };

  localStorage.setItem("aotd_streak", JSON.stringify(newStreak));
  return newStreak;
}

/* ─── Main Page ─── */
export default function ForumPage({ album, dateString }) {
  const [activeSection, setActiveSection] = useState("home");

  const [imgError, setImgError] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [visitRank, setVisitRank] = useState(null);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [welcomeBack, setWelcomeBack] = useState(null);
  const [konamiTriggered, setKonamiTriggered] = useState(false);
  const [vinylSpinning, setVinylSpinning] = useState(false);
  const [estHover, setEstHover] = useState(false);
  const [forumSig, setForumSig] = useState("");

  const konamiRef = useRef([]);

  const todayKey = getTodayKey();

  // Tomorrow's album for teaser (genre only)
  const tomorrowAlbum = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getAlbumForDate(tomorrow);
  }, []);

  // Personal stats — recompute when allDone changes to capture latest data
  const personalStats = useMemo(() => {
    if (typeof window === "undefined") return null;
    return computePersonalStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  useEffect(() => {
    // Visit rank tracking
    incrementVisitCount(todayKey);
    setVisitRank(getVisitRank());

    // Random forum signature
    setForumSig(FORUM_SIGS[Math.floor(Math.random() * FORUM_SIGS.length)]);

    // Konami code listener
    const handleKey = (e) => {
      konamiRef.current.push(e.key);
      konamiRef.current = konamiRef.current.slice(-KONAMI_CODE.length);
      if (konamiRef.current.join(",") === KONAMI_CODE.join(",")) {
        setKonamiTriggered(true);
        fireConfetti({ particleCount: 200, spread: 160, origin: { y: 0.3 } });
        setTimeout(
          () =>
            fireConfetti({
              particleCount: 100,
              spread: 120,
              origin: { y: 0.5 },
            }),
          300,
        );
        setTimeout(() => setKonamiTriggered(false), 5000);
      }
    };
    window.addEventListener("keydown", handleKey);

    // Check streak
    const oldStreak = getStreak();
    const s = updateStreak(todayKey);
    setStreak(s.count);
    setBestStreak(s.best || s.count);

    // Welcome-back detection: user was away > 1 day and had a previous streak
    if (
      s.count === 1 &&
      oldStreak.lastDate &&
      oldStreak.lastDate !== todayKey &&
      (oldStreak.best || oldStreak.count) > 1 &&
      !sessionStorage.getItem("aotd_welcome_back_dismissed")
    ) {
      const last = new Date(oldStreak.lastDate + "T00:00:00");
      const today = new Date(todayKey + "T00:00:00");
      const daysAway = Math.round((today - last) / 86400000);
      if (daysAway > 1) {
        setWelcomeBack({
          daysAway,
          bestStreak: s.best || oldStreak.best || oldStreak.count,
        });
      }
    }

    // Check if all activities completed (check all game type keys)
    const checkDone = () => {
      const rated = localStorage.getItem(`aotd_rated_${todayKey}`);
      const vibed = localStorage.getItem(`aotd_vibed_${todayKey}`);
      let guessDone = false;
      for (const gk of ["guess", "cover", "heardle", "lyric", "scramble"]) {
        const raw = localStorage.getItem(`aotd_${gk}_${todayKey}`);
        if (raw) {
          try {
            if (JSON.parse(raw).gameOver === true) {
              guessDone = true;
              break;
            }
          } catch {}
        }
      }
      const done = !!rated && !!vibed && guessDone;
      setAllDone((prev) => (prev === done ? prev : done));
    };
    checkDone();

    // Listen for activity completions instead of blind polling
    const onActivity = () => checkDone();
    window.addEventListener("aotd-activity", onActivity);
    // Fallback poll for edge cases (tab regain focus, etc.)
    const interval = setInterval(checkDone, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("aotd-activity", onActivity);
      window.removeEventListener("keydown", handleKey);
    };
  }, [todayKey]);

  // Milestone celebration when daily wrap-up triggers
  useEffect(() => {
    if (!allDone || streak < 3) return;
    const milestone = STREAK_MILESTONES_DESC.find((m) => streak >= m.at);
    if (!milestone) return;
    const celebrated = getCelebratedMilestones();
    if (celebrated.includes(milestone.at)) {
      // Already celebrated — still show message, no confetti
      setActiveMilestone(milestone);
      return;
    }
    // First time hitting this milestone!
    setActiveMilestone(milestone);
    markMilestoneCelebrated(milestone.at);
    fireConfetti({ particleCount: 200, spread: 140, origin: { y: 0.4 } });
    setTimeout(() => {
      fireConfetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
    }, 400);
  }, [allDone, streak]);

  const accentColor = isLightColor(album.color) ? "#2a4570" : album.color;
  const gameType = useMemo(() => getGameType(), []);

  return (
    <>
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>
      {/* Banner */}
      <div className="banner">
        <div className="banner-inner">
          <div
            className="banner-est"
            onMouseEnter={() => setEstHover(true)}
            onMouseLeave={() => setEstHover(false)}
            title="Or is it?"
          >
            {estHover ? "♫ just kidding, est. 2025 ♫" : "♫ EST. 2004 ♫"}
          </div>
          <h1 className="banner-title">💿 Album Of The Day Club 💿</h1>
          <div className="banner-tagline">
            &ldquo;One album. One day. A thousand opinions.&rdquo;
          </div>
        </div>
        <nav className="nav">
          {[
            { key: "home", icon: "hn hn-home", label: "Home" },
            { key: "archive", icon: "hn hn-calender", label: "Archive" },
            { key: "stats", icon: "hn hn-trending", label: "Stats" },
            { key: "bingo", icon: "hn hn-star", label: "Bingo" },
            { key: "faq", icon: "hn hn-question", label: "FAQ" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${activeSection === item.key ? "active" : ""}`}
              onClick={() => {
                setActiveSection(item.key);
                window.scrollTo(0, 0);
              }}
            >
              <i className={item.icon} aria-hidden="true" /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Konami easter egg */}
      {konamiTriggered && (
        <div className="konami-banner">
          You found the secret code! You are a true music nerd.
        </div>
      )}

      {/* Info bar */}
      <div className="info-bar">
        <span>
          <i className="hn hn-calender" aria-hidden="true" /> {dateString}
        </span>
        {streak > 0 && (
          <span className="streak-badge">
            {streak >= 3 ? "\ud83d\udd25" : "\ud83d\udcc5"} <b>{streak}</b>-day
            streak{bestStreak > streak ? ` (best: ${bestStreak})` : ""}
          </span>
        )}
        {visitRank && (
          <span
            className="rank-badge"
            title={`${visitRank.count} days visited`}
          >
            {visitRank.icon} {visitRank.label}
            {visitRank.nextRank && (
              <span className="rank-progress">
                <span className="rank-progress-bar">
                  <span
                    className="rank-progress-fill"
                    style={{
                      transform: `scaleX(${visitRank.progress})`,
                    }}
                  />
                </span>
                <span className="rank-progress-text">
                  {visitRank.count}/{visitRank.nextRank.min} to{" "}
                  {visitRank.nextRank.icon}
                </span>
              </span>
            )}
          </span>
        )}
      </div>

      <div
        className="content"
        id="main-content"
        style={{
          "--accent-color": accentColor,
          "--accent-light": `${accentColor}30`,
        }}
      >
        {activeSection === "home" && (
          <>
            {/* Marquee */}
            <div className="marquee-bar" aria-hidden="true">
              <div className="marquee-track">
                <span className="marquee-text">{getMarqueeMessage(album)}</span>
              </div>
            </div>
            <p className="sr-only">{getMarqueeMessage(album)}</p>

            {/* Welcome-back banner */}
            {welcomeBack && (
              <div className="welcome-back-banner" role="status">
                <span>
                  Welcome back! You were away for {welcomeBack.daysAway} day
                  {welcomeBack.daysAway > 1 ? "s" : ""}. Your best streak was{" "}
                  {welcomeBack.bestStreak} 🔥 — let&apos;s start a new one!
                </span>
                <button
                  className="welcome-back-dismiss"
                  onClick={() => {
                    sessionStorage.setItem("aotd_welcome_back_dismissed", "1");
                    setWelcomeBack(null);
                  }}
                  aria-label="Dismiss welcome back message"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Album of the Day */}
            <div className="panel">
              <div className="panel-header">
                <span>
                  <i className="hn hn-music" aria-hidden="true" /> TODAY&apos;S
                  ALBUM — {dateString.toUpperCase()}
                </span>
              </div>
              <div
                className="album-display"
                style={{
                  background: `linear-gradient(135deg, ${album.color}18, ${album.color}08)`,
                }}
              >
                <div className="album-cover-wrap">
                  <div
                    className="album-cover"
                    style={{
                      background: album.image
                        ? "#1a1a1a"
                        : `linear-gradient(145deg, ${album.color}, ${album.color}cc)`,
                    }}
                  >
                    {album.image && !imgError ? (
                      <img
                        src={album.image}
                        alt={`${album.title} by ${album.artist}`}
                        loading="eager"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <span className="cover-emoji">{album.cover}</span>
                    )}
                  </div>
                  <div
                    className={`vinyl-disc${vinylSpinning ? " spinning" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label="Spin the vinyl record"
                    onClick={() => {
                      setVinylSpinning(true);
                      setTimeout(() => setVinylSpinning(false), 3000);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVinylSpinning(true);
                        setTimeout(() => setVinylSpinning(false), 3000);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                    title="Click to spin!"
                  />
                </div>
                <div className="album-info">
                  <h2 className="album-title">{album.title}</h2>
                  <div className="album-artist">by {album.artist}</div>
                  <table className="info-table">
                    <tbody>
                      {[
                        ["Year", album.year],
                        ["Genre", album.genre],
                      ].map(([label, val], i) => (
                        <tr key={i}>
                          <td>{label}</td>
                          <td>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <a
                    href={getListenUrl(album)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="listen-btn"
                  >
                    ▶ Listen on YouTube
                  </a>
                </div>
              </div>
            </div>

            {/* Quick playlist poll */}
            <PlaylistPoll albumKey={album.key} />

            {/* Bingo mini widget */}
            <BingoMini onNavigate={setActiveSection} />

            {/* Yesterday's Recap */}
            <YesterdayRecap />

            {/* Activity intro */}
            <div className="activity-intro">
              Three ways to join today &mdash; rate the album, pick your vibes,
              or play today&apos;s puzzle.
            </div>

            {/* The three activities */}
            <RateReveal albumKey={album.key} />
            <VibeCheck albumKey={album.key} />
            {gameType === "cover" ? (
              <CoverChallenge />
            ) : gameType === "lyric" ? (
              <LyricGame />
            ) : gameType === "heardle" ? (
              <HeardleGame />
            ) : gameType === "scramble" ? (
              <ScrambleGame />
            ) : (
              <GuessGame />
            )}

            {/* Daily wrap-up — shows after all activities completed */}
            {allDone && (
              <div className="panel daily-wrap">
                <div className="panel-header">
                  <span>
                    <i className="hn hn-star" aria-hidden="true" /> DAILY
                    WRAP-UP
                  </span>
                </div>
                <div className="panel-body" style={{ textAlign: "center" }}>
                  <div className="wrap-streak">
                    {streak >= 3 ? "🔥" : "📅"} <strong>{streak}</strong>-day
                    streak
                    {bestStreak > streak && (
                      <span className="best-streak"> (best: {bestStreak})</span>
                    )}
                  </div>
                  <p
                    className={`wrap-message${activeMilestone ? " wrap-milestone" : ""}`}
                  >
                    {activeMilestone
                      ? `🏆 ${activeMilestone.msg}`
                      : streak >= 7
                        ? "Legendary listener! You're on fire."
                        : streak >= 3
                          ? "Nice streak going! Keep it up."
                          : "Come back tomorrow to start a streak!"}
                  </p>
                  {/* Enhanced tomorrow teaser */}
                  <div className="wrap-tomorrow enhanced">
                    <div className="tomorrow-cover">{tomorrowAlbum.cover}</div>
                    <div className="tomorrow-info">
                      <div className="tomorrow-label">
                        Tomorrow&apos;s Album
                      </div>
                      <div className="tomorrow-genre">
                        {tomorrowAlbum.genre} &middot;{" "}
                        {Math.floor(tomorrowAlbum.year / 10) * 10}s
                      </div>
                    </div>
                  </div>

                  {/* Countdown to next album */}
                  <NextAlbumCountdown />

                  {/* Personal stats */}
                  {personalStats && personalStats.ratedCount > 0 && (
                    <div className="wrap-stats">
                      <div className="wrap-stats-title">Your Stats</div>
                      <div className="wrap-stats-grid">
                        <span>
                          Rated <strong>{personalStats.ratedCount}</strong>{" "}
                          album{personalStats.ratedCount !== 1 ? "s" : ""}
                          {personalStats.avgRating &&
                            ` (avg ${personalStats.avgRating}/10)`}
                        </span>
                        {personalStats.puzzlesAttempted > 0 && (
                          <span>
                            Puzzles solved:{" "}
                            <strong>{personalStats.puzzlesSolved}</strong> of{" "}
                            {personalStats.puzzlesAttempted} attempted
                          </span>
                        )}
                        {personalStats.favoriteVibe && (
                          <span>
                            Favorite vibe: {personalStats.favoriteVibe.emoji}{" "}
                            {personalStats.favoriteVibe.label} (chosen{" "}
                            {personalStats.favoriteVibe.count}x)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Share My Day */}
                  <ShareResultButton
                    label="📋 Share My Day"
                    getText={() => {
                      const lines = [
                        `Album Of The Day Club`,
                        `\ud83d\udcbf Daily Recap \u2014 ${todayKey}`,
                        `\ud83c\udfb5 ${album.title} by ${album.artist}`,
                        ``,
                      ];
                      const myRating = localStorage.getItem(
                        `aotd_rated_${todayKey}`,
                      );
                      if (myRating) {
                        const r = parseInt(myRating);
                        const stars =
                          "\u2605".repeat(r) + "\u2606".repeat(10 - r);
                        lines.push(`\u2b50 ${r}/10 ${stars}`);
                      }
                      const playlistVote = localStorage.getItem(
                        `aotd_playlist_${todayKey}`,
                      );
                      if (playlistVote) {
                        lines.push(
                          playlistVote === "yes"
                            ? "\ud83c\udfa7 Playlist: Yes"
                            : "\ud83d\udeab Playlist: Nah",
                        );
                      }
                      const vibeRaw = localStorage.getItem(
                        `aotd_vibed_${todayKey}`,
                      );
                      if (vibeRaw) {
                        try {
                          const vibes = JSON.parse(vibeRaw);
                          const vibeText = vibes
                            .map((s) => {
                              const v = VIBES.find((vb) => vb.label === s);
                              return v ? `${v.emoji} ${v.label}` : s;
                            })
                            .join(", ");
                          lines.push(`\ud83c\udfad ${vibeText}`);
                        } catch {}
                      }
                      for (const gk of [
                        "guess",
                        "cover",
                        "heardle",
                        "lyric",
                        "scramble",
                      ]) {
                        const raw = localStorage.getItem(
                          `aotd_${gk}_${todayKey}`,
                        );
                        if (raw) {
                          try {
                            const state = JSON.parse(raw);
                            if (state.gameOver) {
                              const emoji = {
                                guess: "\ud83c\udfb5",
                                cover: "\ud83d\uddbc\ufe0f",
                                heardle: "\ud83c\udfa7",
                                lyric: "\ud83c\udfa4",
                                scramble: "\ud83d\udd00",
                              }[gk];
                              const name = {
                                guess: "Puzzle",
                                cover: "Cover",
                                heardle: "Heardle",
                                lyric: "Lyric",
                                scramble: "Scramble",
                              }[gk];
                              const max = {
                                guess: 6,
                                cover: 5,
                                heardle: 6,
                                lyric: 4,
                                scramble: 5,
                              }[gk];
                              lines.push(
                                state.solved
                                  ? `${emoji} ${name}: Solved in ${state.guesses.length}/${max}`
                                  : `${emoji} ${name}: X/${max}`,
                              );
                              break;
                            }
                          } catch {}
                        }
                      }
                      if (streak >= 2) {
                        lines.push(`\ud83d\udd25 ${streak}-day streak`);
                      }
                      lines.push(window.location.origin);
                      return lines.join("\n");
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === "archive" && <ArchiveSection />}
        {activeSection === "stats" && <StatsSection />}
        {activeSection === "bingo" && <BingoSection />}
        {activeSection === "faq" && <FAQSection />}

        {/* Album + pixel icon carousel */}
        <div className="carousel-strip" aria-hidden="true">
          <div className="carousel-track">
            {ALBUMS.slice(0, 50).map((a, i) => (
              <React.Fragment key={i}>
                <span
                  className="carousel-item"
                  title={`${a.title} — ${a.artist}`}
                >
                  {a.cover}
                </span>
                {i < CAROUSEL_ICONS.length && (
                  <span
                    className="carousel-item carousel-icon"
                    title={CAROUSEL_ICONS[i].title}
                  >
                    <img
                      src={CAROUSEL_ICONS[i].src}
                      alt=""
                      draggable={false}
                      loading="lazy"
                    />
                  </span>
                )}
              </React.Fragment>
            ))}
            {ALBUMS.slice(0, 50).map((a, i) => (
              <React.Fragment key={`dup-${i}`}>
                <span
                  className="carousel-item"
                  title={`${a.title} — ${a.artist}`}
                >
                  {a.cover}
                </span>
                {i < CAROUSEL_ICONS.length && (
                  <span
                    className="carousel-item carousel-icon"
                    title={CAROUSEL_ICONS[i].title}
                  >
                    <img
                      src={CAROUSEL_ICONS[i].src}
                      alt=""
                      draggable={false}
                      loading="lazy"
                    />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Greenhouse game */}
        <div className="panel">
          <div className="panel-header">
            <span>
              <i className="hn hn-play" aria-hidden="true" /> CHILL ZONE — THE
              GREENHOUSE
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "normal",
                opacity: 0.7,
              }}
            >
              by{" "}
              <a
                href="https://jsmonzani.itch.io/the-greenhouse"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit" }}
              >
                jsmonzani
              </a>
            </span>
          </div>
          <div className="panel-body greenhouse-body">
            <p className="activity-prompt" style={{ textAlign: "center" }}>
              Take a break between albums. Decorate a cozy greenhouse — no
              goals, no timer, just vibes.
            </p>
            <div className="greenhouse-widget">
              <iframe
                src="https://itch.io/embed/2089404?dark=true"
                title="The Greenhouse by jsmonzani on itch.io"
                loading="lazy"
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <a
                href="https://jsmonzani.itch.io/the-greenhouse"
                target="_blank"
                rel="noopener noreferrer"
                className="listen-btn"
                style={{ fontSize: 11, padding: "8px 16px" }}
              >
                <i className="hn hn-play" aria-hidden="true" /> Play in New Tab
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="site-footer">
          <div className="footer-title">
            <i className="hn hn-music" aria-hidden="true" /> Album Of The Day
            Club <i className="hn hn-music" aria-hidden="true" />
          </div>
          Powered by AOTD Forum v4.0.0 · © 2004–2026
          <br />
          Running on ForumEngine™ · All times are UTC
          <br />
          <span className="footer-dim">
            <i className="hn hn-playlist" aria-hidden="true" /> {ALBUMS.length}{" "}
            albums in rotation · New album every day at midnight
          </span>
          <br />
          <span className="footer-dim">
            Pixel icons by{" "}
            <a
              href="https://pixeliconlibrary.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6688aa" }}
            >
              HackerNoon
            </a>
            {" · "}
            <a
              href="https://www.streamlinehq.com/icons/pixel"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6688aa" }}
            >
              Streamline
            </a>
          </span>
          <br />
          <span className="footer-dim">
            <i className="hn hn-envelope" aria-hidden="true" />{" "}
            <a
              href="mailto:rainbowpudding@littlealbumclub.net"
              style={{ color: "#6688aa" }}
            >
              rainbowpudding@littlealbumclub.net
            </a>
          </span>
          {forumSig && (
            <>
              <br />
              <span className="forum-sig">{forumSig}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
