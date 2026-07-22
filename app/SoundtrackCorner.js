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

/** Consecutive days (ending today) the same medium was picked */
function getCueStreak() {
  const today = new Date();
  let streakPick = null;
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const key = new Date(today.getTime() - i * 86400000)
      .toISOString()
      .slice(0, 10);
    const pick = localStorage.getItem(`aotd_soundtrack_${key}`);
    if (!pick || (streakPick && pick !== streakPick)) break;
    streakPick = pick;
    streak++;
  }
  return { pick: streakPick, streak };
}

/** One-tap "where does this cue belong" vote with a community reveal */
function CueVote({ cards }) {
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
        {(() => {
          const { pick, streak } = getCueStreak();
          return streak >= 3 && CUE_STREAK_LINES[pick] ? (
            <div className="soundtrack-vote-streak">
              {CUE_STREAK_LINES[pick](streak)}
            </div>
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <div className="soundtrack-vote">
      <div className="soundtrack-vote-prompt">
        Where does this one belong tonight? One vote, then you see the room.
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
    </div>
  );
}

export default function SoundtrackCorner({ album, onPlayToday }) {
  const corner = useMemo(() => buildSoundtrackCorner(album), [album]);
  const gameLabel = GAME_LABELS[getGameType()] || "today's game";

  return (
    <div className="soundtrack-corner">
      <div className="soundtrack-corner-explainer">
        <strong>How this works: </strong>every day we take today&apos;s album
        and ask one question — if this record scored a scene, what scene? Below:
        three pitches (🎮 game, 🎬 film, 📺 TV), your vote, two bonus angles,
        what to listen for, and what to spin next. Argue with all of it.
      </div>
      <p className="agent-intro">{corner.intro}</p>
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
      <CueVote cards={corner.cards} />
      <div className="soundtrack-corner-note">{corner.bridgeNote}</div>
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
