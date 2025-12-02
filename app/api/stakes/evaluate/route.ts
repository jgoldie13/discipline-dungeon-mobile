import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { stakeId } = await request.json();
    const userId = "demo-user-1";

    const stake = await prisma.stakeCommitment.findUnique({
      where: { id: stakeId },
    });

    if (!stake || stake.userId !== userId) {
      return NextResponse.json({ error: "Stake not found" }, { status: 404 });
    }

    if (stake.evaluated) {
      return NextResponse.json(
        { error: "Stake already evaluated" },
        { status: 400 }
      );
    }

    // Get stats for this week
    const { startDate, endDate } = stake;

    // Count phone logs that exceeded the limit
    const phoneLogs = await prisma.phoneDailyLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const daysOverLimit = phoneLogs.filter(
      (log) => log.socialMediaMin > stake.maxSocialMediaMin
    ).length;

    // Count exposure tasks completed this week
    const exposureTasks = await prisma.task.findMany({
      where: {
        userId,
        type: "exposure",
        completed: true,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Count phone-free blocks this week
    const phoneFreeBlocks = await prisma.phoneFreeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Determine outcome
    const passedSocialMedia = daysOverLimit === 0;
    const passedExposureTasks = exposureTasks.length >= stake.minExposureTasks;
    const passedPhoneFreeBlocks =
      phoneFreeBlocks.length >= stake.minPhoneFreeBlocks;

    const outcome =
      passedSocialMedia && passedExposureTasks && passedPhoneFreeBlocks
        ? "PASS"
        : "FAIL";

    // Update stake
    const updatedStake = await prisma.stakeCommitment.update({
      where: { id: stakeId },
      data: {
        evaluated: true,
        evaluatedAt: new Date(),
        outcome,
      },
    });

    return NextResponse.json({
      stake: updatedStake,
      results: {
        outcome,
        passedSocialMedia,
        passedExposureTasks,
        passedPhoneFreeBlocks,
        stats: {
          daysOverLimit,
          exposureTasksCompleted: exposureTasks.length,
          phoneFreeBlocksCompleted: phoneFreeBlocks.length,
        },
      },
    });
  } catch (error) {
    console.error("Error evaluating stake:", error);
    return NextResponse.json(
      { error: "Failed to evaluate stake" },
      { status: 500 }
    );
  }
}
