import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUserId } from "@/lib/supabase/auth";
import { isUnauthorizedError } from "@/lib/supabase/http";

// Create new stake commitment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      startDate,
      endDate,
      maxSocialMediaMin,
      minExposureTasks,
      minPhoneFreeBlocks,
      antiCharityName,
      antiCharityUrl,
    } = body;

    const userId = await requireAuthUserId();

    // Check if there's already an active stake for this period
    const existing = await prisma.stakeCommitment.findFirst({
      where: {
        userId,
        startDate: new Date(startDate),
        evaluated: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active stake for this week" },
        { status: 400 }
      );
    }

    // Create the stake
    const stake = await prisma.stakeCommitment.create({
      data: {
        userId,
        amount: parseInt(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxSocialMediaMin: parseInt(maxSocialMediaMin),
        minExposureTasks: parseInt(minExposureTasks),
        minPhoneFreeBlocks: parseInt(minPhoneFreeBlocks),
        antiCharityName,
        antiCharityUrl,
      },
    });

    return NextResponse.json({ stake }, { status: 201 });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating stake:", error);
    return NextResponse.json(
      { error: "Failed to create stake commitment" },
      { status: 500 }
    );
  }
}

// Get current/active stake
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();

    // Get the most recent unevaluated stake
    const currentStake = await prisma.stakeCommitment.findFirst({
      where: {
        userId,
        evaluated: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!currentStake) {
      return NextResponse.json({ stake: null });
    }

    // Get stats for this week
    const { startDate, endDate } = currentStake;

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
      (log) => log.socialMediaMin > currentStake.maxSocialMediaMin
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

    return NextResponse.json({
      stake: currentStake,
      progress: {
        daysOverLimit,
        exposureTasksCompleted: exposureTasks.length,
        phoneFreeBlocksCompleted: phoneFreeBlocks.length,
      },
    });
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
