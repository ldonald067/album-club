"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getListenUrl } from "@/lib/albums";
import { getAlbumFacts } from "@/lib/soundtrack-corner";

/* A 2004 media-player homage for today's album, offered as an alternative view
   of the album hero. Deliberately NOT a Winamp reproduction: no wordmark, no
   lightning bolt, no llama. The layout grammar of that era — an LCD strip, a
   scrolling marquee, a transport row, an EQ panel behind tabs — is a shared
   visual language; the artwork and the branding are not ours to copy, and
   Winamp's own source is licensed against exactly that (private use only, no
   distribution of modified versions), so nothing here derives from it.

   Lives outside ForumPage.js against the usual convention because it owns a
   YouTube player lifecycle and ~300 lines of self-contained chrome. It is on
   the home path, so it is imported normally rather than dynamically.

   WHAT IS REAL AND WHAT IS COSTUME. The transport, seek, volume and clock all
   drive the same YouTube IFrame API the Heardle and Blind Taste Test already
   use, so pressing play plays the record. The spectrum and the EQ are period
   costume: a cross-origin YouTube iframe exposes no audio data to Web Audio,
   and the API has no equaliser. The spectrum animates only while audio is
   actually playing and flattens when it stops, so it never claims to be
   analysing something that is not there, and the EQ panel says what it is. */

const EQ_BANDS = [
  "60",
  "170",
  "310",
  "600",
  "1K",
  "3K",
  "6K",
  "12K",
  "14K",
  "16K",
];
const EQ_KEY = "aotd_player_eq";
const VOLUME_KEY = "aotd_player_volume";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Sourced facts read as a player readout almost verbatim: tracks and runtime
    are exactly what the strip beside the clock was always for. */
function buildReadout(album) {
  const facts = getAlbumFacts(album);
  const parts = [];
  if (facts?.tracks) parts.push(`${facts.tracks} TRK`);
  if (facts?.runtimeMinutes) parts.push(`${facts.runtimeMinutes} MIN`);
  parts.push(String(album.year));
  /* Genre earns the right-hand end of the strip. Without it the row ran out of
     content halfway and left a gap that read as something failing to load. */
  parts.push(album.genre.toUpperCase());
  return parts;
}

