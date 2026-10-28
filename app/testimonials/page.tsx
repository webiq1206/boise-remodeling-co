import { redirect } from "next/navigation";

/** F21 / R-8: design galleries live at /design-ideas. Keep this file so the
 *  App Router still owns the path while next.config issues the permanent redirect. */
export default function TestimonialsRedirectPage() {
  redirect("/design-ideas");
}
