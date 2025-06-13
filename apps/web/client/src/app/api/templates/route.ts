import { NextResponse } from "next/server";
import { templates } from "@/data/templates";

// Cache the response at build-time and revalidate once per hour
export const dynamic = "force-static";
export const revalidate = 60 * 60; // 1 hour

export async function GET() {
    return NextResponse.json(templates);
} 