import Link from "next/link";
import { sectionPath } from "./sections";
import {
  CREDITS,
  DISCLAIMER,
  badgesFor,
  errorFor,
  posterFor,
  promoFor,
  ringNextTitle,
  showsRails,
} from "@/lib/margin-rails";

/* The 1990s and 2004 sidebar junk in the margins of a wide screen
   (lib/margin-rails.js says what, why, and how the copy writes itself from
   `day`). A server component: SectionPage renders it and hands it to
   ForumPage as `rails`, which puts it first in <main>, so it ships no
   script. Hidden below the width that has room for it (globals.css).

   Class names steer clear of "ad", "banner", "sponsor" and "skyscraper" on
   purpose: ad blockers hide elements by names like those, and these are the
   club's own notices. */

/* A fake button from the era's deceptive ads. It does nothing but say so
   (globals.css shows "Nice try." while it is pressed or focused), and a
   screen reader is told it is a parody before anyone presses it. */
function FakeButton({ className, children }) {
  return (
    <button
      type="button"
      className={`rail-fake ${className}`}
      aria-label="Parody button: it does nothing"
      title="This button has never done anything"
    >
      {children}
    </button>
  );
}

// The jack-o'-lantern carved into the poster record's label in Halloween week
function PumpkinFace() {
  return (
    <svg className="rail-poster-face" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 8 L8 8 L6.25 4.8 Z M12 8 L15.5 8 L13.75 4.8 Z" />
      <path d="M3.5 11 L5.5 13 L7.5 11 L10 13 L12.5 11 L14.5 13 L16.5 11 L15 15.5 L5 15.5 Z" />
    </svg>
  );
}

export default function MarginRails({ section, day }) {
  if (!showsRails(section)) return null;
  const poster = posterFor(day, section);
  const error = errorFor(day, section);
  const promo = promoFor(day, section);
  return (
    <div className="margin-rails">
      {poster && (
        <aside
          className={`margin-rail margin-rail-left${poster.look ? ` rail-look-${poster.look.id}` : ""}`}
          aria-label="Club notice"
        >
          <Link
            href={sectionPath(poster.to)}
            prefetch={false}
            className={`rail-poster${poster.spooky ? " rail-poster-spooky" : ""}`}
          >
            {/* The first beat, as an animated banner played it: the
                clickbait alone, before the punchline. Gone after 2.4s, and
                never shown under reduced motion. */}
            <span className="rail-poster-tease" aria-hidden="true">
              {poster.tease}
            </span>
            <span className="rail-poster-head">{poster.head}</span>
            <span className="rail-poster-disc" aria-hidden="true">
              <span className="rail-poster-label">
                {poster.spooky && <PumpkinFace />}
              </span>
              {/* The week's sticker, slapped on the record (LOOKS) */}
              {poster.look?.sticker && (
                <span className="rail-poster-sticker">
                  {poster.look.sticker}
                </span>
              )}
            </span>
            <span className="rail-poster-body">{poster.body}</span>
            <span className="rail-poster-stars">
              ★★★★★
              <br />
              AS SEEN ON THE INTERNET
            </span>
            <span className="rail-poster-cta">{poster.cta}</span>
            <span className="rail-poster-fine">
              A notice from the club. There are no real ads here.
            </span>
          </Link>
          <FakeButton className="rail-poster-x">×</FakeButton>
        </aside>
      )}
      <aside
        className="margin-rail margin-rail-right"
        aria-label="Parody badges"
      >
        <ul className="rail-badges">
          {badgesFor(day).map((b) => (
            <li key={b.small} className={`rail-badge rail-badge-${b.look}`}>
              <span className="rail-badge-icon" aria-hidden="true">
                {b.icon}
              </span>
              <span className="rail-badge-text">
                <span className="rail-badge-small">{b.small}</span>
                <span className="rail-badge-big">{b.big}</span>
              </span>
            </li>
          ))}
        </ul>
        <nav className="rail-ring" aria-label="The Album Ring">
          <span className="rail-ring-title">THE ALBUM RING</span>
          <span className="rail-ring-links">
            <Link
              href={sectionPath("archive")}
              prefetch={false}
              title={
                day.yesterday
                  ? `Yesterday: ${day.yesterday.title} by ${day.yesterday.artist}`
                  : "The Archive"
              }
            >
              ◄ prev
            </Link>
            {" · "}
            <span title={ringNextTitle(day)}>next ►</span>
          </span>
        </nav>
        {/* The day's 125×125 square (PROMOS). Its art (the record to bop,
            the arrow, the tray) is drawn by .rail-promo-<id> in CSS; the
            search field is drawn too, never an input. */}
        {promo && (
          <Link
            href={sectionPath(promo.to)}
            prefetch={false}
            className={`rail-promo rail-promo-${promo.id}`}
          >
            <span className="rail-promo-art" aria-hidden="true" />
            {promo.kicker && (
              <span className="rail-promo-kicker">{promo.kicker}</span>
            )}
            {promo.head && <span className="rail-promo-head">{promo.head}</span>}
            {promo.field && (
              <span className="rail-promo-field">{promo.field}</span>
            )}
            {promo.cta && <span className="rail-promo-cta">{promo.cta}</span>}
            {promo.fine && <span className="rail-promo-fine">{promo.fine}</span>}
          </Link>
        )}
        <div className="rail-error" role="group" aria-label="Parody error box">
          <div className="rail-error-bar">
            <span>{error.title}</span>
            <FakeButton className="rail-error-x">×</FakeButton>
          </div>
          <div className="rail-error-body">
            <span className="rail-error-icon" aria-hidden="true">
              ✕
            </span>
            <span>{error.message}</span>
          </div>
          <div className="rail-error-buttons">
            <Link
              href={sectionPath(error.to)}
              prefetch={false}
              className="rail-error-ok"
            >
              OK
            </Link>
            <FakeButton className="rail-error-cancel">Cancel</FakeButton>
          </div>
        </div>
        {/* The credit runs on in the disclaimer's paragraph: a line of
            its own pushed a 760px window's column off the screen */}
        <p className="rail-disclaimer">
          {DISCLAIMER} Formats after the{" "}
          {CREDITS.map((c, i) => (
            <span key={c.name}>
              {i === 0 ? "" : i === CREDITS.length - 1 ? " and " : ", "}
              <a href={c.href}>{c.name}</a>
            </span>
          ))}
          .
        </p>
      </aside>
    </div>
  );
}
