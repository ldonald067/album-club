"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getListenUrl } from "@/lib/albums";

/* Inline playback for the album hero, replacing the "Listen on YouTube" link
   with real transport when the album has audio.

   This is what survived the Club Player. That view wrapped the same YouTube
   lifecycle in ~450px of chrome, more than half of it an equaliser and a
   spectrum that shaped nothing, and it could not play at all on the 68% of days
   whose album has no video id. The only thing it did that nothing else did was
   play today's record without leaving the page, so that is the part that moved
   here and the rest was deleted.

   Deliberately no volume control: the browser and the operating system both
   have one, and adding a third would put a second row back into a hero that was
   trimmed for taking up too much space.

   Same IFrame API the Heardle and Blind Taste Test use, so the script is
   usually already loaded by the time anyone presses play. */

const VOLUME = 80;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function AlbumPlayback({ album }) {
  const playerRef = useRef(null);
  const tickRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasAudio = Boolean(album.youtubeId);

  useEffect(() => {
    if (!hasAudio) return undefined;
    let cancelled = false;

    function initPlayer() {
      if (cancelled || playerRef.current) return;
      playerRef.current = new window.YT.Player("album-playback-audio", {
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
            event.target.setVolume(VOLUME);
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
      // Chain the global callback — the games share it on their own days
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
          // Torn down mid-load; nothing left to clean up
        }
      }
      playerRef.current = null;
    };
  }, [hasAudio, album.youtubeId]);

  // Only tick while something is actually playing.
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!playing) return undefined;
    tickRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      setElapsed(player.getCurrentTime() || 0);
      if (!duration && player.getDuration) {
        setDuration(player.getDuration() || 0);
      }
    }, 500);
    return () => clearInterval(tickRef.current);
  }, [playing, duration]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo?.();
    else player.playVideo?.();
  }, [playing]);

  const stop = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pauseVideo?.();
    player.seekTo?.(0, true);
    setElapsed(0);
  }, []);

  if (!hasAudio) {
    return (
      <a
        href={getListenUrl(album)}
        target="_blank"
        rel="noopener noreferrer"
        className="listen-btn"
      >
        ▶ Search on YouTube
      </a>
    );
  }

  return (
    <div className="album-playback">
      <div className="album-playback-row">
        <button
          type="button"
          className="listen-btn album-playback-play"
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? `Pause ${album.title}` : `Play ${album.title}`}
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          className="album-playback-stop"
          onClick={stop}
          disabled={!ready}
          aria-label="Stop"
        >
          ■
        </button>
        <span className="album-playback-time">
          {formatTime(elapsed)}
          {duration ? ` / ${formatTime(duration)}` : ""}
        </span>
        <a
          href={getListenUrl(album)}
          target="_blank"
          rel="noopener noreferrer"
          className="album-playback-exit"
        >
          Open on YouTube
        </a>
      </div>

      <label className="sr-only" htmlFor="album-playback-seek">
        Seek within {album.title}
      </label>
      <input
        id="album-playback-seek"
        className="album-playback-seek"
        type="range"
        min="0"
        max={Math.max(duration, 1)}
        step="1"
        value={Math.min(elapsed, duration || 1)}
        disabled={!ready || !duration}
        onChange={(e) => {
          const value = Number(e.target.value);
          setElapsed(value);
          playerRef.current?.seekTo?.(value, true);
        }}
      />

      <div id="album-playback-audio" className="album-playback-audio" />
    </div>
  );
}
