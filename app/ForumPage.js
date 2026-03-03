"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  getListenUrl,
  getTodayKey,
  ALBUMS,
  VIBES,
  CAROUSEL_ICONS,
  getPuzzleAlbum,
  getPuzzleClues,
  getMarqueeMessage,
  getAlbumForDate,
} from "@/lib/albums";

/* ─── Confetti utility (dynamic import, respects reduced motion) ─── */
async function fireConfetti(options = {}) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    ...options,
  });
}

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
        {error && <p className="submit-error">{error}</p>}
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
  const topVibe =
    submitted && results?.distribution
      ? Object.entries(results.distribution).sort((a, b) => b[1] - a[1])[0]
      : null;
  const topVibePct =
    topVibe && results.total > 0
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
                onClick={() => toggle(v.label)}
                disabled={submitted}
              >
                <img
                  src={v.icon}
                  alt=""
                  className="vibe-pixel-icon"
                  aria-hidden="true"
                  draggable={false}
                />
                <span className="vibe-label">{v.label}</span>
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
        {error && <p className="submit-error">{error}</p>}
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

  const [cluesRevealed, setCluesRevealed] = useState(1);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [shaking, setShaking] = useState(false);
  const [justRevealedClue, setJustRevealedClue] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(`aotd_guess_${todayKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      setGuesses(state.guesses);
      setCluesRevealed(Math.min(state.guesses.length + 1, 6));
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
    setShowSuggestions(false);

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
      setTimeout(() => setShaking(false), 400);
    } else {
      const nextClue = Math.min(newGuesses.length + 1, 6);
      setCluesRevealed(nextClue);
      setJustRevealedClue(nextClue - 1);
      setTimeout(() => setJustRevealedClue(-1), 400);
      saveState(newGuesses, false, false);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      inputRef.current?.focus();
    }
  };

  const guessedTitles = guesses.map((g) => g.toLowerCase());

  const filtered =
    currentGuess.trim().length > 0
      ? ALBUMS.filter(
          (a) =>
            !guessedTitles.includes(a.title.toLowerCase()) &&
            (a.title.toLowerCase().includes(currentGuess.toLowerCase()) ||
              a.artist.toLowerCase().includes(currentGuess.toLowerCase())),
        ).slice(0, 5)
      : [];

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
          <div className="guess-history">
            {guesses.map((g, i) => (
              <div
                key={i}
                className={`guess-item ${g.toLowerCase() === puzzleAlbum.title.toLowerCase() ? "correct" : "wrong"}`}
              >
                <span className="guess-num">#{i + 1}</span>
                <span className="guess-text">{g}</span>
                <span>
                  {g.toLowerCase() === puzzleAlbum.title.toLowerCase()
                    ? "✅"
                    : "❌"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {!gameOver && (
          <div className={`guess-input-wrap${shaking ? " shaking" : ""}`}>
            <div className="guess-input-container">
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                value={currentGuess}
                onChange={(e) => {
                  setCurrentGuess(e.target.value);
                  setShowSuggestions(true);
                  setSuggestionIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type an album name..."
                role="combobox"
                aria-expanded={showSuggestions && filtered.length > 0}
                aria-autocomplete="list"
                aria-controls="guess-suggestions"
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
                      setCurrentGuess(filtered[suggestionIndex].title);
                      setShowSuggestions(false);
                      setSuggestionIndex(-1);
                    } else {
                      submitGuess();
                    }
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                    setSuggestionIndex(-1);
                  }
                }}
              />
              {showSuggestions && filtered.length > 0 && (
                <div
                  className="suggestions"
                  id="guess-suggestions"
                  role="listbox"
                >
                  {filtered.map((a, i) => (
                    <div
                      key={i}
                      className={`suggestion-item${i === suggestionIndex ? " highlighted" : ""}`}
                      role="option"
                      aria-selected={i === suggestionIndex}
                      onMouseDown={() => {
                        setCurrentGuess(a.title);
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
              onClick={submitGuess}
              disabled={!currentGuess.trim()}
            >
              Guess
            </button>
          </div>
        )}

        {/* Game over */}
        {gameOver && (
          <div className={`guess-result ${solved ? "solved" : "failed"}`}>
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
                            width: `${Math.max(pct, count > 0 ? 5 : 0)}%`,
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
            <button
              className="btn-submit share-btn"
              onClick={() => {
                const squares = guesses.map((g, i) =>
                  g.toLowerCase() === puzzleAlbum.title.toLowerCase()
                    ? "🟩"
                    : "⬛",
                );
                const text = [
                  `Album Of The Day Club`,
                  `🎵 Daily Puzzle — ${todayKey}`,
                  solved
                    ? `Solved in ${guesses.length}/6`
                    : `X/6 — Better luck tomorrow`,
                  squares.join(""),
                  ``,
                ].join("\n");
                navigator.clipboard
                  .writeText(text)
                  .then(() => {
                    const btn = document.querySelector(".share-btn");
                    if (btn) {
                      btn.textContent = "Copied!";
                      setTimeout(() => {
                        btn.textContent = "📋 Share Results";
                      }, 2000);
                    }
                  })
                  .catch(() => {});
              }}
            >
              📋 Share Results
            </button>
          </div>
        )}
      </div>
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
                        style={{ width: `${pct}%` }}
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

  const newStreak =
    streak.lastDate === yesterdayKey
      ? { count: streak.count + 1, lastDate: todayKey }
      : { count: 1, lastDate: todayKey };

  localStorage.setItem("aotd_streak", JSON.stringify(newStreak));
  return newStreak;
}

/* ─── Main Page ─── */
export default function ForumPage({ album, dateString }) {
  const [activeSection, setActiveSection] = useState("home");
  const [onlineCount, setOnlineCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [streak, setStreak] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const todayKey = getTodayKey();

  // Tomorrow's album for teaser (genre only)
  const tomorrowAlbum = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getAlbumForDate(tomorrow);
  }, []);

  useEffect(() => {
    setOnlineCount(Math.floor(Math.random() * 40) + 5);
    setGuestCount(Math.floor(Math.random() * 120) + 20);

    // Check streak
    const s = updateStreak(todayKey);
    setStreak(s.count);

    // Check if all activities completed
    const checkDone = () => {
      const rated = localStorage.getItem(`aotd_rated_${todayKey}`);
      const vibed = localStorage.getItem(`aotd_vibed_${todayKey}`);
      const guessRaw = localStorage.getItem(`aotd_guess_${todayKey}`);
      let guessDone = false;
      if (guessRaw) {
        try {
          guessDone = JSON.parse(guessRaw).gameOver === true;
        } catch {}
      }
      setAllDone(!!rated && !!vibed && guessDone);
    };
    checkDone();

    // Re-check periodically (activities write to localStorage)
    const interval = setInterval(checkDone, 2000);
    return () => clearInterval(interval);
  }, [todayKey]);

  const accentColor = isLightColor(album.color) ? "#2a4570" : album.color;

  return (
    <>
      {/* Banner */}
      <div className="banner">
        <div className="banner-inner">
          <div className="banner-est">♫ EST. 2004 ♫</div>
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

      {/* Info bar */}
      <div className="info-bar">
        <span>
          <i className="hn hn-calender" aria-hidden="true" /> {dateString}
        </span>
        <span>
          <i className="hn hn-sound-on" aria-hidden="true" />{" "}
          <b>{onlineCount}</b> listeners, <b>{guestCount}</b> guests online
        </span>
      </div>

      <div
        className="content"
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
                  <div className="vinyl-disc" aria-hidden="true" />
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

            {/* Activity intro */}
            <div className="activity-intro">
              Three ways to join today &mdash; rate the album, pick your vibes,
              or guess the daily puzzle.
            </div>

            {/* The three activities */}
            <RateReveal albumKey={album.key} />
            <VibeCheck albumKey={album.key} />
            <GuessGame />

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
                  </div>
                  <p className="wrap-message">
                    {streak >= 7
                      ? "Legendary listener! You're on fire."
                      : streak >= 3
                        ? "Nice streak going! Keep it up."
                        : "Come back tomorrow to start a streak!"}
                  </p>
                  <div className="wrap-tomorrow">
                    <i className="hn hn-music" aria-hidden="true" />{" "}
                    Tomorrow&apos;s genre:{" "}
                    <strong>{tomorrowAlbum.genre}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === "archive" && <ArchiveSection />}
        {activeSection === "stats" && <StatsSection />}
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
        </div>
      </div>
    </>
  );
}
