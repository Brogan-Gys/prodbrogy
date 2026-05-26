import { NextResponse } from "next/server";
import { getSounds } from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const sounds = await getSounds({ cache: "no-store" });

  return NextResponse.json({ sounds });
}
