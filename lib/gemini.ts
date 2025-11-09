import { Buffer } from 'node:buffer'
import { z } from 'zod'

/**
 * Centralised Gemini prompt builders and response contracts.
 * Update this file whenever we introduce a new Gemini-powered workflow so the
 * rest of the codebase can rely on typed, structured outputs.
 *
 * Phases implemented so far:
 * - Phase 2: Text Studio (multi-variant copy generation)
 * - Phase 4: Video Repurpose Studio (hooks, shorts scripts, captions, summary)
 * - Phase 5: Storyboard Studio (scene timeline JSON)
 *
 * Future phases (Auto Reels rendering) should extend the types below instead of
 * defining ad-hoc prompts in route handlers.
 */

export type PromptTone =
  | 'bold'
  | 'friendly'
  | 'professional'
  | 'playful'
  | 'empathetic'

export type TargetPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube_shorts'
  | 'linkedin'
  | 'x'
  | 'facebook'
  | 'threads'

export type TextStudioInput = {
  contentType: 'hook' | 'caption' | 'script' | 'outline'
  topic: string
  tone: PromptTone
  audience: string
  additionalNotes?: string
}

export type TextVariant = {
  label: string
  platform: TargetPlatform
  text: string
  callToAction?: string
}

export type TextStudioResponse = {
  variants: TextVariant[]
  guidance?: string
}

const textStudioResponseSchema = z.object({
  variants: z
    .array(
      z.object({
        label: z.string().min(1),
        platform: z.string().min(1),
        text: z.string().min(1),
        callToAction: z.string().optional(),
      })
    )
    .min(1),
  guidance: z.string().optional(),
})

export class GeminiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiError'
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

export type VideoRepurposeInput = {
  transcript: string
  title?: string
  tone: PromptTone
  targetPlatforms: TargetPlatform[]
  callToAction?: string
}

export type VideoRepurposeResponse = {
  hooks: string[]
  shortScripts: Array<{
    headline: string
    script: string
    estimatedRuntimeSeconds: number
  }>
  captions: Array<{
    platform: TargetPlatform
    copy: string
    hashtags: string[]
  }>
  summary: string
}

export type StoryboardInput = {
  script: string
  format: 'vertical' | 'square' | 'widescreen'
  durationSeconds?: number
}

export type StoryboardScene = {
  index: number
  time: string
  visual: string
  textOverlay?: string
  voiceover: string
  note?: string
  canvaTemplateSlug?: string
}

export type StoryboardResponse = {
  scenes: StoryboardScene[]
  productionNotes?: string
}

export type AutoReelPlanInput = {
  youtubeUrl: string
  transcript?: string
  tone: string
  highlightCount: number
  highlightDurationSeconds: number
  callToAction?: string | null
  title?: string | null
}

export type AutoReelSegmentPlan = {
  label: string
  startSeconds: number
  endSeconds: number
  hook: string
  overlayText?: string
  caption?: string
  callToAction?: string
}

export type AutoReelPlanResponse = {
  aspectRatio: '9:16' | '1:1'
  segments: AutoReelSegmentPlan[]
  captions?: string[]
  soundtrackMood?: string
}

const rawVideoRepurposeSchema = z.object({
  hooks: z.array(z.any()).min(1),
  shortScripts: z.array(z.any()).min(1),
  captions: z.array(z.any()).min(1),
  summary: z.any(),
})

const rawStoryboardSchema = z.object({
  scenes: z.array(z.any()).min(3),
  productionNotes: z.any().optional(),
})

const rawAutoReelPlanSchema = z.object({
  aspectRatio: z
    .union([z.literal('9:16'), z.literal('1:1')])
    .optional()
    .default('9:16'),
  segments: z
    .array(
      z.object({
        label: z.string().min(1),
        startSeconds: z.number(),
        endSeconds: z.number(),
        hook: z.string(),
        overlayText: z.string().optional(),
        caption: z.string().optional(),
        callToAction: z.string().optional(),
      })
    )
    .min(1),
  captions: z.array(z.string()).optional(),
  soundtrackMood: z.string().optional(),
})

