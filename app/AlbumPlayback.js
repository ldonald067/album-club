"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getListenUrl, getTodayKey } from "@/lib/albums";
import {
  readNeedle,
  writeNeedle,
  clearNeedle,
  heardThrough,
} from "@/lib/needle";

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
/* How long the needle rides the run-out groove after the last song before
   the arm goes home and the record is put away, as an auto-return deck does. */
const RUNOUT_MS = 7000;
const TICK_MS = 500;
// The needle is remembered every few ticks rather than on every one
const SAVE_EVERY_TICKS = 4;

/* getListenUrl returns the stored video URL whenever an id exists, which is
   exactly wrong on the failure path: a deleted, private or region-blocked video
   would send the visitor to the same dead page that just failed to play. When
   playback fails we search for the record instead. */
function searchUrl(album) {
  const q = encodeURIComponent(`${album.artist} ${album.title} full album`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/* `onDeckChange` reports where the record is, so the hero's vinyl can show it:
   "playing" spins, "paused" is parked out of the sleeve and still, "runout"
   keeps turning with the needle in the run-out groove after the last song,
   "off" is back in the sleeve. Paused and off are different on purpose — a
   record you paused is still on the platter; one you stopped has been put away.

   `onProgress` reports how far through the album playback is, 0 to 1, on
   every clock tick, seek, Stop and end — the hero's tonearm follows it.

   `onPlayedThrough(heard)` fires when the album reaches its end; `heard` says
   whether it was actually listened to rather than skipped to (lib/needle.js).

   `controlRef` lets the record itself drive playback (lib/tonearm.js): `drop`
   puts the needle down at a fraction of the album and plays, `lift` pauses
   while the arm is held, `stop` sends it home. `ready` says whether any of
   that can work yet.

   Where the needle was lifted is remembered for the rest of the day
   (lib/needle.js): a reload finds the record on the platter, the arm where it
   was, and Play picks up from there. Stop and the end of the album forget it. */
export default function AlbumPlayback({
  album,
  onDeckChange,
  onProgress,
  onPlayedThrough,
  controlRef,
}) {
  const playerRef = useRef(null);
  const tickRef = useRef(null);
  const runoutTimerRef = useRef(null);
  // Seconds actually played since the last Stop or end — what a full play needs
  const heardRef = useRef(0);
  const durationRef = useRef(0);
  // A remembered spot that the first Play should start from
  const resumeRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  // On the platter since the last Play, until Stop or the end of the record
  const [started, setStarted] = useState(false);
  // The needle in the run-out groove, for a few seconds after the last song
  const [runout, setRunout] = useState(false);

  const hasAudio = Boolean(album.youtubeId);

  const finishRef = useRef(onPlayedThrough);
  finishRef.current = onPlayedThrough;

  /** Remember where the needle is, if it is somewhere worth returning to. */
  const rememberNeedle = useCallback(() => {
    const player = playerRef.current;
    const t = player?.getCurrentTime?.() || 0;
    if (t > 2 && durationRef.current > 0) {
      writeNeedle(
        getTodayKey(),
        album.youtubeId,
        t,
        heardRef.current,
        durationRef.current,
      );
    }
  }, [album.youtubeId]);

  useEffect(() => {
    if (!hasAudio) return undefined;
    let cancelled = false;

    /* Reset per attempt. The effect already re-runs when the id changes, but
       the state did not, so one failed album left a mounted component showing
       the fallback forever — including for a later, perfectly playable one. */
    setFailed(false);
    setReady(false);
    setPlaying(false);
    setStarted(false);
    setRunout(false);
    clearTimeout(runoutTimerRef.current);
    setElapsed(0);
    setDuration(0);
    heardRef.current = 0;
    durationRef.current = 0;
    resumeRef.current = 0;

    /* Where the needle was left today, if anywhere: the record goes back on
       the platter, paused, with the arm at that spot. Play resumes from it
       (see toggle), because cueing the player there instead would need
       seekTo, and seekTo on a cued video starts it playing by itself. */
    const saved = readNeedle(getTodayKey(), album.youtubeId);
    if (saved && saved.t > 2 && saved.d > saved.t + 3) {
      resumeRef.current = saved.t;
      heardRef.current = saved.heard;
      durationRef.current = saved.d;
      setElapsed(saved.t);
      setDuration(saved.d);
      setStarted(true);
    }

    /* Fail on evidence, never on a stopwatch. A ten-second deadline was tried
       and removed: it turned a slow connection into a permanent failure, and a
       late onReady could not take it back. The signals below are real ones —
       the script erroring, or the player reporting the video is unplayable —
       and while loading, the row already shows an "Open on YouTube" link, so a
       slow load is never a trap. */
    const fail = () => {
      if (cancelled) return;
      cancelled = true; // stop initPlayer running behind the failure
      try {
        playerRef.current?.destroy?.();
      } catch {
        // Half-built player; nothing to clean up
      }
      playerRef.current = null;
      setFailed(true);
    };

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
            const d = event.target.getDuration() || durationRef.current;
            durationRef.current = d;
            setDuration(d);
            setReady(true);
          },
          /* A video can be deleted, made private, or have embedding disabled
             long after its id was written into the catalog. Without this the
             controls simply stayed disabled forever with no explanation —
             silently killing the one capability this component exists for. */
          onError: fail,
          onStateChange: (event) => {
            if (cancelled) return;
            const state = event.data;
            const PS = window.YT.PlayerState;
            setPlaying(state === PS.PLAYING);
            if (state === PS.PLAYING) {
              setStarted(true);
              clearTimeout(runoutTimerRef.current);
              setRunout(false);
            }
            if (state === PS.PAUSED) rememberNeedle();
            /* The end of the album: the needle rides the run-out groove for a
               few seconds, still turning, then the arm goes home and the
               record is put away. Whether it was heard rather than skipped
               to is decided here, before the count is reset. */
            if (state === PS.ENDED) {
              const heard = heardThrough(heardRef.current, durationRef.current);
              clearNeedle();
              heardRef.current = 0;
              resumeRef.current = 0;
              setElapsed(durationRef.current);
              setRunout(true);
              finishRef.current?.(heard);
              clearTimeout(runoutTimerRef.current);
              runoutTimerRef.current = setTimeout(() => {
                setRunout(false);
                setStarted(false);
                setElapsed(0);
              }, RUNOUT_MS);
            }
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
        tag.onerror = fail; // blocked by an extension, offline, proxied away
        document.head.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      clearInterval(tickRef.current);
      clearTimeout(runoutTimerRef.current);
      // Switching to the Webamp view or another tab keeps the spot
      rememberNeedle();
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // Torn down mid-load; nothing left to clean up
        }
      }
      playerRef.current = null;
    };
  }, [hasAudio, album.youtubeId, rememberNeedle]);

  // Leaving the page keeps the spot too: closing the tab, or a phone putting
  // the page away, which fires visibilitychange more reliably than pagehide.
  useEffect(() => {
    if (!hasAudio) return undefined;
    const keep = () => {
      if (document.visibilityState === "hidden") rememberNeedle();
    };
    window.addEventListener("pagehide", rememberNeedle);
    document.addEventListener("visibilitychange", keep);
    return () => {
      window.removeEventListener("pagehide", rememberNeedle);
      document.removeEventListener("visibilitychange", keep);
    };
  }, [hasAudio, rememberNeedle]);

  /* Tell the hero where the record is. Derived, so it only fires on a change
     of state and never on the 500ms clock tick. "Paused" comes from what was
     pressed, not from the clock: inferring it from `elapsed > 0` put the
     record away when a visitor paused inside the first half-second (before
     the first tick) or dragged the seek bar to 0:00 while paused. Only Stop
     and the end of the record put it away — the end after the run-out. */
  const deck = runout
    ? "runout"
    : playing
      ? "playing"
      : started
        ? "paused"
        : "off";
  const deckRef = useRef(onDeckChange);
  deckRef.current = onDeckChange;
  useEffect(() => {
    deckRef.current?.(failed ? "off" : deck);
  }, [deck, failed]);
  // Unmounting — the Webamp view, a tab change — puts the record away.
  useEffect(() => () => deckRef.current?.("off"), []);

  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => {
    progressRef.current?.(duration > 0 ? elapsed / duration : 0);
  }, [elapsed, duration]);

  /* Only tick while something is actually playing. Each tick is also half a
     second heard — wall-clock time while the player says PLAYING, so a seek
     forward adds nothing — and every few ticks the needle is remembered. */
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!playing) return undefined;
    let ticks = 0;
    tickRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      heardRef.current += TICK_MS / 1000;
      setElapsed(player.getCurrentTime() || 0);
      if (!duration && player.getDuration) {
        const d = player.getDuration() || 0;
        durationRef.current = d;
        setDuration(d);
      }
      if (++ticks % SAVE_EVERY_TICKS === 0) rememberNeedle();
    }, TICK_MS);
    return () => clearInterval(tickRef.current);
  }, [playing, duration, rememberNeedle]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      player.pauseVideo?.();
    } else if (resumeRef.current) {
      // Back to where the needle was left; seekTo starts it playing
      player.seekTo?.(resumeRef.current, true);
      player.playVideo?.();
      resumeRef.current = 0;
    } else {
      player.playVideo?.();
    }
  }, [playing]);

  // Stop forgets the spot and the listening so far: the next Play is a fresh
  // start, and a fresh start is what a full play has to be heard from.
  const stop = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pauseVideo?.();
    player.seekTo?.(0, true);
    clearTimeout(runoutTimerRef.current);
    setRunout(false);
    setElapsed(0);
    setStarted(false);
    clearNeedle();
    heardRef.current = 0;
    resumeRef.current = 0;
  }, []);

  /* The record as the controls (ForumPage, lib/tonearm.js). A needle dropped
     anywhere on the record plays from that point, as one put down by hand
     does — from a pause or with the record still in its sleeve alike. */
  useImperativeHandle(
    controlRef,
    () => ({
      ready: ready && !failed && Boolean(playerRef.current),
      drop(fraction) {
        const player = playerRef.current;
        const d = durationRef.current;
        if (!player || !d) return;
        const t = Math.min(d - 1, Math.max(0, fraction * d));
        clearTimeout(runoutTimerRef.current);
        setRunout(false);
        resumeRef.current = 0;
        setElapsed(t);
        player.seekTo?.(t, true);
        player.playVideo?.();
      },
      lift() {
        if (playing) playerRef.current?.pauseVideo?.();
      },
      stop,
    }),
    [ready, failed, playing, stop],
  );

  /* Same fallback as an album with no id at all: whether the catalog never had
     audio or the audio turned out to be unplayable, what the visitor needs is a
     working way to hear the record. */
  if (!hasAudio || failed) {
    return (
      <a
        href={failed ? searchUrl(album) : getListenUrl(album)}
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
          resumeRef.current = 0;
          playerRef.current?.seekTo?.(value, true);
        }}
      />

      <div id="album-playback-audio" className="album-playback-audio" />
    </div>
  );
}
