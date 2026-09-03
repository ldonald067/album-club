/**
 * Copy Webamp's UMD build into public/vendor so it can be loaded at runtime
 * with a <script> tag rather than bundled.
 *
 * WHY NOT JUST IMPORT IT: `next/dynamic` around a component that imports
 * webamp still put the 295KB chunk on the wire for every visitor, including
 * everyone who never opens that view — Turbopack prefetches dynamic chunks, so
 * "lazy" meant "slightly later", not "only if needed". Loading the UMD build
 * from a script tag takes the bundler out of it entirely, the same way the
 * YouTube IFrame API is already loaded on this site.
 *
 * Runs on `predev` AND `prebuild`. It used to run only on prebuild, which meant
 * a clean clone following the documented `npm install && npm run dev` served
 * the bundle as a 404 until somebody happened to run a production build —
 * the feature worked only on machines that had already built it once.
 *
 * The file tracks whatever version package.json resolves rather than a copy
 * committed once and forgotten, which is why public/vendor is gitignored.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const from = path.join(root, "node_modules", "webamp", "built");
/* The npm tarball ships only README, built/ and package.json — no licence
   file — so the MIT text is committed under licenses/ and copied from there.
   MIT requires the notice travel with the code, and "it is on GitHub" is not
   the same as shipping it. */
const licenceFrom = path.join(root, "licenses", "webamp-MIT-LICENSE.txt");
const to = path.join(root, "public", "vendor");

/* Fail, do not skip. Exiting 0 here meant a dependency-pruned or otherwise
   incomplete install still produced a green `npm run build` and deployed a
   permanent 404 behind a view the UI advertises. "Optional" describes when the
   visitor loads the bundle, not whether the artifact has to exist. */
if (!fs.existsSync(from)) {
  console.error(
    "webamp is not installed, so /vendor/webamp.bundle.min.js cannot be built.\n" +
      "Run `npm install` — the Webamp view 404s without it.",
  );
  process.exit(1);
}

fs.mkdirSync(to, { recursive: true });
fs.copyFileSync(
  path.join(from, "webamp.bundle.min.js"),
  path.join(to, "webamp.bundle.min.js"),
);

/* MIT requires the licence travel with the code. It is served next to the
   bundle so the copy on the wire is as licensed as the one in node_modules. */
if (fs.existsSync(licenceFrom)) {
  fs.copyFileSync(licenceFrom, path.join(to, "webamp.LICENSE.txt"));
}

const version = JSON.parse(
  fs.readFileSync(
    path.join(root, "node_modules", "webamp", "package.json"),
    "utf8",
  ),
).version;
console.log(`Vendored webamp ${version} to public/vendor/`);
