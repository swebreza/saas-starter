import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/db/queries'
import {
  assertWithinLimits,
  FEATURE_KEYS,
  isLimitReachedError,
  logFeatureUsage,
} from '@/lib/limits'
import {
  generateTextStudioOutput,
  GeminiError,
  type TextStudioResponse,
} from '@/lib/gemini'

const requestSchema = z.object({
  contentType: z.enum(['hook', 'caption', 'script', 'outline']),
  topic: z.string().min(3).max(280),
  tone: z.enum(['bold', 'friendly', 'professional', 'playful', 'empathetic']),
  audience: z.string().min(3).max(200),
  additionalNotes: z.string().max(500).optional(),
})

type RequestPayload = z.infer<typeof requestSchema>

type ErrorResponse = {
  success: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'INVALID_INPUT'
      | 'LIMIT_REACHED'
      | 'BILLING_REQUIRED'
      | 'INTERNAL_ERROR'
    message: string
    limit?: number
  }
}

type SuccessResponse = {
  success: true
  data: TextStudioResponse & {
    usage: {
      limit: number | null
      remaining: number | null
    }
  }
}

export async function POST(req: Request) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please sign in to generate content.',
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

  let usageSnapshot
  try {
    usageSnapshot = await assertWithinLimits(user, FEATURE_KEYS.TEXT)
  } catch (error) {
    if (isLimitReachedError(error)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: 'Daily free limit reached. Upgrade to keep creating.',
            limit: error.limit,
          },
        },
        { status: 429 }
      )
    }
    throw error
  }

  try {
    const result = await generateTextStudioOutput(payload)

    await logFeatureUsage(user, FEATURE_KEYS.TEXT, {
      contentType: payload.contentType,
      tone: payload.tone,
      audience: payload.audience,
    })

    const remaining =
      usageSnapshot.remaining !== null
        ? Math.max(usageSnapshot.remaining - 1, 0)
        : null

    return NextResponse.json<SuccessResponse>({
      success: true,
      data: {
        ...result,
        usage: {
          limit: usageSnapshot.limit,
          remaining,
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

    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong while generating content.',
        },
      },
      { status: 500 }
    )
  }
}
