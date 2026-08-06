/**
 * Single source of truth for which routes are "portal" routes (admin +
 * subcontractor), so the marketing chrome (full nav, footer) never renders
 * on them. Previously this path list was copy-pasted between Navigation.tsx
 * and ConditionalFooter.tsx and could drift if a new portal route was added
 * to only one of them.
 */
export function isPortalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/subcontractor/portal") ||
    pathname.startsWith("/subcontractor/leads") ||
    pathname.startsWith("/subcontractor/compliance") ||
    pathname.startsWith("/subcontractor/projects") ||
    pathname.startsWith("/subcontractor/contracts") ||
    pathname === "/subcontractor" ||
    pathname.startsWith("/subcontractor/purchases")
  );
}
