/**
 * Which routes the estimator app owns (skip marketing chrome).
 *
 * Nested routes under `/estimate/` (scope, preview, etc.) are the one-page estimator app: they carry
 * their own brand bar, step progress and exit control. Marketing navigation around those routes
 * costs about a third of a phone screen before any content.
 *
 * `/estimate` itself is the D5 short marketing quote form (HeroConversion + fold-form). It must keep
 * `.approved-shell.site-remodeling` so fold-form CSS, contrast tokens, and site chrome apply.
 */
export function isEstimatorPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/estimate/');
}