export default function ClubPlayer({ album }) {
  const hasAudio = Boolean(album.youtubeId);
  const playerRef = useRef(null);
  const tickRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [eq, setEq] = useState(() => EQ_BANDS.map(() => 0));
  const [preamp, setPreamp] = useState(0);
  const [tab, setTab] = useState("equalizer");

  /* Restore the knobs. New keys — nothing existing was renamed. */
  useEffect(() => {
    try {
      /* Check for the key before parsing it. Number(null) is 0, and 0 passes
         a 0-100 range check, so reading it straight muted the player for every
         first-time visitor — a default of silence, arrived at by arithmetic. */
      const savedVolumeRaw = localStorage.getItem(VOLUME_KEY);
      if (savedVolumeRaw !== null) {
        const savedVolume = Number(savedVolumeRaw);
        if (
          Number.isFinite(savedVolume) &&
          savedVolume >= 0 &&
          savedVolume <= 100
        ) {
          setVolume(savedVolume);
        }
      }
      const savedEq = JSON.parse(localStorage.getItem(EQ_KEY) || "null");
      if (
        Array.isArray(savedEq?.bands) &&
        savedEq.bands.length === EQ_BANDS.length
      ) {
        setEq(savedEq.bands.map((n) => (Number.isFinite(n) ? n : 0)));
        setPreamp(Number.isFinite(savedEq.preamp) ? savedEq.preamp : 0);
      }
    } catch {
      // A corrupt entry just means default knobs, which is a fine place to start
    }
  }, []);

  // Load the IFrame API, chaining the global callback the other players share.
  useEffect(() => {
    if (!hasAudio) return undefined;
    let cancelled = false;

    function initPlayer() {
      if (cancelled || playerRef.current) return;
      playerRef.current = new window.YT.Player("club-player-audio", {
        height: "0",
        width: "0",
        videoId: album.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            event.target.setVolume(volume);
            setDuration(event.target.getDuration() || 0);
            setReady(true);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.ENDED) setElapsed(0);
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      clearInterval(tickRef.current);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // A player torn down mid-load throws; nothing left to clean up
        }
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio, album.youtubeId]);

  // The clock only runs while something is actually playing.
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!playing) return undefined;
    tickRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      setElapsed(player.getCurrentTime() || 0);
      if (!duration && player.getDuration)
        setDuration(player.getDuration() || 0);
    }, 250);
    return () => clearInterval(tickRef.current);
  }, [playing, duration]);

  const play = () => playerRef.current?.playVideo?.();
  const pause = () => playerRef.current?.pauseVideo?.();
  const stop = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pauseVideo?.();
    player.seekTo?.(0, true);
    setElapsed(0);
  }, []);

  const seek = (value) => {
    setElapsed(value);
    playerRef.current?.seekTo?.(value, true);
  };

  const changeVolume = (value) => {
    setVolume(value);
    playerRef.current?.setVolume?.(value);
    try {
      localStorage.setItem(VOLUME_KEY, String(value));
    } catch {
      // Private mode; the knob still works for this session
    }
  };

  const changeBand = (index, value) => {
    const next = eq.map((v, i) => (i === index ? value : v));
    setEq(next);
    persistEq(next, preamp);
  };

  const changePreamp = (value) => {
    setPreamp(value);
    persistEq(eq, value);
  };

  function persistEq(bands, preampValue) {
    try {
      localStorage.setItem(
        EQ_KEY,
        JSON.stringify({ bands, preamp: preampValue }),
      );
    } catch {
      // Same as volume: a lost preference is not worth an error path
    }
  }

  const readout = buildReadout(album);
  const marquee = `${album.title} — ${album.artist}`;

  return (
    <div className="club-player">
      <div className="club-player-titlebar">
        <span className="club-player-name">CLUB PLAYER</span>
        <span className="club-player-badge">{album.cover}</span>
      </div>

      <div className="club-player-lcd">
        <div className="club-player-lcd-top">
          <span className="club-player-state" aria-hidden="true">
            {playing ? "▶" : "‖"}
          </span>
          <span className="club-player-clock">
            {formatTime(elapsed)}
            {duration ? ` / ${formatTime(duration)}` : ""}
          </span>
          <span className="club-player-readout">
            {readout.map((part) => (
              <span key={part} className="club-player-chip">
                {part}
              </span>
            ))}
          </span>
          {/* Costume, and only rendered where it could ever mean something: with
              no audio source it can never move, so it would be a dead ornament
              taking the best space on the display. It moves only while audio is
              genuinely playing, never implying analysis of a stream we cannot
              read. */}
          {hasAudio && (
            <span
              className={`club-player-spectrum${playing ? " active" : ""}`}
              aria-hidden="true"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <i key={i} style={{ animationDelay: `${i * 70}ms` }} />
              ))}
            </span>
          )}
        </div>
        {/* Always scrolling, and doubled. A single run of short text slid out of
            frame and left the row blank for most of the cycle; two identical
            copies with identical trailing space make -50% a seamless loop. The
            copy is aria-hidden so it is not announced twice. */}
        <div className="club-player-marquee">
          <div className="club-player-marquee-track">
            <span>{marquee}</span>
            <span aria-hidden="true">{marquee}</span>
          </div>
        </div>
      </div>

      {hasAudio ? (
        <>
          <label className="sr-only" htmlFor="club-player-seek">
            Seek within {album.title}
          </label>
          <input
            id="club-player-seek"
            className="club-player-seek"
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="1"
            value={Math.min(elapsed, duration || 1)}
            disabled={!ready || !duration}
            onChange={(e) => seek(Number(e.target.value))}
          />

          <div className="club-player-transport">
            <button
              type="button"
              className="club-player-btn"
              onClick={play}
              disabled={!ready || playing}
              aria-label={`Play ${album.title}`}
            >
              {"▶"}
            </button>
            <button
              type="button"
              className="club-player-btn"
              onClick={pause}
              disabled={!ready || !playing}
              aria-label="Pause"
            >
              {"‖"}
            </button>
            <button
              type="button"
              className="club-player-btn"
              onClick={stop}
              disabled={!ready}
              aria-label="Stop"
            >
              {"■"}
            </button>
            <div className="club-player-volume">
              <label className="sr-only" htmlFor="club-player-volume">
                Volume
              </label>
              <span aria-hidden="true">{"🔊"}</span>
              <input
                id="club-player-volume"
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="club-player-nosource" role="status">
          No audio source for this one — the catalog has no video id for it.{" "}
          <a
            href={getListenUrl(album)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search YouTube
          </a>
        </div>
      )}

      <div className="club-player-tabs" role="tablist">
        {[
          ["equalizer", "EQUALIZER"],
          ["info", "INFO"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`club-player-tab${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "equalizer" ? (
        <div className="club-player-eq">
          <div className="club-player-eq-row">
            <div className="club-player-band">
              <input
                type="range"
                min="-12"
                max="12"
                value={preamp}
                aria-label="Preamp"
                onChange={(e) => changePreamp(Number(e.target.value))}
              />
              <span>PRE</span>
            </div>
            {EQ_BANDS.map((band, i) => (
              <div className="club-player-band" key={band}>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eq[i]}
                  aria-label={`${band} hertz band`}
                  onChange={(e) => changeBand(i, Number(e.target.value))}
                />
                <span>{band}</span>
              </div>
            ))}
          </div>
          <p className="club-player-eq-note">
            The sliders are scenery — they remember where you put them, but
            YouTube gives us no equaliser to hand them to. Kept because the
            panel is half the reason anyone loved these things.
          </p>
        </div>
      ) : (
        <dl className="club-player-info">
          <div>
            <dt>Album</dt>
            <dd>{album.title}</dd>
          </div>
          <div>
            <dt>Artist</dt>
            <dd>{album.artist}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{album.year}</dd>
          </div>
          <div>
            <dt>Genre</dt>
            <dd>{album.genre}</dd>
          </div>
        </dl>
      )}

      {hasAudio && <div id="club-player-audio" className="club-player-audio" />}
    </div>
  );
}