function normalizePlatform(value: string): TargetPlatform {
  const normalised = value.trim().toLowerCase().replace(/\s+/g, '_')

  switch (normalised) {
    case 'tiktok':
      return 'tiktok'
    case 'instagram':
    case 'instagram_reels':
    case 'reels':
      return 'instagram'
    case 'youtube_shorts':
    case 'youtube':
    case 'shorts':
      return 'youtube_shorts'
    case 'linkedin':
      return 'linkedin'
    case 'twitter':
    case 'x':
      return 'x'
    case 'facebook':
      return 'facebook'
    case 'threads':
      return 'threads'
    default:
      return 'instagram'
  }
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    typeof (value as { text?: unknown }).text === 'string'
  ) {
    const trimmed = ((value as { text?: string }).text ?? '').trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(5, Math.round(value))
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return Math.max(5, Math.round(parsed))
    }
  }
  return fallback
}

const CANVA_TEMPLATE_SLUGS: Record<StoryboardInput['format'], string> = {
  vertical: 'studio24-storyboard-vertical',
  square: 'studio24-storyboard-square',
  widescreen: 'studio24-storyboard-widescreen',
}

function coerceTimeRange(
  value: unknown,
  index: number,
  defaultDurationSeconds = 6
): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'start' in value &&
    'end' in value
  ) {
    const start = coerceString((value as { start?: unknown }).start)
    const end = coerceString((value as { end?: unknown }).end)
    if (start && end) {
      return `${start} – ${end}`
    }
  }

  const startSec = Math.max(0, index * defaultDurationSeconds)
  const endSec = startSec + defaultDurationSeconds
  return `${startSec}s – ${endSec}s`
}

function coerceArrayOfStrings(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }
  const cleaned = value
    .map((entry) => coerceString(entry))
    .filter((entry): entry is string => Boolean(entry))
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Build the system prompt for Text Studio generations.
 */
export function buildTextStudioPrompt(input: TextStudioInput): string {
  return [
    'You are Studio 24, a premium AI content strategist.',
    'Produce structured JSON with persuasive but on-brand marketing copy.',
    `Content Type: ${input.contentType}`,
    `Topic: ${input.topic}`,
    `Tone: ${input.tone}`,
    `Audience: ${input.audience}`,
    input.additionalNotes ? `Notes: ${input.additionalNotes}` : '',
    'Return an object { "variants": [ { "label": "...", "platform": "...", "text": "..." } ] }',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateTextStudioOutput(
  input: TextStudioInput
): Promise<TextStudioResponse> {
  if (process.env.MOCK_GEMINI === 'true') {
    return {
      variants: [
        {
          label: 'Signature Hook',
          platform: 'instagram',
          text: `Turn “${input.topic}” into a scroll-stopping story in 30 seconds.`,
          callToAction: 'Tap to turn ideas into publish-ready content.',
        },
        {
          label: 'LinkedIn Lead-In',
          platform: 'linkedin',
          text: `Creators can’t afford slow pipelines. Here’s how ${input.topic} unlocks campaigns in hours—not weeks.`,
        },
      ],
      guidance:
        'Test the hook on two channels first, then expand into long-form scripts.',
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      'Gemini API key is not configured. Set GEMINI_API_KEY to continue.'
    )
  }

  const prompt = buildTextStudioPrompt(input)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: 'You are Studio 24, a premium campaign strategist. Always respond with valid JSON matching the requested schema.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new GeminiError(
      `Gemini request failed (${response.status}): ${
        errorBody || 'unknown error'
      }`
    )
  }

  const payload = await response.json()
  const payloadAny = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
          inlineData?: { data?: string }
        }>
      }
    }>
  }

  const part = payloadAny?.candidates?.[0]?.content?.parts?.[0]
  const candidateText =
    typeof part?.text === 'string' && part.text.length > 0
      ? part.text
      : undefined
  const candidateInline =
    part?.inlineData && typeof part.inlineData.data === 'string'
      ? part.inlineData.data
      : undefined

  if (!candidateText && !candidateInline) {
    throw new GeminiError('Gemini did not return a usable response.')
  }

  let parsed: unknown
  try {
    parsed = candidateText
      ? JSON.parse(candidateText)
      : JSON.parse(
          Buffer.from(candidateInline as string, 'base64').toString('utf8')
        )
  } catch {
    throw new GeminiError('Failed to parse Gemini response JSON.')
  }

  const parsedResponse = textStudioResponseSchema.parse(parsed)

  return {
    ...parsedResponse,
    variants: parsedResponse.variants.map((variant) => ({
      ...variant,
      platform: normalizePlatform(variant.platform),
    })),
  } as TextStudioResponse
}

