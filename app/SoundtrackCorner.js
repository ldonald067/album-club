"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildSoundtrackCorner } from "@/lib/soundtrack-corner";
import { getGameType, getTodayKey } from "@/lib/albums";
import { loadJson } from "@/lib/safe-fetch";

const GAME_LABELS = {
  guess: "Guess the Album",
  cover: "Cover Art Challenge",
  lyric: "Lyric Challenge",
  heardle: "Heardle",
  scramble: "Artist Scramble",
};

const CUE_STREAK_LINES = {
  game: (n) =>
    `That's ${n} game cues running — the club suspects you're building a level.`,
  film: (n) =>
    `That's ${n} film cues running — the club suspects you're location scouting.`,
  tv: (n) =>
    `That's ${n} TV cues running — the club suspects you're pitching a limited series.`,
};

const CUE_LEAN_LINES = {
  game: (count, total) =>
    `${count} of your last ${total} cues went to a game. The club has you filed under level designer.`,
  film: (count, total) =>
    `${count} of your last ${total} cues went to film. You are, on the record, a needle-drop person.`,
  tv: (count, total) =>
    `${count} of your last ${total} cues went to TV. Somewhere there is a very well-scored pilot with your name on it.`,
};

const CUE_NAMES = { game: "game", film: "film", tv: "TV" };

/* Read the picks once and let the streak and the lean both derive from it.
   The keys are never written here — renaming an aotd_* key silently discards
   everyone's history and looks identical to working on a fresh profile. */
function readCuePicks(days = 30) {
  const today = new Date();
  const entries = [];
  for (let i = 0; i < days; i++) {
    const key = new Date(today.getTime() - i * 86400000)
      .toISOString()
      .slice(0, 10);
    entries.push({ key, pick: localStorage.getItem(`aotd_soundtrack_${key}`) });
  }
  return entries;
}

/** Consecutive days (ending today) the same medium was picked */
function getCueStreak() {
  let streakPick = null;
  let streak = 0;
  for (const { pick } of readCuePicks()) {
    if (!pick || (streakPick && pick !== streakPick)) break;
    streakPick = pick;
    streak++;
  }
  return { pick: streakPick, streak };
}

/** Your lean across the last 30 days. Null until there is enough to be a lean
    rather than a coincidence, and null on a tie — a "lean" that flips daily
    reads as the site guessing. */
function getCueLean() {
  const counts = { game: 0, film: 0, tv: 0 };
  let total = 0;

  for (const { pick } of readCuePicks()) {
    if (pick && pick in counts) {
      counts[pick] += 1;
      total += 1;
    }
  }

  if (total < 5) return null;

  const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (counts[ranked[0]] === counts[ranked[1]]) return null;

  return { pick: ranked[0], count: counts[ranked[0]], total };
}

/** The room's verdict today, or null when it has not earned the word "room".
    Two is the floor Album vs Album and Vibe already settled on: one row is one
    row, and a 100% split off a single vote is the zero-traffic lie they fixed. */
function getRoomCue(results) {
  if (!results || results.total < 2) return null;

  const ranked = ["game", "film", "tv"].sort((a, b) => results[b] - results[a]);
  return results[ranked[0]] === results[ranked[1]] ? null : ranked[0];
}

/* What the vote leaves behind: today's disagreement, then one line of memory.
   Only one memory line ever shows — a streak and a lean are the same fact told
   twice, and the pair read like the site was padding. */
function CueAftermath({ myPick, results }) {
  const room = getRoomCue(results);
  const { pick: streakPick, streak } = getCueStreak();
  const lean = getCueLean();

  const memory =
    streak >= 3 && CUE_STREAK_LINES[streakPick]
      ? CUE_STREAK_LINES[streakPick](streak)
      : lean && CUE_LEAN_LINES[lean.pick]
        ? CUE_LEAN_LINES[lean.pick](lean.count, lean.total)
        : null;

  if (!room && !memory) return null;

  return (
    <>
      {room && (
        <div className="soundtrack-vote-verdict">
          {room === myPick
            ? `The room is with you — ${CUE_NAMES[room]} it is.`
            : `The room went ${CUE_NAMES[room]}. You went ${CUE_NAMES[myPick]}. Hold your position.`}
        </div>
      )}
      {memory && <div className="soundtrack-vote-streak">{memory}</div>}
    </>
  );
}

