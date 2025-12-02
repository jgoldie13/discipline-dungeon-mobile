import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stake = await prisma.stakeCommitment.findUnique({
      where: { id },
    });

    if (!stake) {
      return NextResponse.json({ error: "Stake not found" }, { status: 404 });
    }

    return NextResponse.json({ stake });
  } catch (error) {
    console.error("Error fetching stake:", error);
    return NextResponse.json(
      { error: "Failed to fetch stake" },
      { status: 500 }
    );
  }
}
