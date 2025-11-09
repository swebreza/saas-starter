'use client'

import Konva from 'konva'
import { toPng, toSvg } from 'html-to-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowRight,
  BookmarkPlus,
  ClipboardCheck,
  Copy,
  LayoutDashboard,
  Loader2,
  PenLine,
  Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CANVA_TEMPLATE_URLS,
  type CanvaStoryboardFormat,
} from '@/lib/canva/config'
import { cn } from '@/lib/utils'
import type { StoryboardResponse } from '@/lib/gemini'
import {
  StoryboardCanvas,
  type StoryboardCardTheme,
} from '@/components/storyboard/StoryboardCanvas'
import { CanvaEmbed } from '@/components/canva/CanvaEmbed'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ApiUser = {
  id: number
  name: string | null
  email: string
  role: string
  plan: 'free' | 'pro'
  canvaConnected?: boolean
} | null

type StoryboardApiSuccess = {
  success: true
  data: StoryboardResponse
}

type StoryboardApiFailure = {
  success: false
  error: {
    code: string
    message: string
    preview?: StoryboardResponse
  }
}

type StoryboardApiResponse = StoryboardApiSuccess | StoryboardApiFailure

type StoryboardFormat = CanvaStoryboardFormat

type SceneStyle = {
  themeKey: ThemeKey
  overlay: string
  voiceover: string
  note: string
}

const formatOptions: Array<{
  label: string
  value: StoryboardFormat
  description: string
}> = [
  {
    label: 'Vertical (9:16)',
    value: 'vertical',
    description: 'Best for TikTok, Reels, Shorts.',
  },
  {
    label: 'Square (1:1)',
    value: 'square',
    description: 'Great for feed posts and paid placements.',
  },
  {
    label: 'Widescreen (16:9)',
    value: 'widescreen',
    description: 'Ideal for YouTube explainers and webinars.',
  },
]

const CANVAS_SIZES: Record<
  StoryboardFormat,
  { width: number; height: number; padding: number }
> = {
  vertical: { width: 360, height: 640, padding: 28 },
  square: { width: 520, height: 520, padding: 28 },
  widescreen: { width: 720, height: 405, padding: 24 },
}

type ThemeKey = 'sunset' | 'plum' | 'aqua'

const THEME_PRESETS: Record<ThemeKey, StoryboardCardTheme> = {
  sunset: {
    gradientStops: [0, '#FF6F61', 1, '#F8AA40'],
    accent: '#FF9A76',
    overlayBackground: 'rgba(255,255,255,0.12)',
    textPrimary: '#FFFFFF',
    textSecondary: '#FCECDD',
    badgeBackground: 'rgba(255,255,255,0.18)',
    badgeText: '#FFFFFF',
  },
  plum: {
    gradientStops: [0, '#6C63FF', 1, '#C58BFF'],
    accent: '#A689FF',
    overlayBackground: 'rgba(255,255,255,0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E9E5FF',
    badgeBackground: 'rgba(255,255,255,0.2)',
    badgeText: '#FFFFFF',
  },
  aqua: {
    gradientStops: [0, '#00B4DB', 1, '#0083B0'],
    accent: '#35C5F0',
    overlayBackground: 'rgba(255,255,255,0.12)',
    textPrimary: '#FFFFFF',
    textSecondary: '#DCF5FF',
    badgeBackground: 'rgba(255,255,255,0.18)',
    badgeText: '#FFFFFF',
  },
}

const THEME_CHOICES: Array<{ key: ThemeKey; label: string }> = [
  { key: 'sunset', label: 'Sunset' },
  { key: 'plum', label: 'Plum' },
  { key: 'aqua', label: 'Aqua' },
]

const DEFAULT_THEME_SEQUENCE: ThemeKey[] = ['sunset', 'plum', 'aqua']

const textareaStyles =
  'border border-gray-200 bg-white rounded-lg px-3 py-3 text-sm leading-relaxed text-gray-900 shadow-xs focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-200 transition-colors min-h-[240px] resize-y'