/** One-tap "where does this cue belong" vote with a community reveal */
function CueVote({ cards, onPick, onSkip, skipped }) {
  // Keyed by the live UTC date (not the render-frozen album prop) so the
  // storage key, SoundtrackMini, and the API's album_key always agree —
  // including in the window right after UTC midnight before a reload.
  const storageKey = `aotd_soundtrack_${getTodayKey()}`;
  const [myPick, setMyPick] = useState(null);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [error, setError] = useState(null);
  const submittingRef = useRef(false);

  const loadResults = () => {
    loadJson("/api/soundtrack")
      .then(setResults)
      .catch(() => setResults(null));
  };

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMyPick(saved);
      onPick(saved);
      loadResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const submit = async (pick) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/soundtrack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pick }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        throw new Error(msg || "Failed to submit");
      }
      const data = await res.json();
      localStorage.setItem(storageKey, pick);
      window.dispatchEvent(new Event("aotd-activity"));
      setMyPick(pick);
      onPick(pick);
      setResults(data);
      setJustRevealed(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (myPick && !results) {
    return (
      <div className="soundtrack-vote" role="status">
        Vote's in — fetching the room...{" "}
        <button
          type="button"
          className="results-pending-retry"
          onClick={loadResults}
        >
          Try again
        </button>
      </div>
    );
  }

  if (myPick && results) {
    const pickedCard = cards.find((card) => card.key === myPick);
    return (
      <div
        className={`soundtrack-vote${justRevealed ? " animate-reveal" : ""}`}
        role="status"
        aria-live="polite"
      >
        <div className="soundtrack-vote-prompt">
          You&apos;d cue it in a{" "}
          <strong>
            {pickedCard ? pickedCard.label.toLowerCase() : myPick}
          </strong>{" "}
          scene. The room so far:
        </div>
        <div className="soundtrack-vote-results">
          {cards.map((card) => {
            const count = results[card.key] || 0;
            const pct =
              results.total > 0 ? Math.round((count / results.total) * 100) : 0;
            return (
              <div
                key={card.key}
                className={`soundtrack-vote-row${card.key === myPick ? " mine" : ""}`}
              >
                <span className="soundtrack-vote-label">
                  <span aria-hidden="true">{card.icon}</span> {card.label}
                </span>
                <span className="soundtrack-vote-bar-wrap">
                  <span
                    className={`soundtrack-vote-bar${justRevealed ? " animate-bar" : ""}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </span>
                <span className="soundtrack-vote-count">
                  {pct}% ({count})
                </span>
              </div>
            );
          })}
        </div>
        <CueAftermath myPick={myPick} results={results} />
      </div>
    );
  }

  return (
    <div className="soundtrack-vote">
      <div className="soundtrack-vote-prompt">
        {skipped ? (
          <>
            Pitches are open — still worth calling it. One vote, then you see
            the room.
          </>
        ) : (
          <>
            Where does this one belong tonight? Call it first — one vote, then
            the room and the club&apos;s case.
          </>
        )}
      </div>
      {error && (
        <p className="submit-error" role="alert">
          {error}
        </p>
      )}
      <div className="soundtrack-vote-buttons">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="playlist-btn soundtrack-vote-btn"
            disabled={submitting}
            onClick={() => submit(card.key)}
          >
            <span aria-hidden="true">{card.icon}</span> {card.label}
          </button>
        ))}
      </div>
      {!skipped && (
        <button type="button" className="soundtrack-vote-skip" onClick={onSkip}>
          Or just read the pitches
        </button>
      )}
    </div>
  );
}

export default function SoundtrackCorner({ album, onPlayToday }) {
  const corner = useMemo(() => buildSoundtrackCorner(album), [album]);
  const gameLabel = GAME_LABELS[getGameType()] || "today's game";
  /* The question comes before the club's answer to it. Read three pitches
     first and the vote turns into a review of the pitches; asked cold it is
     an instinct, which is the thing worth arguing with. Rate & Reveal on the
     home page already works this way round.

     Only the three pitch cards wait — everything else stays visible, and the
     skip link opens them without voting. The room's split is a reward for
     committing; the club's own writing is not something to hold hostage. */
  const [myPick, setMyPick] = useState(null);
  const [skipped, setSkipped] = useState(false);
  const revealedCase = Boolean(myPick) || skipped;
  const leadRef = useRef(null);

  /* Skipping unmounts the button that was just pressed, which drops keyboard
     focus to the body — the same fault the Cozy fullscreen button was fixed
     for. Send focus to what the press revealed instead. Voting does not need
     this: the results block is the live region and it stays put. */
  useEffect(() => {
    if (skipped && leadRef.current) {
      leadRef.current.focus();
    }
  }, [skipped]);

  return (
    <div className="soundtrack-corner">
      {/* Was a 58-word table of contents, written when the vote sat below three
          pitch cards and needed announcing. The vote is the first thing on the
          page now and asks the question itself, so this had the page stating
          its premise four times — explainer, intro, kicker, prompt — across 123
          words before anyone could answer. */}
      <div className="soundtrack-corner-explainer">
        <strong>How this works: </strong>every day the club treats today&apos;s
        album as cue music. You call it first, we make our case after, and you
        argue with all of it.
      </div>
      <p className="soundtrack-intro">{corner.intro}</p>
      <div className="soundtrack-corner-actions">
        <a
          href={corner.listenNow.href}
          target="_blank"
          rel="noopener noreferrer"
          className="listen-btn guess-listen-btn soundtrack-listen-btn"
        >
          {corner.listenNow.label}
        </a>
      </div>
      <div className="soundtrack-corner-kicker">{corner.kicker}</div>
      <CueVote
        cards={corner.cards}
        onPick={setMyPick}
        onSkip={() => setSkipped(true)}
        skipped={skipped}
      />
      {revealedCase && (
        <>
          <div className="soundtrack-cards-lead" ref={leadRef} tabIndex={-1}>
            {myPick
              ? "Now the club's case for all three."
              : "The club's case for all three."}
          </div>
          <div className="soundtrack-corner-grid">
            {corner.cards.map((card) => (
              <div key={card.key} className="soundtrack-card">
                <div className="soundtrack-card-meta">
                  <span className="soundtrack-card-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className="soundtrack-card-label">{card.label}</span>
                </div>
                <div className="soundtrack-card-title">{card.title}</div>
                <p className="soundtrack-card-copy">{card.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="soundtrack-corner-note">{corner.bridgeNote}</div>
      {/* Waits with the pitch cards: "Two more angles" is two more of the same
          argument, and offering the sequel while the first three are still
          behind the question read like a mistake. */}
      {revealedCase && (
        <div className="soundtrack-corner-section">
          <div className="soundtrack-section-title">
            {corner.extraAnglesHeading}
          </div>
          <div className="soundtrack-angle-grid">
            {corner.extraAngles.map((angle) => (
              <div key={angle.key} className="soundtrack-angle-card">
                <div className="soundtrack-angle-label">{angle.label}</div>
                <div className="soundtrack-angle-title">{angle.title}</div>
                <p className="soundtrack-angle-copy">{angle.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="soundtrack-corner-section">
        <div className="soundtrack-section-title">
          {corner.listenForHeading}
        </div>
        <ul className="soundtrack-list">
          {corner.listenFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="soundtrack-corner-section">
        <div className="soundtrack-section-title">
          {corner.recommendationsHeading}
        </div>
        <p className="soundtrack-recommendations-intro">
          {corner.recommendationsIntro}
        </p>
        <div className="soundtrack-recommendations">
          {corner.recommendations.map((recommendation) => (
            <div
              key={`${recommendation.artist}-${recommendation.title}`}
              className="soundtrack-recommendation"
            >
              <span
                className="soundtrack-recommendation-cover"
                aria-hidden="true"
              >
                {recommendation.cover}
              </span>
              <div className="soundtrack-recommendation-copy">
                <div className="soundtrack-recommendation-title">
                  {recommendation.title}
                </div>
                <div className="soundtrack-recommendation-meta">
                  {recommendation.artist} - {recommendation.year}
                </div>
                <p className="soundtrack-recommendation-reason">
                  {recommendation.reason}
                </p>
                <a
                  href={recommendation.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="soundtrack-recommendation-link"
                >
                  {recommendation.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      {onPlayToday && (
        <div className="soundtrack-play-cta">
          <button type="button" className="btn-submit" onClick={onPlayToday}>
            🎯 Done digging? Play today&apos;s {gameLabel}
          </button>
        </div>
      )}
    </div>
  );
}
