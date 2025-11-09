import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/db/queries'
import { FEATURE_KEYS, logFeatureUsage } from '@/lib/limits'
import {
  generateStoryboardOutput,
  type StoryboardResponse,
} from '@/lib/gemini'

const requestSchema = z.object({
  script: z.string().min(60, 'Please provide a script with enough context.'),
  format: z.enum(['vertical', 'square', 'widescreen']),
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(300)
    .optional(),
  title: z.string().max(120).optional(),
  source: z.string().url().optional(),
})

type RequestPayload = z.infer<typeof requestSchema>

type ErrorResponse = {
  success: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'INVALID_INPUT'
      | 'BILLING_REQUIRED'
      | 'INTERNAL_ERROR'
    message: string
    preview?: StoryboardResponse
  }
}

type SuccessResponse = {
  success: true
  data: StoryboardResponse
}

const PREMIUM_SAMPLE: StoryboardResponse = {
  scenes: [
    {
      index: 1,
      time: '0s – 5s',
      visual:
        'Montage of transcript highlights animating into the Studio 24 interface.',
      textOverlay: '“One transcript → full storyboard”',
      voiceover:
        'Hook the viewer: “Here’s how Studio 24 turns long-form recordings into ready-to-edit storyboards.”',
      note: 'Use punchy transitions to emphasise speed.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 2,
      time: '5s – 10s',
      visual:
        'UI screen recording showing structured scenes, overlays, and captions.',
      voiceover:
        '“Each scene comes pre-built with visuals, overlays, CTA notes, and Canva-ready templates.”',
      note: 'Zoom into the scene cards and highlight CTA notes.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 3,
      time: '10s – 15s',
      visual:
        'Editor dragging the storyboard JSON into Canva / timeline workspace.',
      textOverlay: '“Export straight to Canva”',
      voiceover:
        '“Send the scene timeline directly into Canva within seconds—no manual rewriting required.”',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 4,
      time: '15s – 20s',
      visual:
        'Results screen showing campaign metrics and time saved metrics for the team.',
      voiceover:
        '“Teams save hours per campaign and keep copy, visuals, and pacing aligned with brand.”',
      note: 'End with Studio 24 lockup + CTA.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
  ],
  productionNotes:
    'Keep overlays within safe margins for Reels/TikTok exports. Match typography to Studio 24 design system.',
}

export async function POST(req: Request) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please sign in to generate a storyboard.',
        },
      },
      { status: 401 }
    )
  }

  let payload: RequestPayload
  try {
    const body = await req.json()
    payload = requestSchema.parse(body)
  } catch (error) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message:
            error instanceof z.ZodError
              ? error.issues[0]?.message ?? 'Invalid request payload.'
              : 'Invalid request payload.',
        },
      },
      { status: 400 }
    )
  }

  if (user.plan !== 'pro') {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'BILLING_REQUIRED',
          message:
            'Storyboard Studio is a Premium workflow. Upgrade to unlock Canva-ready scene timelines.',
          preview: PREMIUM_SAMPLE,
        },
      },
      { status: 402 }
    )
  }

  try {
    const result = await generateStoryboardOutput({
      script: payload.script,
      format: payload.format,
      durationSeconds: payload.durationSeconds,
    })

    await logFeatureUsage(user, FEATURE_KEYS.STORYBOARD, {
      format: payload.format,
      scriptLength: payload.script.length,
      durationSeconds: payload.durationSeconds ?? null,
      hasSource: Boolean(payload.source),
    })

    return NextResponse.json<SuccessResponse>({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[storyboard] unexpected error', error)
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unexpected server error.'

    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env.NODE_ENV !== 'production'
              ? message
              : 'Something went wrong while generating the storyboard. Please try again.',
        },
      },
      { status: 500 }
    )
  }
}

