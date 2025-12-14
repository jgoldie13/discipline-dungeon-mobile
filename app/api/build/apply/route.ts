import { NextRequest, NextResponse } from 'next/server'
import { applyBuildPoints, getBlueprintMetadata } from '@/lib/build'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { requireUser } from '@/lib/supabase/requireUser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { points, sourceType, sourceId } = body
    const userId = await requireUser()

    if (!points || points <= 0) {
      return NextResponse.json({ error: 'No points provided' }, { status: 400 })
    }

    const result = await applyBuildPoints({
      userId,
      points,
      sourceType,
      sourceId,
      blueprintId: getBlueprintMetadata().id,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error applying build points:', error)
    return NextResponse.json({ error: 'Failed to apply build points' }, { status: 500 })
  }
}