const SAMPLE_STORYBOARD: StoryboardResponse = {
  scenes: [
    {
      index: 1,
      time: '0s – 6s',
      visual:
        'Cold open montage of transcript highlights gliding into the Studio 24 dashboard.',
      textOverlay: '“Transcript → Storyboard → Canva”',
      voiceover:
        'Hook: “Here’s how Studio 24 turns a long-form recording into a ready-to-export storyboard.”',
      note: 'Use bold kinetic typography and on-beat cuts.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 2,
      time: '6s – 12s',
      visual: 'Studio 24 UI showcasing structured scenes and CTA notes.',
      voiceover:
        '“Each scene arrives with visuals, overlays, CTA cues, and voiceover prompts.”',
      note: 'Zoom into scene cards and highlight CTA annotations.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 3,
      time: '12s – 18s',
      visual:
        'Editor pulling the storyboard JSON into Canva timeline, assets snapping into place.',
      textOverlay: '“Send to Canva in seconds”',
      voiceover:
        '“Export to Canva with one click—your editor gets a camera-ready timeline immediately.”',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
    {
      index: 4,
      time: '18s – 24s',
      visual: 'Metrics screen showing time saved, campaigns launched.',
      voiceover:
        '“Teams save hours per campaign while keeping every platform on-message.”',
      note: 'Close on Studio 24 logo and CTA.',
      canvaTemplateSlug: 'studio24-storyboard-vertical',
    },
  ],
  productionNotes:
    'Keep overlays within safe margins for Reels export. Align beats to the first hook at the 3-second mark.',
}

function useCopy() {
  return useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }, [])
}

