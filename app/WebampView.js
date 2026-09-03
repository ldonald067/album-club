"use client";

import React, { useEffect, useRef, useState } from "react";
import { getListenUrl } from "@/lib/albums";

/* Webamp (captbaritone/webamp) — a real Winamp 2 reimplementation, MIT
   licensed, embedded as a third view of the album hero.

   ATTRIBUTION AND LICENCE. The code is MIT (© Jordan Eldredge and
   contributors). Its author is explicit that "the Winamp name, interface, and
   sample audio file are surely property of Nullsoft", which is why this is an
   opt-in view rather than the site's default face, and why our own Club Player
   — drawn from scratch, no Winamp artwork — remains the house player.

   WHAT IT CANNOT DO, stated plainly because it is the whole shape of this
   component: Webamp plays audio through the Web Audio API, which means audio
   files it can fetch. Today's album is a YouTube video id, and a cross-origin
   YouTube iframe is opaque to Web Audio. So this cannot play the album of the
   day, and no wiring makes it. It opens with an empty playlist and accepts
   files the visitor drags in, which is Webamp's own native behaviour and the
   only honest way to offer it here. The album's own audio stays with the Club
   Player and the YouTube link beneath.

   WEIGHT, and why this loads from a script tag rather than an import. The
   bundle is ~917KB minified against a home page that ships ~190KB of JS in
   total. Wrapping the component in next/dynamic was NOT enough: Turbopack
   prefetches dynamic chunks, so the 295KB chunk went over the wire on the
   default view for every visitor, including everyone who never opened it —
   measured in production, not assumed. Loading the UMD build from
   /vendor/webamp.bundle.min.js takes the bundler out of it entirely, the same
   way this site already loads the YouTube IFrame API. Nothing is fetched until
   this component mounts. */

const WEBAMP_SRC = "/vendor/webamp.bundle.min.js";

/** Load the UMD bundle once and hand back the global it defines. */
function loadWebamp() {
  if (window.Webamp) return Promise.resolve(window.Webamp);

  const existing = document.querySelector(`script[src="${WEBAMP_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.Webamp));
      existing.addEventListener("error", reject);
    });
  }

  return new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = WEBAMP_SRC;
    tag.onload = () => resolve(window.Webamp);
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
}

export default function WebampView({ album, onClose }) {
  const hostRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let disposed = false;
    let instance = null;

    async function boot() {
      try {
        const Webamp = await loadWebamp();
        if (disposed || !hostRef.current || !Webamp) return;

        instance = new Webamp({
          // No initialTracks: there is no album audio it could legally or
          // technically be handed. An empty playlist is the honest start.
          zIndex: 1,
        });

        /* Closing Webamp's own window would otherwise leave this view selected
           with nothing on screen and no way back except the dropdown. */
        instance.onClose(() => {
          if (!disposed && typeof onClose === "function") onClose();
        });

        await instance.renderWhenReady(hostRef.current);
        if (disposed) {
          instance.dispose();
          return;
        }
        setStatus("ready");
      } catch (error) {
        if (!disposed) setStatus("failed");
      }
    }

    boot();

    return () => {
      disposed = true;
      try {
        instance?.dispose();
      } catch {
        // Disposing a half-initialised instance throws; nothing left to clean
      }
    };
  }, []);

  return (
    <div className="webamp-view">
      <p className="webamp-note">
        This is <strong>Webamp</strong> — Winamp 2 reimplemented for the browser
        by Jordan Eldredge, used under the MIT licence. It plays audio files you
        drag into it. It cannot play today&apos;s album: that is a YouTube
        video, and YouTube&apos;s audio is sealed off from the browser APIs
        Webamp needs.{" "}
        <a href={getListenUrl(album)} target="_blank" rel="noopener noreferrer">
          {album.title} on YouTube
        </a>
        , or switch the view to Player to hear it here.
      </p>
      <p className="webamp-note">
        It opens as a floating window over the page — drag it by its title bar,
        and close it to come back to the album.
      </p>

      {status === "failed" && (
        <p className="webamp-note" role="alert">
          Webamp failed to load. Switch the view back to Album or Player.
        </p>
      )}

      {status === "loading" && (
        <p className="webamp-note" role="status">
          Loading Webamp…
        </p>
      )}

      {/* Webamp appends its own container to document.body and floats its
          windows over the page — it is a desktop-style overlay, not an inline
          embed, and no amount of wrapping changes that. So this is a mount
          point, not a frame: it reserves no height, because nothing renders
          inside it. React must also never render children here; Webamp mutates
          the subtree imperatively, and a React child inside it leaves React
          calling removeChild on a node Webamp already replaced, which throws
          and takes the page to the error boundary. */}
      <div ref={hostRef} className="webamp-host" />
    </div>
  );
}
