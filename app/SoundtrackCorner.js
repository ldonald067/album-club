"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildSoundtrackCorner } from "@/lib/soundtrack-corner";
import { getGameType, getTodayKey } from "@/lib/albums";

const COPIED_FEEDBACK_MS = 2000;

const GAME_LABELS = {
  guess: "Guess the Album",
  cover: "Cover Art Challenge",
  lyric: "Lyric Challenge",
  heardle: "Heardle",
  scramble: "Artist Scramble",
};

/** One-tap "where does this cue belong" vote with a community reveal */
function CueVote({ album, cards }) {
  // Keyed by the live UTC date (not the render-frozen album prop) so the
  // storage key, SoundtrackMini, and the API's album_key always agree —
  // including in the window right after UTC midnight before a reload.
  const storageKey = `aotd_soundtrack_${getTodayKey()}`;
  const [myPick, setMyPick] = useState(null);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [error, setError] = useState(null);
  const shareBtnRef = useRef(null);
  const submittingRef = useRef(false);

  const loadResults = () => {
    fetch("/api/soundtrack")
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
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

  const getShareText = () => {
    const myCard = cards.find((card) => card.key === myPick);
    const roomLine = cards
      .map(
        (card) =>
          `${card.icon} ${results.total > 0 ? Math.round((results[card.key] / results.total) * 100) : 0}%`,
      )
      .join(" · ");
    return `🎧 Soundtrack Corner — ${album.title} by ${album.artist}\nI'd cue it in a ${myCard ? `${myCard.label.toLowerCase()} scene` : "scene"}. The room says: ${roomLine}\nlittlealbumclub.net`;
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
        <button
          ref={shareBtnRef}
          className="btn-submit share-btn"
          onClick={() => {
            const flash = (text) => {
              const btn = shareBtnRef.current;
              if (btn) {
                btn.textContent = text;
                setTimeout(() => {
                  if (shareBtnRef.current) {
                    shareBtnRef.current.textContent = "📋 Share The Verdict";
                  }
                }, COPIED_FEEDBACK_MS);
              }
            };
            navigator.clipboard
              .writeText(getShareText())
              .then(() => flash("Copied!"))
              .catch(() => flash("Copy failed — try selecting manually"));
          }}
        >
          📋 Share The Verdict
        </button>
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
      <CueVote album={album} cards={corner.cards} />
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
