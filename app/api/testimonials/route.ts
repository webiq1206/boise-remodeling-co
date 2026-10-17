import { NextResponse } from "next/server";
import { SHOW_TESTIMONIALS, TESTIMONIALS } from "@/shared/testimonialsData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // SHOW_TESTIMONIALS is the publish flag. While it is off, do not read the
  // stored rows: production still holds another business's reviews. The
  // database client stays unloaded on this path, so a missing DATABASE_URL
  // cannot turn the empty response into a 500.
  if (!SHOW_TESTIMONIALS) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const { db, isDbAvailable } = await import("@/lib/db");
  const { testimonials } = await import("@/shared/schema");
  const { storage } = await import("@/server/storage");

  if (isDbAvailable() && db) {
    try {
      const dbTestimonials = await db.select().from(testimonials).limit(50);
      if (dbTestimonials.length > 0) {
        return NextResponse.json(dbTestimonials);
      }
    } catch (error) {
      console.error("Error fetching testimonials from database:", error);
    }
  }

  try {
    const stored = await storage.getAllTestimonials();
    if (stored.length > 0) {
      return NextResponse.json(stored);
    }
  } catch (error) {
    console.error("Error fetching testimonials from storage:", error);
  }

  return NextResponse.json(TESTIMONIALS);
}
