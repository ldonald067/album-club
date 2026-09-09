/* Image metadata files are not inherited by nested segments — measured, not
   assumed: /archive shipped a text-only card until this file existed, while /
   had the image. Each tab re-exports the one implementation in
   app/opengraph-image.js rather than owning a copy of it.

   `dynamic` is declared here rather than re-exported with the rest: Next parses
   route segment config statically and refuses a re-exported one outright. It
   means the same thing it does on the original — the album turns over at UTC
   midnight, so a cached card would show yesterday's record. */
export const dynamic = "force-dynamic";

export { default, size, contentType, alt } from "../opengraph-image";
