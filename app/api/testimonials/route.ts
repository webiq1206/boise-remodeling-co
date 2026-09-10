import { NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { testimonials } from "@/shared/schema";
import { storage } from "@/server/storage";
import { TESTIMONIALS } from "@/shared/testimonialsData";

export async function GET() {
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