function formatDurationLabel(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return 'Default pacing'
  }
  if (seconds < 60) {
    return `${seconds}s total`
  }
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s total` : `${minutes}m total`
}

export default function StoryboardStudioPage() {
  const { data: user, isLoading: isUserLoading } = useSWR<ApiUser>(
    '/api/user',
    fetcher
  )
  const copyToClipboard = useCopy()
  const searchParams = useSearchParams()
  const stageRefs = useRef<Record<number, Konva.Stage | null>>({})

  const [script, setScript] = useState('')
  const [format, setFormat] = useState<StoryboardFormat>('vertical')
  const [durationSeconds, setDurationSeconds] = useState<string>('')
  const [result, setResult] = useState<StoryboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copyIndicator, setCopyIndicator] = useState<string | null>(null)
  const [sceneStyles, setSceneStyles] = useState<Record<number, SceneStyle>>({})
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null)
  const [isSavingDesign, setIsSavingDesign] = useState(false)
  const [designSaveMessage, setDesignSaveMessage] = useState<string | null>(
    null
  )
  const [designSaveError, setDesignSaveError] = useState<string | null>(null)

  const isPro = user?.plan === 'pro'
  const canvaConnected = Boolean(user?.canvaConnected)

  useEffect(() => {
    const prefillScript = searchParams?.get('script')
    if (prefillScript) {
      setScript(prefillScript)
    }
    const prefillFormat = searchParams?.get('format')
    if (
      prefillFormat &&
      ['vertical', 'square', 'widescreen'].includes(prefillFormat)
    ) {
      setFormat(prefillFormat as StoryboardFormat)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isPro || !result) {
      if (!result) {
        setSceneStyles({})
      }
      return
    }
    setSceneStyles((prev) => {
      const next: Record<number, SceneStyle> = {}
      result.scenes.forEach((scene, idx) => {
        const fallbackTheme =
          DEFAULT_THEME_SEQUENCE[idx % DEFAULT_THEME_SEQUENCE.length]
        next[scene.index] = {
          themeKey: prev[scene.index]?.themeKey ?? fallbackTheme,
          overlay: prev[scene.index]?.overlay ?? scene.textOverlay ?? '',
          voiceover: prev[scene.index]?.voiceover ?? scene.voiceover,
          note: prev[scene.index]?.note ?? scene.note ?? '',
        }
      })
      return next
    })
  }, [isPro, result])

  useEffect(() => {
    setActiveDesignId(null)
    setDesignSaveMessage(null)
    setDesignSaveError(null)
  }, [result, canvaConnected])

  const canSubmit = useMemo(() => {
    return script.trim().length >= 60 && !isSubmitting
  }, [script, isSubmitting])

  const storyboardToDisplay = useMemo(() => {
    if (result) return result
    if (!isPro && !isUserLoading) return SAMPLE_STORYBOARD
    return null
  }, [result, isPro, isUserLoading])

  const handleConnectCanva = useCallback(() => {
    if (!isPro) return
    setDesignSaveMessage(null)
    setDesignSaveError(null)
    window.location.href =
      '/api/integrations/canva/authorize?return_to=/studio/storyboard'
  }, [isPro])

  const handleDesignIdChange = useCallback((designId: string | null) => {
    setActiveDesignId(designId)
    setDesignSaveMessage(null)
    setDesignSaveError(null)
  }, [])

  const handleSaveDesign = useCallback(async () => {
    if (!activeDesignId || !storyboardToDisplay) {
      setDesignSaveError('Generate a storyboard in Canva before saving.')
      return
    }

    try {
      setIsSavingDesign(true)
      setDesignSaveError(null)
      setDesignSaveMessage(null)

      const response = await fetch('/api/video/storyboard/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: activeDesignId,
          format,
          storyboardInput: storyboardToDisplay,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message ?? 'Unable to save Canva design')
      }

      setDesignSaveMessage('Design saved to Studio 24.')
    } catch (err) {
      console.error('Failed to save Canva design', err)
      setDesignSaveError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving. Please try again.'
      )
    } finally {
      setIsSavingDesign(false)
    }
  }, [activeDesignId, storyboardToDisplay, format])

  const handleCopy = async (content: string, key: string) => {
    const ok = await copyToClipboard(content)
    if (ok) {
      setCopyIndicator(key)
      setTimeout(() => setCopyIndicator(null), 1500)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isPro || !canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/video/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          format,
          durationSeconds: durationSeconds
            ? Number.parseInt(durationSeconds, 10)
            : undefined,
        }),
      })

      const data: StoryboardApiResponse = await response.json()

      if (!data.success) {
        setError(data.error.message)
        if (data.error.preview) {
          setResult(data.error.preview)
        }
        return
      }

      setResult(data.data)
    } catch (err) {
      console.error(err)
      setError('We hit a snag while generating that storyboard. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyStoryboardJson = async () => {
    if (!storyboardToDisplay) return
    const ok = await copyToClipboard(
      JSON.stringify(storyboardToDisplay, null, 2)
    )
    if (ok) {
      setCopyIndicator('json')
      setTimeout(() => setCopyIndicator(null), 1500)
    }
  }

  const updateSceneStyle = (
    sceneIndex: number,
    field: keyof SceneStyle,
    value: string | ThemeKey
  ) => {
    setSceneStyles((prev) => {
      const current =
        prev[sceneIndex] ??
        ({
          themeKey:
            DEFAULT_THEME_SEQUENCE[
              (sceneIndex - 1) % DEFAULT_THEME_SEQUENCE.length
            ],
          overlay: '',
          voiceover: '',
          note: '',
        } as SceneStyle)
      return {
        ...prev,
        [sceneIndex]: {
          ...current,
          [field]: value,
        },
      }
    })
  }

  const handleExportScene = async (sceneIndex: number, type: 'png' | 'svg') => {
    const stage = stageRefs.current[sceneIndex]
    if (!stage) return

    const container = stage.container()
    try {
      if (type === 'png') {
        const dataUrl = await toPng(container, {
          pixelRatio: 2,
          cacheBust: true,
        })
        const link = document.createElement('a')
        link.download = `storyboard-scene-${sceneIndex}.png`
        link.href = dataUrl
        link.click()
      } else {
        const svgString = await toSvg(container, {
          pixelRatio: 2,
          cacheBust: true,
        })
        const blob = new Blob([svgString], {
          type: 'image/svg+xml;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `storyboard-scene-${sceneIndex}.svg`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (exportError) {
      console.error('Failed to export storyboard scene', exportError)
    }
  }

  return (
    <div className='bg-gray-50 flex-1'>
      <section className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10'>
        <Card className='border border-gray-200 bg-white/80 backdrop-blur shadow-sm'>
          <CardContent className='flex flex-col gap-6 py-8 sm:py-10'>
            <div className='flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-purple-600'>
              <span className='inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1'>
                <LayoutDashboard className='h-3.5 w-3.5' />
                Storyboard Studio
              </span>
              <span className='inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1 text-white'>
                <PenLine className='h-3.5 w-3.5' />
                Premium visual briefing
              </span>
            </div>
            <div className='space-y-4'>
              <h1 className='text-3xl font-semibold text-gray-900 sm:text-4xl'>
                Turn transcripts into Canva-ready storyboards
              </h1>
              <p className='text-base text-gray-600 sm:text-lg leading-relaxed max-w-3xl'>
                Studio&nbsp;24 transforms your script into a scene-by-scene
                brief with visuals, overlays, voiceover cues, and production
                notes—ready for editors to drop into Canva or their NLE of
                choice.
              </p>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  icon: <Wand2 className='h-4 w-4' />,
                  title: 'Structured scenes',
                  body: 'Visual, overlay, voiceover, and director notes for every beat.',
                },
                {
                  icon: <BookmarkPlus className='h-4 w-4' />,
                  title: 'Canva handoff',
                  body: 'Template slugs per aspect ratio so designers can launch instantly.',
                },
                {
                  icon: <ArrowRight className='h-4 w-4' />,
                  title: 'Multi-platform ready',
                  body: 'Build vertical, square, or widescreen storyboards in one workflow.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className='rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-xs'
                >
                  <div className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
                    {item.icon}
                    {item.title}
                  </div>
                  <p className='mt-2 text-sm text-gray-600 leading-relaxed'>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,0.95fr)] items-start'>
          <div className='space-y-6'>
            <Card className='border border-gray-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-xl font-semibold text-gray-900'>
                  {isPro ? 'Build your storyboard' : 'Storyboard preview'}
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-8'>
                {isPro ? (
                  <form className='space-y-8' onSubmit={handleSubmit}>
                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'>
                      <header className='flex items-start gap-3'>
                        <span className='mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-xs font-semibold text-white'>
                          1
                        </span>
                        <div>
                          <p className='text-sm font-semibold text-gray-900'>
                            Provide your script
                          </p>
                          <p className='mt-1 text-xs text-gray-500 leading-relaxed'>
                            Paste the cleaned transcript or short-form script
                            you want to storyboard. Remove timestamps and filler
                            to keep scenes tight.
                          </p>
                        </div>
                      </header>
                      <textarea
                        required
                        className={textareaStyles}
                        value={script}
                        onChange={(event) => setScript(event.target.value)}
                        placeholder='Paste the script or transcript excerpt here...'
                      />
                      <p className='text-xs text-gray-400'>
                        Tip: focus on the segment you want to storyboard (60–120
                        seconds works best).
                      </p>
                    </section>

                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'>
                      <header className='flex items-start gap-3'>
                        <span className='mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-xs font-semibold text-white'>
                          2
                        </span>
                        <div>
                          <p className='text-sm font-semibold text-gray-900'>
                            Choose format & pacing
                          </p>
                          <p className='mt-1 text-xs text-gray-500 leading-relaxed'>
                            The storyboard adapts scene durations and Canva
                            template slugs to match your chosen aspect ratio.
                          </p>
                        </div>
                      </header>
                      <div className='grid gap-2 sm:grid-cols-3'>
                        {formatOptions.map((option) => {
                          const isActive = format === option.value
                          return (
                            <button
                              key={option.value}
                              type='button'
                              onClick={() => setFormat(option.value)}
                              className={cn(
                                'rounded-lg border border-gray-200 bg-white px-3 py-3 text-left text-sm transition hover:border-gray-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300',
                                isActive &&
                                  'border-purple-500 bg-purple-500/10 text-purple-800 shadow-sm'
                              )}
                            >
                              <div className='font-medium'>{option.label}</div>
                              <p className='mt-1 text-xs text-gray-500'>
                                {option.description}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                      <div className='grid gap-3 sm:grid-cols-[minmax(0,0.6fr),minmax(0,0.4fr)]'>
                        <div className='space-y-2'>
                          <Label htmlFor='durationSeconds'>
                            Target duration (optional)
                          </Label>
                          <Input
                            id='durationSeconds'
                            type='number'
                            min={20}
                            max={300}
                            placeholder='e.g. 90'
                            value={durationSeconds}
                            onChange={(event) =>
                              setDurationSeconds(event.target.value)
                            }
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label>Summary</Label>
                          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600'>
                            {formatDurationLabel(
                              durationSeconds
                                ? Number(durationSeconds)
                                : undefined
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {error && (
                      <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700'>
                        {error}
                      </div>
                    )}

                    <div className='flex flex-wrap items-center gap-3'>
                      <Button
                        type='submit'
                        disabled={!canSubmit}
                        className='rounded-full px-6'
                      >
                        {isSubmitting ? (
                          <span className='flex items-center gap-2'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Generating storyboard…
                          </span>
                        ) : (
                          <span className='flex items-center gap-2'>
                            Generate storyboard
                            <ArrowRight className='h-4 w-4' />
                          </span>
                        )}
                      </Button>
                      <p className='text-xs text-gray-500'>
                        You can re-run the storyboard anytime—Studio&nbsp;24
                        keeps your usage unlimited on Pro.
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className='space-y-5 text-sm text-gray-600 leading-relaxed'>
                    <p>
                      Storyboard Studio is a Premium workflow. Drop in a script
                      and we’ll generate Canva-ready scenes with visual
                      direction, overlays, voiceover cues, and production notes.
                    </p>
                    <ul className='space-y-3'>
                      <li className='flex items-start gap-3'>
                        <Wand2 className='mt-1 h-4 w-4 text-purple-500' />
                        <span>
                          Structured cards for every scene—including on-screen
                          text and director notes.
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <BookmarkPlus className='mt-1 h-4 w-4 text-purple-500' />
                        <span>
                          Canva template slugs per aspect ratio so editors can
                          launch instantly.
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <ArrowRight className='mt-1 h-4 w-4 text-purple-500' />
                        <span>
                          Premium users can deep-link from Video Repurpose
                          results to auto-fill scripts.
                        </span>
                      </li>
                    </ul>
                    <Button asChild className='rounded-full'>
                      <Link href='/pricing'>
                        View Premium plans
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {isPro && (
              <Card className='border border-orange-200 bg-orange-50 shadow-none'>
                <CardContent className='py-5'>
                  <div className='flex flex-col gap-3 text-sm text-orange-800'>
                    <div className='font-semibold uppercase tracking-wide text-xs'>
                      QA checklist
                    </div>
                    <ul className='space-y-2'>
                      <li>
                        ✓ Confirm voiceover pacing matches the edit timeline.
                      </li>
                      <li>
                        ✓ Align overlays with safe areas for the chosen format
                        (vertical / square / widescreen).
                      </li>
                      <li>
                        ✓ Adjust production notes with platform-specific motion
                        / caption requirements.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className='border border-gray-200 shadow-sm'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <CardTitle className='text-xl font-semibold text-gray-900'>
                {isPro ? 'Storyboard output' : 'Sample storyboard'}
              </CardTitle>
              {storyboardToDisplay && (
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={copyStoryboardJson}
                  >
                    {copyIndicator === 'json' ? (
                      <>
                        <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                        Copied JSON
                      </>
                    ) : (
                      <>
                        <Copy className='mr-2 h-4 w-4' />
                        Copy JSON
                      </>
                    )}
                  </Button>
                  {isPro &&
                    (canvaConnected ? (
                      <span className='inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
                        Canva connected
                      </span>
                    ) : (
                      <Button
                        variant='default'
                        size='sm'
                        className='rounded-full'
                        onClick={handleConnectCanva}
                      >
                        Connect Canva
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </Button>
                    ))}
                </div>
              )}
            </CardHeader>
            <CardContent className='space-y-8'>
              {!storyboardToDisplay ? (
                <div className='text-sm text-gray-500'>
                  {isPro
                    ? 'Your storyboard graphics will appear here after you generate a storyboard.'
                    : 'Here’s a sample of the scene graphics Premium teams can generate with Storyboard Studio.'}
                </div>
              ) : (
                <div className='space-y-8'>
                  {storyboardToDisplay.productionNotes && (
                    <section className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-xs'>
                      <header className='flex items-center justify-between'>
                        <h2 className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Production notes
                        </h2>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='rounded-full px-3 text-gray-600 hover:text-gray-900'
                          onClick={() =>
                            handleCopy(
                              String(storyboardToDisplay.productionNotes),
                              'production'
                            )
                          }
                        >
                          {copyIndicator === 'production' ? (
                            <>
                              <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className='mr-2 h-4 w-4' />
                              Copy notes
                            </>
                          )}
                        </Button>
                      </header>
                      <p className='mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line'>
                        {storyboardToDisplay.productionNotes}
                      </p>
                    </section>
                  )}

                  {isPro && storyboardToDisplay && (
                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-xs'>
                      <header className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-semibold text-gray-900'>
                            Canva designer
                          </p>
                          <p className='text-xs text-gray-500'>
                            Edit this storyboard visually inside Canva and save
                            the design back to Studio&nbsp;24.
                          </p>
                        </div>
                      </header>
                      {canvaConnected ? (
                        <div className='space-y-4'>
                          <CanvaEmbed
                            templateUrl={CANVA_TEMPLATE_URLS[format]}
                            format={format}
                            onDesignId={handleDesignIdChange}
                          />
                          <div className='flex flex-wrap items-center gap-3'>
                            <Button
                              onClick={handleSaveDesign}
                              disabled={!activeDesignId || isSavingDesign}
                              className='rounded-full'
                            >
                              {isSavingDesign ? (
                                <span className='flex items-center gap-2'>
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                  Saving…
                                </span>
                              ) : (
                                <span className='flex items-center gap-2'>
                                  Save design
                                  <ArrowRight className='h-4 w-4' />
                                </span>
                              )}
                            </Button>
                            {!activeDesignId && (
                              <span className='text-xs text-gray-500'>
                                Open the storyboard in Canva to generate a
                                design ID before saving.
                              </span>
                            )}
                            {designSaveMessage && (
                              <span className='text-xs font-medium text-emerald-600'>
                                {designSaveMessage}
                              </span>
                            )}
                            {designSaveError && (
                              <span className='text-xs text-red-600'>
                                {designSaveError}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col items-start gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600'>
                          <p>
                            Connect your Canva account to edit these scenes with
                            on-brand graphics and motion.
                          </p>
                          <Button
                            onClick={handleConnectCanva}
                            className='rounded-full'
                          >
                            Connect Canva
                            <ArrowRight className='ml-2 h-4 w-4' />
                          </Button>
                        </div>
                      )}
                    </section>
                  )}

                  <section className='space-y-6'>
                    {storyboardToDisplay.scenes.map((scene, idx) => {
                      const defaultTheme =
                        DEFAULT_THEME_SEQUENCE[
                          idx % DEFAULT_THEME_SEQUENCE.length
                        ]
                      const sceneStyle = sceneStyles[scene.index] ?? {
                        themeKey: defaultTheme,
                        overlay: scene.textOverlay ?? '',
                        voiceover: scene.voiceover,
                        note: scene.note ?? '',
                      }

                      const theme = THEME_PRESETS[sceneStyle.themeKey]
                      const canvasSize = CANVAS_SIZES[format]
                      const overlayText = isPro
                        ? sceneStyle.overlay
                        : scene.textOverlay ?? ''
                      const voiceoverText = isPro
                        ? sceneStyle.voiceover
                        : scene.voiceover
                      const noteText = isPro
                        ? sceneStyle.note
                        : scene.note ?? ''
                      const overlayForCanvas = overlayText.trim().length
                        ? overlayText
                        : undefined
                      const noteForCanvas = noteText.trim().length
                        ? noteText
                        : undefined

                      return (
                        <div
                          key={scene.index}
                          className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'
                        >
                          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6'>
                            <div className='flex flex-col items-center gap-3'>
                              <div
                                className='overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-black/5'
                                style={{
                                  width: canvasSize.width,
                                  height: canvasSize.height,
                                }}
                              >
                                <StoryboardCanvas
                                  ref={(node) => {
                                    stageRefs.current[scene.index] = node
                                  }}
                                  size={canvasSize}
                                  card={{
                                    index: scene.index,
                                    time: scene.time,
                                    headline: scene.visual,
                                    overlay: overlayForCanvas,
                                    voiceover: voiceoverText,
                                    note: noteForCanvas,
                                  }}
                                  theme={theme}
                                />
                              </div>
                              {isPro && (
                                <div className='flex flex-wrap items-center gap-2'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='rounded-full'
                                    onClick={() =>
                                      handleExportScene(scene.index, 'png')
                                    }
                                  >
                                    Download PNG
                                  </Button>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='rounded-full'
                                    onClick={() =>
                                      handleExportScene(scene.index, 'svg')
                                    }
                                  >
                                    Download SVG
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='rounded-full px-3 text-gray-600 hover:text-gray-900'
                                    onClick={() =>
                                      handleCopy(
                                        JSON.stringify(scene, null, 2),
                                        `scene-${scene.index}-json`
                                      )
                                    }
                                  >
                                    {copyIndicator ===
                                    `scene-${scene.index}-json` ? (
                                      <>
                                        <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                                        Copied JSON
                                      </>
                                    ) : (
                                      <>
                                        <Copy className='mr-2 h-4 w-4' />
                                        Copy JSON
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className='flex-1 space-y-5'>
                              <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-600'>
                                <span className='inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1'>
                                  Scene {scene.index}
                                </span>
                                <span className='inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-600'>
                                  {scene.time}
                                </span>
                              </div>
                              <p className='text-base font-semibold text-gray-900'>
                                {scene.visual}
                              </p>

                              {isPro && (
                                <div className='flex flex-wrap items-center gap-3'>
                                  <span className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                                    Theme
                                  </span>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    {THEME_CHOICES.map((choice) => (
                                      <button
                                        key={choice.key}
                                        type='button'
                                        onClick={() =>
                                          updateSceneStyle(
                                            scene.index,
                                            'themeKey',
                                            choice.key
                                          )
                                        }
                                        className={cn(
                                          'rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-purple-400 hover:text-purple-600',
                                          sceneStyle.themeKey === choice.key &&
                                            'border-purple-500 bg-purple-500/10 text-purple-700'
                                        )}
                                      >
                                        {choice.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className='grid gap-4 lg:grid-cols-3'>
                                <div>
                                  <Label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                                    Voiceover
                                  </Label>
                                  {isPro ? (
                                    <textarea
                                      className='mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200'
                                      rows={5}
                                      value={voiceoverText}
                                      onChange={(event) =>
                                        updateSceneStyle(
                                          scene.index,
                                          'voiceover',
                                          event.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    <p className='mt-2 text-sm text-gray-700 leading-relaxed'>
                                      {voiceoverText}
                                    </p>
                                  )}
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='mt-2 rounded-full px-3 text-gray-600 hover:text-gray-900'
                                    onClick={() =>
                                      handleCopy(
                                        voiceoverText,
                                        `voiceover-${scene.index}`
                                      )
                                    }
                                  >
                                    {copyIndicator ===
                                    `voiceover-${scene.index}` ? (
                                      <>
                                        <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                                        Copied VO
                                      </>
                                    ) : (
                                      <>
                                        <Copy className='mr-2 h-4 w-4' />
                                        Copy VO
                                      </>
                                    )}
                                  </Button>
                                </div>

                                <div>
                                  <Label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                                    Overlay / on-screen text
                                  </Label>
                                  {isPro ? (
                                    <textarea
                                      className='mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200'
                                      rows={5}
                                      value={overlayText}
                                      onChange={(event) =>
                                        updateSceneStyle(
                                          scene.index,
                                          'overlay',
                                          event.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    <p className='mt-2 text-sm text-gray-700 leading-relaxed'>
                                      {overlayText ||
                                        'Add supporting CTA or key takeaway overlay here.'}
                                    </p>
                                  )}
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='mt-2 rounded-full px-3 text-gray-600 hover:text-gray-900'
                                    onClick={() =>
                                      handleCopy(
                                        overlayText ||
                                          'Add supporting CTA or key takeaway overlay here.',
                                        `overlay-${scene.index}`
                                      )
                                    }
                                  >
                                    {copyIndicator ===
                                    `overlay-${scene.index}` ? (
                                      <>
                                        <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className='mr-2 h-4 w-4' />
                                        Copy overlay
                                      </>
                                    )}
                                  </Button>
                                </div>

                                <div>
                                  <Label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                                    Director notes
                                  </Label>
                                  {isPro ? (
                                    <textarea
                                      className='mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200'
                                      rows={5}
                                      value={noteText}
                                      onChange={(event) =>
                                        updateSceneStyle(
                                          scene.index,
                                          'note',
                                          event.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    <p className='mt-2 text-sm text-gray-700 leading-relaxed'>
                                      {noteText ||
                                        'Specify camera movement, asset callouts, or motion guidance.'}
                                    </p>
                                  )}
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='mt-2 rounded-full px-3 text-gray-600 hover:text-gray-900'
                                    onClick={() =>
                                      handleCopy(
                                        noteText ||
                                          'Specify camera movement, asset callouts, or motion guidance.',
                                        `note-${scene.index}`
                                      )
                                    }
                                  >
                                    {copyIndicator === `note-${scene.index}` ? (
                                      <>
                                        <ClipboardCheck className='mr-2 h-4 w-4 text-emerald-600' />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className='mr-2 h-4 w-4' />
                                        Copy note
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </section>
                </div>
              )}
            </CardContent>
            {isPro && storyboardToDisplay && (
              <CardFooter className='border-t border-gray-200 bg-gray-50 text-xs text-gray-500'>
                Storyboard created by Studio&nbsp;24. Share with editors or send
                directly to Canva to kick off motion design.
              </CardFooter>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
