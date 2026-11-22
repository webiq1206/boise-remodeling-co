/**
 * Post-deploy IndexNow gate. The network call lives in submit-indexnow.mjs.
 * This module decides whether a process may ping, and the log line a deploy
 * prints after api.indexnow.org answers.
 */

/**
 * True only for a Replit production deployment. CI, pull-request builds, and
 * local or preview runs return false and must not call the network.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function shouldSubmitIndexNow(env = process.env) {
  const ci = env.CI;
  if (ci === 'true' || ci === '1' || ci === 'TRUE') return false;
  if (env.GITHUB_ACTIONS === 'true' || env.GITHUB_EVENT_NAME === 'pull_request') return false;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return false;
  return env.REPLIT_DEPLOYMENT === '1';
}

/**
 * The one deploy log line. status is the HTTP status from api.indexnow.org.
 *
 * @param {string} sha
 * @param {number} submitted
 * @param {number | string} status
 */
export function indexNowLogLine(sha, submitted, status) {
  return `[IndexNow] sha=${sha} submitted=${submitted} status=${status}`;
}
