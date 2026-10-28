/**
 * Which routes the estimator app owns (skip marketing chrome).
 *
 * Nested routes under `/estimate/` (scope, preview, etc.) are the one-page estimator app: they carry
 * their own brand bar, step progress and exit control. Marketing navigation around those routes
 * costs about a third of a phone screen before any content.
 *
 * `/estimate` itself is the D2 short quote-request wizard (EstimateRequestWizard). It keeps
 * marketing navigation (not the estimator app chrome) and `.approved-shell.site-remodeling`
 * tokens; Navigation hides the promotional bottom bar while the wizard owns the screen.
 */
export function isEstimatorPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/estimate/');
}