export function buildVideoRepurposePrompt(input: VideoRepurposeInput): string {
  return [
    'You are Studio 24, specialising in turning long-form narratives into short-form packages.',
    `Platforms: ${input.targetPlatforms.join(', ')}`,
    `Tone: ${input.tone}`,
    input.callToAction ? `Preferred CTA: ${input.callToAction}` : '',
    'Respond with { "hooks": [], "shortScripts": [], "captions": [], "summary": "" }',
    'Each "shortScripts" entry must include headline, script, and estimatedRuntimeSeconds.',
    '',
    'Transcript:',
    input.transcript,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateVideoRepurposeOutput(
  input: VideoRepurposeInput
): Promise<VideoRepurposeResponse> {
  if (process.env.MOCK_GEMINI === 'true') {
    return {
      hooks: [
        'She scaled a channel from 0 to 1M views without burning out—here’s the 60-second playbook.',
        'What if your long-form interviews could power an entire short-form calendar?',
        'Stop editing from scratch—repurpose once and publish everywhere.',
      ],
      shortScripts: [
        {
          headline: 'Hook + Value',
          script:
            'Open on the creator holding a phone. “We turned a 45-minute webinar into 12 shorts that each cleared 20k views. Here’s the 3-step framework you can lift today.” Cut to steps overlay.',
          estimatedRuntimeSeconds: 38,
        },
        {
          headline: 'Pain Point Flip',
          script:
            'Show B-roll of chaotic editing timelines. “If your video team dreads repurposing, try briefing Studio 24. Drop the transcript, pick your channels, and it spins hooks, scripts, and captions instantly.” CTA overlay.',
          estimatedRuntimeSeconds: 42,
        },
      ],
      captions: [
        {
          platform: 'instagram',
          copy: 'Repurpose smarter, not harder. Drop your transcript, choose your tone, and Studio 24 delivers short-form scripts + captions ready to publish.',
          hashtags: ['#contentstrategy', '#videomarketing', '#studio24'],
        },
        {
          platform: 'tiktok',
          copy: 'Creators: stop rewriting every caption. Our Video Repurpose Studio turns long-form transcripts into viral-ready shorts in one click.',
          hashtags: ['#creatoreconomy', '#repurpose', '#shortformvideo'],
        },
      ],
      summary:
        'Studio 24’s Video Repurpose Studio ingests transcripts and returns hooks, scripts, captions, and a hero summary so teams can publish across channels within minutes.',
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      'Gemini API key is not configured. Set GEMINI_API_KEY to continue.'
    )
  }

  const prompt = buildVideoRepurposePrompt(input)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'You are Studio 24—return structured JSON for video repurposing with hooks, short scripts (including estimated runtimes), captions, and an executive summary. Output must be valid JSON.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown network error'
    throw new GeminiError(`Failed to call Gemini: ${message}`)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new GeminiError(
      `Gemini request failed (${response.status}): ${
        errorBody || 'unknown error'
      }`
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unable to parse JSON'
    throw new GeminiError(`Failed to parse Gemini JSON: ${message}`)
  }
  const payloadAny = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
          inlineData?: { data?: string }
        }>
      }
    }>
  }

  const part = payloadAny?.candidates?.[0]?.content?.parts?.[0]
  const candidateText =
    typeof part?.text === 'string' && part.text.length > 0
      ? part.text
      : undefined
  const candidateInline =
    part?.inlineData && typeof part.inlineData.data === 'string'
      ? part.inlineData.data
      : undefined

  if (!candidateText && !candidateInline) {
    throw new GeminiError('Gemini did not return a usable response.')
  }

  let parsed: unknown
  try {
    parsed = candidateText
      ? JSON.parse(candidateText)
      : JSON.parse(
          Buffer.from(candidateInline as string, 'base64').toString('utf8')
        )
  } catch {
    throw new GeminiError('Failed to parse Gemini response JSON.')
  }

  const parsedResponse = rawVideoRepurposeSchema.parse(parsed)

  const hooks = parsedResponse.hooks
    .map((entry, index) => {
      const value = coerceString(entry)
      if (value) {
        return value
      }
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'hook' in entry &&
        typeof (entry as { hook?: unknown }).hook === 'string'
      ) {
        const trimmed = ((entry as { hook?: string }).hook ?? '').trim()
        if (trimmed) {
          return trimmed
        }
      }
      return `Repurpose Hook #${index + 1}`
    })
    .filter((hook) => hook.length > 0)

  const shortScripts = parsedResponse.shortScripts
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const script = entry.trim()
        if (!script) {
          return null
        }
        return {
          headline: `Short Script ${index + 1}`,
          script,
          estimatedRuntimeSeconds: 45,
        }
      }

      if (typeof entry === 'object' && entry !== null) {
        const scriptText =
          coerceString((entry as { script?: unknown }).script) ??
          coerceString((entry as { body?: unknown }).body) ??
          coerceString((entry as { text?: unknown }).text)

        if (!scriptText) {
          return null
        }

        const headline =
          coerceString((entry as { headline?: unknown }).headline) ??
          coerceString((entry as { title?: unknown }).title) ??
          `Short Script ${index + 1}`

        const runtime = coerceNumber(
          (entry as { estimatedRuntimeSeconds?: unknown })
            .estimatedRuntimeSeconds,
          45
        )

        return {
          headline,
          script: scriptText,
          estimatedRuntimeSeconds: runtime,
        }
      }

      return null
    })
    .filter(
      (
        item
      ): item is {
        headline: string
        script: string
        estimatedRuntimeSeconds: number
      } => item !== null
    )

  const fallbackPlatforms =
    input.targetPlatforms.length > 0
      ? input.targetPlatforms
      : (['instagram'] as TargetPlatform[])

  let platformIndex = 0
  const captions = parsedResponse.captions
    .map((entry) => {
      if (typeof entry === 'string') {
        const copy = entry.trim()
        if (!copy) {
          return null
        }
        const platform =
          fallbackPlatforms[platformIndex % fallbackPlatforms.length]
        platformIndex += 1
        return {
          platform,
          copy,
          hashtags: [] as string[],
        }
      }

      if (typeof entry === 'object' && entry !== null) {
        const copy =
          coerceString((entry as { copy?: unknown }).copy) ??
          coerceString((entry as { text?: unknown }).text) ??
          coerceString((entry as { caption?: unknown }).caption)

        if (!copy) {
          return null
        }

        const platformRaw =
          coerceString((entry as { platform?: unknown }).platform) ??
          coerceString((entry as { channel?: unknown }).channel) ??
          fallbackPlatforms[platformIndex % fallbackPlatforms.length]

        platformIndex += 1

        const hashtagsValue = (entry as { hashtags?: unknown }).hashtags
        const hashtags =
          Array.isArray(hashtagsValue) && hashtagsValue.length > 0
            ? hashtagsValue
                .map((tag) => coerceString(tag))
                .filter((tag): tag is string => Boolean(tag))
                .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
            : []

        return {
          platform: normalizePlatform(platformRaw),
          copy,
          hashtags,
        }
      }

      return null
    })
    .filter(
      (
        item
      ): item is {
        platform: TargetPlatform
        copy: string
        hashtags: string[]
      } => item !== null
    )

  const summary =
    coerceString(parsedResponse.summary) ??
    hooks.slice(0, 2).join(' ') ??
    'Repurpose summary unavailable.'

  if (hooks.length === 0) {
    hooks.push('Transform your long-form content into ready-to-post hooks.')
  }

  if (shortScripts.length === 0) {
    shortScripts.push({
      headline: 'Quick Promo',
      script:
        'Highlight the biggest insight from this transcript and direct viewers to the full piece. Close with a CTA that matches your campaign objective.',
      estimatedRuntimeSeconds: 45,
    })
  }

  if (captions.length === 0) {
    captions.push({
      platform: fallbackPlatforms[0],
      copy: 'Turn this long-form recording into a week of short-form content with Studio 24. Drop the transcript, pick channels, and publish.',
      hashtags: ['#studio24', '#contentrepurpose'],
    })
  }

  return {
    hooks,
    shortScripts,
    captions,
    summary,
  }
}

