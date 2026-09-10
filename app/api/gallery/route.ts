import { NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { galleryPhotos } from "@/shared/schema";
import { storage } from "@/server/storage";
import { GALLERY_PROJECTS } from "@/shared/galleryData";

export async function GET() {
  if (isDbAvailable() && db) {
    try {
      const photos = await db.select().from(galleryPhotos).limit(50);
      if (photos.length > 0) {
        return NextResponse.json(photos);
      }
    } catch (error) {
      console.error("Error fetching gallery from database:", error);
    }
  }

  try {
    const photos = await storage.getAllGalleryPhotos();
    if (photos.length > 0) {
      return NextResponse.json(photos);
    }
  } catch (error) {
    console.error("Error fetching gallery from storage:", error);
  }

  return NextResponse.json(GALLERY_PROJECTS);
}
