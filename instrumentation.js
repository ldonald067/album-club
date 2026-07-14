// Next.js instrumentation hook — runs once when the server boots.
// Node's default SIGTERM exit code is 143, which Railway's notifier
// reports as "Deploy Crashed" for the old container on every rollout.
// Exiting 0 marks the shutdown as the clean stop it actually is.
// (Requests are millisecond-fast here and better-sqlite3 writes are
// synchronous, so immediate exit is safe.)
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("SIGTERM", () => process.exit(0));
    process.on("SIGINT", () => process.exit(0));
  }
}
