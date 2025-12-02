import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all tasks for user
export async function GET() {
  try {
    const userId = 'user_default'

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, type, durationMin } = body
    const userId = 'user_default'

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        description,
        type,
        durationMin,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
