import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { requireUser } from '@/lib/supabase/requireUser'

// POST /api/build/reset - Wipe cathedral progress for the current user (only)
export async function POST() {
  try {
    const userId = await requireUser()

    await prisma.$transaction(async (tx) => {
      const projects = await tx.userProject.findMany({
        where: { userId },
        select: { id: true },
      })

      const projectIds = projects.map((p) => p.id)

      // Explicitly delete per-user build rows (safe even if cascades exist).
      await tx.dragonAttack.deleteMany({ where: { userId } })
      await tx.buildEvent.deleteMany({ where: { userId } })
      if (projectIds.length > 0) {
        await tx.userProjectProgress.deleteMany({
          where: { userProjectId: { in: projectIds } },
        })
      }
      await tx.userProject.deleteMany({ where: { userId } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error resetting build progress:', error)
    return NextResponse.json({ error: 'Failed to reset cathedral progress' }, { status: 500 })
  }
}
