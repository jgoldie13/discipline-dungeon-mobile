import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// GET /api/leaderboard - Get top users by XP (public profiles only)
export async function GET() {
  try {
    const userId = await requireAuthUserId()

    // Get current user's rank info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXp: true,
        currentLevel: true,
        currentStreak: true,
        isPublicProfile: true,
        displayName: true,
        name: true,
      },
    })

    // Get top 100 public profiles ordered by XP
    const leaderboard = await prisma.user.findMany({
      where: {
        isPublicProfile: true,
      },
      select: {
        id: true,
        displayName: true,
        name: true,
        totalXp: true,
        currentLevel: true,
        currentStreak: true,
        longestStreak: true,
      },
      orderBy: {
        totalXp: 'desc',
      },
      take: 100,
    })

    // Calculate ranks
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.displayName || user.name || 'Anonymous',
      totalXp: user.totalXp,
      level: user.currentLevel,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isCurrentUser: user.id === userId,
    }))

    // Find current user's rank if they're public
    let currentUserRank = null
    if (currentUser?.isPublicProfile) {
      const index = rankedLeaderboard.findIndex((u) => u.id === userId)
      currentUserRank = index >= 0 ? index + 1 : null
    }

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      currentUser: currentUser
        ? {
            totalXp: currentUser.totalXp,
            level: currentUser.currentLevel,
            streak: currentUser.currentStreak,
            isPublic: currentUser.isPublicProfile,
            rank: currentUserRank,
            displayName: currentUser.displayName || currentUser.name,
          }
        : null,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

// PATCH /api/leaderboard - Update privacy settings
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = await req.json()
    const { isPublicProfile, displayName } = body

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPublicProfile: isPublicProfile !== undefined ? isPublicProfile : undefined,
        displayName: displayName !== undefined ? displayName : undefined,
      },
      select: {
        isPublicProfile: true,
        displayName: true,
        name: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating leaderboard settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
