/* The vote this browser has already cast under `key`, read at the moment of
   voting rather than only when the page loaded.

   Every activity checked its "already voted" key once, on mount. Two tabs
   opened before voting both saw no vote, so both could POST — and the vote
   tables have no voter column, so the second row opened "second voter" gates
   for a room of one (docs/STATUS.md, open item 6). Re-reading at submit
   closes that multi-tab path; it is a partial fix by design — cleared storage
   or a second device still count twice, and fixing those needs a schema
   change.

   Storage access throws in browsers that block site data; that reads as "no
   vote", the same as the mount-time checks. */
export function readStoredVote(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
