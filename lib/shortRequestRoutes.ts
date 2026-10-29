/** The public quote wizard is separate from the nested estimator application. */
export function isShortRequestPath(pathname: string | null | undefined): boolean {
  return pathname === '/estimate';
}
