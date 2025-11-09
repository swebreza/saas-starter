import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/db/queries'
import { FEATURE_KEYS, logFeatureUsage } from '@/lib/limits'
import {
  generateVideoRepurposeOutput,
  GeminiError,
  type VideoRepurposeResponse,
} from '@/lib/gemini'

const MAX_TRANSCRIPT_CHARACTERS = 16000
const MIN_TRANSCRIPT_CHARACTERS = 400

const requestSchema = z
  .object({
    transcript: z.string().min(1),
    tone: z.enum(['bold', 'friendly', 'professional', 'playful', 'empathetic']),
    targetPlatforms: z
      .array(
        z.enum([
          'tiktok',
          'instagram',
          'youtube_shorts',
          'linkedin',
          'x',
          'facebook',
          'threads',
        ])
      )
      .min(1)
      .max(4),
    callToAction: z.string().max(180).optional(),
    title: z.string().max(200).optional(),
    sourceUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    const uniquePlatforms = new Set(value.targetPlatforms)
    if (uniquePlatforms.size !== value.targetPlatforms.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select each platform only once.',
        path: ['targetPlatforms'],
      })
    }
  })

type RequestPayload = z.infer<typeof requestSchema>

type ErrorResponse = {
  success: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'INVALID_INPUT'
      | 'BILLING_REQUIRED'
      | 'LIMIT_REACHED'
      | 'TRANSCRIPT_TOO_LONG'
      | 'INTERNAL_ERROR'
    message: string
    preview?: VideoRepurposeResponse
  }
}

type SuccessResponse = {
  success: true
  data: VideoRepurposeResponse & {
    usage: {
      limit: number | null
      remaining: number | null
    }
  }
}

const PREMIUM_SAMPLE: VideoRepurposeResponse = {
  hooks: [
    'This founder turned a 40-minute interview into a month of shorts—here’s the playbook.',
    'Stop rewriting captions from scratch. Repurpose once, publish everywhere.',
    'The fastest way to turn podcasts into scroll-stopping clips? Studio 24’s Video Repurpose Studio.',
  ],
  shortScripts: [
    {
      headline: 'Repurpose Framework',
      script:
        'Open with an over-the-shoulder shot of an editor scrubbing a timeline. Voiceover: “We used Studio 24 to slice a 45-minute webinar into 12 shorts in under ten minutes.” Cut to the three steps on screen with kinetic text and CTA overlay.',
      estimatedRuntimeSeconds: 36,
    },
    {
      headline: 'Pain Point Hook',
      script:
        'Start with stat overlay: “92% of marketers reuse long-form content—but most still rewrite everything.” Voiceover: “Drop your transcript into Studio 24, pick tone and channels, and it ships hooks, scripts, and captions instantly.” Close on product UI.',
      estimatedRuntimeSeconds: 42,
    },
  ],
  captions: [
    {
      platform: 'instagram',
      copy: 'Drop any transcript. Choose your tone. Studio 24 spins up hooks, short scripts, and caption packs that match each channel.',
      hashtags: ['#contentops', '#videorepurpose', '#studio24'],
    },
    {
      platform: 'linkedin',
      copy: 'We turned a founder AMA into a two-week short-form calendar in one session. Studio 24’s Video Repurpose Studio keeps tone + CTA consistent across every platform.',
      hashtags: ['#b2bmarketing', '#creatoreconomy'],
    },
  ],
  summary:
    'Studio 24 ingests long-form transcripts and returns hooks, short scripts, captions, and an executive summary tailored to each platform, so creative teams can publish faster.',
}

export async function POST(req: Request) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please sign in to repurpose video content.',
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

  const transcript = payload.transcript.trim()

  if (transcript.length < MIN_TRANSCRIPT_CHARACTERS) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message:
            'Please provide a transcript with enough context (at least a few hundred characters).',
        },
      },
      { status: 400 }
    )
  }

  if (transcript.length > MAX_TRANSCRIPT_CHARACTERS) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'TRANSCRIPT_TOO_LONG',
          message:
            'Transcript exceeds the current limit. Trim it or focus on a single segment before retrying.',
        },
      },
      { status: 413 }
    )
  }

  if (user.plan !== 'pro') {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'BILLING_REQUIRED',
          message:
            'Video Repurpose Studio is a Premium workflow. Upgrade to unlock automated hook, script, and caption bundles.',
          preview: PREMIUM_SAMPLE,
        },
      },
      { status: 402 }
    )
  }

  const targetPlatforms = Array.from(new Set(payload.targetPlatforms))
  const input = {
    transcript,
    tone: payload.tone,
    targetPlatforms,
    callToAction: payload.callToAction?.trim() || undefined,
    title: payload.title?.trim() || undefined,
  }

  try {
    const result = await generateVideoRepurposeOutput(input)

    await logFeatureUsage(user, FEATURE_KEYS.VIDEO_REPURPOSE, {
      targetPlatforms,
      transcriptLength: transcript.length,
      tone: payload.tone,
      hasCallToAction: Boolean(payload.callToAction?.trim()),
    })

    return NextResponse.json<SuccessResponse>({
      success: true,
      data: {
        ...result,
        usage: {
          limit: null,
          remaining: null,
        },
      },
    })
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message,
          },
        },
        { status: 502 }
      )
    }

    console.error('[video-repurpose] unexpected error', error)
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
              : 'Something went wrong while generating repurpose assets. Please try again in a moment.',
        },
      },
      { status: 500 }
    )
  }
}