export function buildStoryboardPrompt(input: StoryboardInput): string {
  return [
    'You are Studio 24, providing storyboard plans for Canva handoff.',
    `Format: ${input.format}`,
    input.durationSeconds
      ? `Target Duration Seconds: ${input.durationSeconds}`
      : '',
    'Return an object { "scenes": [ { "index": 1, "time": "0-3s", "visual": "...", "textOverlay": "...", "voiceover": "...", "note": "" } ] }',
    '',
    'Script:',
    input.script,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateStoryboardOutput(
  input: StoryboardInput
): Promise<StoryboardResponse> {
  if (process.env.MOCK_GEMINI === 'true') {
    return {
      scenes: [
        {
          index: 1,
          time: '0s – 5s',
          visual:
            'Cold open: quick montage of social clips pulled from the hero transcript.',
          textOverlay: '“From a 40-minute interview → a week of content”',
          voiceover:
            'Start with energy: “What if one long-form recording powered every channel you manage?”',
          note: 'Use fast jump cuts to signal speed; keep overlays bold.',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
        {
          index: 2,
          time: '5s – 10s',
          visual:
            'Presenter facing camera, transcript on screen with Studio 24 UI overlay.',
          voiceover:
            '“Studio 24 ingests the transcript, auto-cleans filler, and builds hook + script bundles.”',
          note: 'Highlight the Studio 24 interface; zoom into the structured bundle output.',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
        {
          index: 3,
          time: '10s – 15s',
          visual:
            'Split screen: left shows hooks, right shows short scripts with runtime badges.',
          textOverlay: 'Hooks · Scripts · Captions',
          voiceover:
            '“Every scene gets hooks, runtime-aware scripts, and caption packs tuned for each platform.”',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
        {
          index: 4,
          time: '15s – 20s',
          visual:
            'Timeline zoom-in on caption pack with hashtags and CTA highlights.',
          voiceover:
            '“Captions come pre-loaded with the right hashtags and CTAs, so publishing takes seconds.”',
          note: 'Animate hashtag list sliding in; keep typography brand-aligned.',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
        {
          index: 5,
          time: '20s – 25s',
          visual: 'Success metric overlay: engagement lift, time saved.',
          voiceover:
            '“Teams report 70% faster turnaround on short-form edits when Studio 24 drives the storyboard.”',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
        {
          index: 6,
          time: '25s – 30s',
          visual:
            'Call to action screen with Studio 24 branding and “Generate storyboard” button.',
          textOverlay: 'Turn transcripts into publish-ready storyboards.',
          voiceover:
            '“Drop your next transcript into Studio 24 and hand editors a storyboard that’s ready for Canva.”',
          canvaTemplateSlug: CANVA_TEMPLATE_SLUGS[input.format],
        },
      ],
      productionNotes:
        'Align transitions with beat markers from the transcript. Keep overlays within safe margins for TikTok / Reels export.',
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      'Gemini API key is not configured. Set GEMINI_API_KEY to continue.'
    )
  }

  const prompt = buildStoryboardPrompt(input)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'You are Studio 24—return structured JSON for storyboard planning with array "scenes" (index, time, visual, textOverlay, voiceover, note) and optional "productionNotes". Always respond with valid JSON.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.65,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown network error'
    throw new GeminiError(`Failed to call Gemini: ${message}`)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new GeminiError(
      `Gemini request failed (${response.status}): ${
        errorBody || 'unknown error'
      }`
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unable to parse JSON'
    throw new GeminiError(`Failed to parse Gemini JSON: ${message}`)
  }

  const payloadAny = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
          inlineData?: { data?: string }
        }>
      }
    }>
  }

  const part = payloadAny?.candidates?.[0]?.content?.parts?.[0]
  const candidateText =
    typeof part?.text === 'string' && part.text.length > 0
      ? part.text
      : undefined
  const candidateInline =
    part?.inlineData && typeof part.inlineData.data === 'string'
      ? part.inlineData.data
      : undefined

  if (!candidateText && !candidateInline) {
    throw new GeminiError('Gemini did not return a usable response.')
  }

  let parsed: unknown
  try {
    parsed = candidateText
      ? JSON.parse(candidateText)
      : JSON.parse(
          Buffer.from(candidateInline as string, 'base64').toString('utf8')
        )
  } catch {
    throw new GeminiError('Failed to parse Gemini response JSON.')
  }

  const parsedResponse = rawStoryboardSchema.parse(parsed)

  const templateSlug = CANVA_TEMPLATE_SLUGS[input.format]
  const defaultSceneCount = parsedResponse.scenes.length
  const totalDurationSeconds =
    typeof input.durationSeconds === 'number' && input.durationSeconds > 0
      ? input.durationSeconds
      : defaultSceneCount * 6
  const normalisedSceneDuration = Math.max(
    4,
    Math.floor(totalDurationSeconds / Math.max(defaultSceneCount, 1))
  )

  const scenes = parsedResponse.scenes
    .map((entry, index) => {
      const numericIndex =
        typeof entry === 'object' &&
        entry !== null &&
        'index' in entry &&
        typeof (entry as { index?: unknown }).index === 'number'
          ? Number((entry as { index?: number }).index)
          : index + 1

      const timeRange = coerceTimeRange(
        typeof entry === 'object' && entry !== null
          ? (entry as { time?: unknown; timestamp?: unknown; range?: unknown })
              .time ??
              (
                entry as {
                  time?: unknown
                  timestamp?: unknown
                  range?: unknown
                }
              ).timestamp ??
              (
                entry as {
                  time?: unknown
                  timestamp?: unknown
                  range?: unknown
                }
              ).range
          : undefined,
        numericIndex - 1,
        normalisedSceneDuration
      )

      const visual =
        (typeof entry === 'object' && entry !== null
          ? coerceString(
              (
                entry as {
                  visual?: unknown
                  scene?: unknown
                  description?: unknown
                  imagery?: unknown
                }
              ).visual ??
                (
                  entry as {
                    visual?: unknown
                    scene?: unknown
                    description?: unknown
                    imagery?: unknown
                  }
                ).scene ??
                (
                  entry as {
                    visual?: unknown
                    scene?: unknown
                    description?: unknown
                    imagery?: unknown
                  }
                ).description ??
                (
                  entry as {
                    visual?: unknown
                    scene?: unknown
                    description?: unknown
                    imagery?: unknown
                  }
                ).imagery
            )
          : null) ?? `Showcase the key beat for scene ${numericIndex}.`

      const textOverlay =
        typeof entry === 'object' && entry !== null
          ? coerceString(
              (
                entry as {
                  textOverlay?: unknown
                  overlay?: unknown
                  subtitle?: unknown
                  onScreenText?: unknown
                }
              ).textOverlay ??
                (
                  entry as {
                    textOverlay?: unknown
                    overlay?: unknown
                    subtitle?: unknown
                    onScreenText?: unknown
                  }
                ).overlay ??
                (
                  entry as {
                    textOverlay?: unknown
                    overlay?: unknown
                    subtitle?: unknown
                    onScreenText?: unknown
                  }
                ).subtitle ??
                (
                  entry as {
                    textOverlay?: unknown
                    overlay?: unknown
                    subtitle?: unknown
                    onScreenText?: unknown
                  }
                ).onScreenText
            ) ?? undefined
          : undefined

      const voiceover =
        (typeof entry === 'object' && entry !== null
          ? coerceString(
              (
                entry as {
                  voiceover?: unknown
                  narration?: unknown
                  script?: unknown
                  dialogue?: unknown
                  text?: unknown
                }
              ).voiceover ??
                (
                  entry as {
                    voiceover?: unknown
                    narration?: unknown
                    script?: unknown
                    dialogue?: unknown
                    text?: unknown
                  }
                ).narration ??
                (
                  entry as {
                    voiceover?: unknown
                    narration?: unknown
                    script?: unknown
                    dialogue?: unknown
                    text?: unknown
                  }
                ).script ??
                (
                  entry as {
                    voiceover?: unknown
                    narration?: unknown
                    script?: unknown
                    dialogue?: unknown
                    text?: unknown
                  }
                ).dialogue ??
                (
                  entry as {
                    voiceover?: unknown
                    narration?: unknown
                    script?: unknown
                    dialogue?: unknown
                    text?: unknown
                  }
                ).text
            )
          : coerceString(entry)) ??
        `Narrate the transformation from transcript to storyboard in scene ${numericIndex}.`

      const note =
        typeof entry === 'object' && entry !== null
          ? coerceString(
              (
                entry as {
                  note?: unknown
                  direction?: unknown
                  camera?: unknown
                  motion?: unknown
                  tip?: unknown
                }
              ).note ??
                (
                  entry as {
                    note?: unknown
                    direction?: unknown
                    camera?: unknown
                    motion?: unknown
                    tip?: unknown
                  }
                ).direction ??
                (
                  entry as {
                    note?: unknown
                    direction?: unknown
                    camera?: unknown
                    motion?: unknown
                    tip?: unknown
                  }
                ).camera ??
                (
                  entry as {
                    note?: unknown
                    direction?: unknown
                    camera?: unknown
                    motion?: unknown
                    tip?: unknown
                  }
                ).motion ??
                (
                  entry as {
                    note?: unknown
                    direction?: unknown
                    camera?: unknown
                    motion?: unknown
                    tip?: unknown
                  }
                ).tip
            ) ?? undefined
          : undefined

      return {
        index: numericIndex,
        time: timeRange,
        visual,
        textOverlay,
        voiceover,
        note,
        canvaTemplateSlug: templateSlug,
      }
    })
    .sort((a, b) => a.index - b.index)

  const minimumScenes = Math.max(4, scenes.length)
  while (scenes.length < minimumScenes) {
    const nextIndex = scenes.length + 1
    scenes.push({
      index: nextIndex,
      time: coerceTimeRange(undefined, nextIndex - 1, normalisedSceneDuration),
      visual: `Highlight supporting detail or testimonial for scene ${nextIndex}.`,
      textOverlay: undefined,
      voiceover: `Reinforce the key takeaway for scene ${nextIndex} and remind viewers of the CTA.`,
      note: undefined,
      canvaTemplateSlug: templateSlug,
    })
  }

  const productionNotesArray = coerceArrayOfStrings(
    parsedResponse.productionNotes
  )
  const productionNotes =
    productionNotesArray?.join('\n') ??
    coerceString(parsedResponse.productionNotes) ??
    undefined

  return {
    scenes,
    productionNotes,
  }
}

export function buildAutoReelPrompt(input: AutoReelPlanInput) {
  const parts = [
    'You are Studio 24, an AI assistant that plans short-form social media reels from long-form videos.',
    `Video URL: ${input.youtubeUrl}`,
    input.title ? `Video Title: ${input.title}` : '',
    `Tone: ${input.tone}`,
    `Highlight Count: ${input.highlightCount}`,
    `Highlight Duration Seconds: ${input.highlightDurationSeconds}`,
    input.callToAction ? `Call to Action: ${input.callToAction}` : '',
    '',
    input.transcript
      ? 'Transcript:\n' + input.transcript.slice(0, 10_000)
      : 'Transcript not provided. Develop highlights using best practices for reels from this topic.',
    '',
    'Return JSON with shape { "aspectRatio": "9:16" | "1:1", "segments": [ { "label": string, "startSeconds": number, "endSeconds": number, "hook": string, "overlayText": string, "caption": string, "callToAction": string }], "captions": string[] }',
    'startSeconds and endSeconds map to the original long-form video timeline (seconds).',
    'Ensure durations align with highlightDurationSeconds and produce engaging overlay text & hooks.',
  ]

  return parts.filter(Boolean).join('\n')
}

export async function generateAutoReelPlan(
  input: AutoReelPlanInput
): Promise<AutoReelPlanResponse> {
  if (process.env.MOCK_GEMINI === 'true') {
    return {
      aspectRatio: '9:16',
      segments: Array.from({ length: input.highlightCount }).map((_, idx) => {
        const start = idx * input.highlightDurationSeconds
        return {
          label: `Highlight ${idx + 1}`,
          startSeconds: start,
          endSeconds: start + input.highlightDurationSeconds,
          hook: `Hook ${idx + 1} for ${input.title ?? 'this video'}.`,
          overlayText: `Overlay ${idx + 1}`,
          caption: `Caption ${idx + 1} powered by Studio 24.`,
          callToAction: input.callToAction ?? 'Subscribe for more insights.',
        }
      }),
      captions: [
        'Turn this long-form video into short-form gold with Studio 24.',
        'Auto reels generated in minutes, not hours.',
      ],
      soundtrackMood: 'upbeat electronic',
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      'Gemini API key is not configured. Set GEMINI_API_KEY to continue.'
    )
  }

  const prompt = buildAutoReelPrompt(input)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: 'You are Studio 24—return structured JSON for auto reels with aspectRatio (9:16 preferred) and array "segments" containing label,startSeconds,endSeconds,hook,overlayText,caption,callToAction. Always respond with valid JSON only.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown network error'
    throw new GeminiError(`Failed to call Gemini: ${message}`)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new GeminiError(
      `Gemini request failed (${response.status}): ${
        errorBody || 'unknown error'
      }`
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unable to parse JSON'
    throw new GeminiError(`Failed to parse Gemini JSON: ${message}`)
  }

  const payloadAny = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
          inlineData?: { data?: string }
        }>
      }
    }>
  }

  const part = payloadAny?.candidates?.[0]?.content?.parts?.[0]
  const candidateText =
    typeof part?.text === 'string' && part.text.length > 0
      ? part.text
      : undefined
  const candidateInline =
    part?.inlineData && typeof part.inlineData.data === 'string'
      ? part.inlineData.data
      : undefined

  if (!candidateText && !candidateInline) {
    throw new GeminiError('Gemini did not return a usable response.')
  }

  let parsed: unknown
  try {
    parsed = candidateText
      ? JSON.parse(candidateText)
      : JSON.parse(
          Buffer.from(candidateInline as string, 'base64').toString('utf8')
        )
  } catch {
    throw new GeminiError('Failed to parse Gemini response JSON.')
  }

  const parsedResponse = rawAutoReelPlanSchema.parse(parsed)

  const segments = parsedResponse.segments.map((segment, index) => {
    const startSeconds = Math.max(0, Math.round(segment.startSeconds))
    const endSeconds = Math.max(
      startSeconds + 5,
      Math.round(segment.endSeconds)
    )
    return {
      label: segment.label || `Highlight ${index + 1}`,
      startSeconds,
      endSeconds,
      hook: segment.hook,
      overlayText: segment.overlayText ?? segment.hook,
      caption: segment.caption,
      callToAction: segment.callToAction ?? input.callToAction ?? undefined,
    }
  })

  const aspectRatio = parsedResponse.aspectRatio === '1:1' ? '1:1' : '9:16'

  return {
    aspectRatio,
    segments,
    captions: parsedResponse.captions,
    soundtrackMood: parsedResponse.soundtrackMood,
  }
}
