import { NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { testimonials } from "@/shared/schema";
import { storage } from "@/server/storage";
import { SHOW_TESTIMONIALS, TESTIMONIALS } from "@/shared/testimonialsData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // SHOW_TESTIMONIALS is the publish flag. While it is off, do not read the
  // stored rows: production still holds another business's reviews.
  if (!SHOW_TESTIMONIALS) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

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
