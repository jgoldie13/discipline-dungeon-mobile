import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { paid, proofUrl, cheated } = await request.json();

    const stake = await prisma.stakeCommitment.findUnique({
      where: { id },
    });

    if (!stake) {
      return NextResponse.json({ error: "Stake not found" }, { status: 404 });
    }

    // Update stake with payment info
    const updatedStake = await prisma.stakeCommitment.update({
      where: { id },
      data: {
        paid: paid === true,
        paidAt: paid === true ? new Date() : null,
        proofUrl: proofUrl || null,
        cheated: cheated === true,
      },
    });

    return NextResponse.json({ stake: updatedStake });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
