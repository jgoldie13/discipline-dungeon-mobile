import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUserId } from "@/lib/supabase/auth";
import { isUnauthorizedError } from "@/lib/supabase/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await requireAuthUserId();
    const stake = await prisma.stakeCommitment.findFirst({
      where: { id, userId },
    });

    if (!stake) {
      return NextResponse.json({ error: "Stake not found" }, { status: 404 });
    }

    return NextResponse.json({ stake });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching stake:", error);
    return NextResponse.json(
      { error: "Failed to fetch stake" },
      { status: 500 }
    );
  }
}
