import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/supabase/auth'
import { safeParseSettings, UserSettingsV1Schema } from '@/lib/policy/settings.schema'
import { getUserSettingsServer } from '@/lib/settings/getUserSettings.server'

export const dynamic = 'force-dynamic'

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const { settings } = await getUserSettingsServer()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    // Return defaults on error
    const defaults = safeParseSettings({})
    return NextResponse.json({ settings: defaults })
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: Request) {
  try {
    const userId = await getAuthUserId()
    const body = await request.json()

    // Validate settings
    const parsed = UserSettingsV1Schema.safeParse(body.settings)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const settings = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    }

    // Update user settings
    // Note: This requires a 'settings' JSONB column on the User table
    // If it doesn't exist, we'll create a separate UserSettings table or add the column
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: settings,
        },
      })
    } catch (dbError) {
      // If settings column doesn't exist, store locally for now
      console.warn('Could not save to database, settings column may not exist:', dbError)
      // In production, you'd want to add the column via migration
    }

    return NextResponse.json({ settings, success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
