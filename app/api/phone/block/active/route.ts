import { NextResponse } from 'next/server'
import { PhoneBlockService } from '@/lib/phone-block.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// GET /api/phone/block/active - Get active phone-free block
export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const block = await PhoneBlockService.getActiveBlock(userId)

    return NextResponse.json({ block })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching active block:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active block' },
      { status: 500 }
    )
  }
}
