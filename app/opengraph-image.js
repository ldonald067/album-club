import { ImageResponse } from "next/og";
import { getTodayAlbum, getDateString } from "@/lib/albums";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Today's album at Album Of The Day Club";

/* Regenerated per request rather than cached: the album turns over at UTC
   midnight and a cached card would show yesterday's record to everyone who
   shares the link today. The page itself is force-dynamic for the same reason. */
export const dynamic = "force-dynamic";

/* Drawn from the catalog's own accent colour and cover emoji rather than the
   album artwork. The artwork is a remote Last.fm or iTunes URL, and a card that
   depends on a third-party fetch fails silently in exactly the place nobody
   looks — inside someone else's chat client. Colour and emoji always render. */
export default function OpengraphImage() {
  const album = getTodayAlbum();
  const accent = album.color || "#2a4858";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: `linear-gradient(135deg, ${accent} 0%, #1a1a2e 100%)`,
        padding: "64px 72px",
        fontFamily: "sans-serif",
        color: "#fdf8ec",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 28,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#e8d5b8",
        }}
      >
        <div style={{ display: "flex" }}>Album Of The Day Club</div>
        <div style={{ display: "flex" }}>{getDateString()}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
        <div style={{ display: "flex", fontSize: 180 }}>{album.cover}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 820,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: album.title.length > 34 ? 62 : 82,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {album.title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              marginTop: 16,
              color: "#e8d5b8",
            }}
          >
            {album.artist}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              marginTop: 12,
              color: "#bdb6a4",
            }}
          >
            {album.year} · {album.genre}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 30,
          color: "#e8d5b8",
        }}
      >
        Rate it, call the vibe, argue about where it belongs.
      </div>
    </div>,
    { ...size },
  );
}
