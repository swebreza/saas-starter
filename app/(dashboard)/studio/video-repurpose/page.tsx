'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Clapperboard,
  Copy,
  Film,
  Loader2,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
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
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ApiUser = {
  id: number
  name: string | null
  email: string
  role: string
  plan: 'free' | 'pro'
} | null

type ToneOption =
  | 'bold'
  | 'friendly'
  | 'professional'
  | 'playful'
  | 'empathetic'

type PlatformOption =
  | 'tiktok'
  | 'instagram'
  | 'youtube_shorts'
  | 'linkedin'
  | 'x'
  | 'facebook'
  | 'threads'

type RepurposeBundle = {
  hooks: string[]
  shortScripts: Array<{
    headline: string
    script: string
    estimatedRuntimeSeconds: number
  }>
  captions: Array<{
    platform: PlatformOption | string
    copy: string
    hashtags: string[]
  }>
  summary: string
}

type ApiSuccess = {
  success: true
  data: RepurposeBundle & {
    usage: {
      limit: number | null
      remaining: number | null
    }
  }
}

type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    preview?: RepurposeBundle
  }
}

type ApiResponse = ApiSuccess | ApiFailure

const platformOptions: { label: string; value: PlatformOption }[] = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram Reels', value: 'instagram' },
  { label: 'YouTube Shorts', value: 'youtube_shorts' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'X (Twitter)', value: 'x' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Threads', value: 'threads' },
]

const toneOptions: { label: string; value: ToneOption; description: string }[] =
  [
    {
      label: 'Bold',
      value: 'bold',
      description: 'High-energy and direct. Great for short-form hooks.',
    },
    {
      label: 'Friendly',
      value: 'friendly',
      description: 'Conversational tone suited for community-driven clips.',
    },
    {
      label: 'Professional',
      value: 'professional',
      description: 'Authority-driven point of view ideal for LinkedIn.',
    },
    {
      label: 'Playful',
      value: 'playful',
      description: 'Witty tone that keeps retention up on Reels & TikTok.',
    },
    {
      label: 'Empathetic',
      value: 'empathetic',
      description: 'Supportive tone perfect for coaching and wellness brands.',
    },
  ]

const samplePreview: RepurposeBundle = {
  hooks: [
    'This founder turned a 40-minute interview into a month of shorts—here’s the playbook.',
    'Stop rewriting captions from scratch. Repurpose once, publish everywhere.',
    'The fastest way to turn podcasts into scroll-stopping clips? Studio 24’s Video Repurpose Studio.',
  ],
  shortScripts: [
    {
      headline: 'Repurpose Framework',
      script:
        'Open with an over-the-shoulder shot of an editor scrubbing a timeline. “We used Studio 24 to slice a 45-minute webinar into 12 shorts in under ten minutes.” Overlay the three steps with kinetic text and close on product UI.',
      estimatedRuntimeSeconds: 36,
    },
    {
      headline: 'Pain Point Hook',
      script:
        'Start with stat overlay: “92% of marketers reuse long-form content—but most still rewrite everything.” Voiceover: “Drop your transcript into Studio 24, choose tone + channels, and it ships hooks, scripts, and captions instantly.”',
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
      copy: 'We turned a founder AMA into a two-week short-form calendar in one session. Studio 24 keeps tone + CTA consistent across every platform.',
      hashtags: ['#b2bmarketing', '#creatoreconomy'],
    },
  ],
  summary:
    'Studio 24 ingests long-form transcripts and returns hooks, short scripts, captions, and an executive summary tailored to each platform.',
}

const textareaStyles =
  'border border-gray-200 bg-white rounded-lg px-3 py-3 text-sm leading-relaxed text-gray-900 shadow-xs focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-200 transition-colors min-h-[200px] resize-y'

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

function FormStepHeading({
  step,
  title,
  description,
}: {
  step: number | string
  title: string
  description?: string
}) {
  return (
    <header className='flex items-start gap-3'>
      <span className='mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white'>
        {step}
      </span>
      <div>
        <p className='text-sm font-semibold text-gray-900'>{title}</p>
        {description && (
          <p className='mt-1 text-xs text-gray-500 leading-relaxed'>
            {description}
          </p>
        )}
      </div>
    </header>
  )
}

function PanelHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header className='flex items-center justify-between'>
      <h2 className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
        {title}
      </h2>
      {subtitle ? (
        <span className='text-xs text-gray-400'>{subtitle}</span>
      ) : null}
    </header>
  )
}

export default function VideoRepurposeStudioPage() {
  const { data: user, isLoading: isUserLoading } = useSWR<ApiUser>(
    '/api/user',
    fetcher
  )
  const copyToClipboard = useCopy()

  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [callToAction, setCallToAction] = useState('')
  const [tone, setTone] = useState<ToneOption>('bold')
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformOption[]>([
    'tiktok',
    'instagram',
    'youtube_shorts',
  ])

  const [bundle, setBundle] = useState<RepurposeBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copyIndicator, setCopyIndicator] = useState<string | null>(null)

  const isPro = user?.plan === 'pro'

  const canSubmit = useMemo(() => {
    return (
      transcript.trim().length > 0 &&
      selectedPlatforms.length > 0 &&
      !isSubmitting
    )
  }, [transcript, selectedPlatforms.length, isSubmitting])

  const handleTogglePlatform = (value: PlatformOption) => {
    setSelectedPlatforms((prev) => {
      const exists = prev.includes(value)
      if (exists) {
        return prev.filter((platform) => platform !== value)
      }
      if (prev.length >= 4) {
        return prev
      }
      return [...prev, value]
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isPro || !canSubmit) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/video/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          tone,
          targetPlatforms: selectedPlatforms,
          callToAction,
          title,
          sourceUrl: sourceUrl.trim() || undefined,
        }),
      })

      const data: ApiResponse = await response.json()

      if (!data.success) {
        setError(data.error.message)
        setBundle(data.error.preview ?? null)
        return
      }

      setBundle(data.data)
    } catch (err) {
      console.error(err)
      setError('We hit a snag while repurposing that transcript. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async (content: string, slug: string) => {
    const ok = await copyToClipboard(content)
    if (ok) {
      setCopyIndicator(slug)
      setTimeout(() => setCopyIndicator(null), 1500)
    }
  }

  const platformsHint = useMemo(() => {
    if (!selectedPlatforms.length) {
      return 'Select at least one platform to tailor hooks and captions.'
    }
    if (selectedPlatforms.length === 4) {
      return 'Max four platforms per batch to keep prompts focused.'
    }
    return null
  }, [selectedPlatforms])

  const renderCopyButton = (payload: string, slug: string) => (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={() => handleCopy(payload, slug)}
      className='text-gray-500 hover:text-gray-900'
      aria-label='Copy to clipboard'
    >
      {copyIndicator === slug ? (
        <ClipboardCheck className='h-4 w-4 text-emerald-600' />
      ) : (
        <Copy className='h-4 w-4' />
      )}
    </Button>
  )

  const resultToDisplay = useMemo(() => {
    if (bundle) {
      return bundle
    }
    if (!isPro && !isUserLoading) {
      return samplePreview
    }
    return null
  }, [bundle, isPro, isUserLoading])

  return (
    <div className='bg-gray-50 flex-1'>
      <section className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10'>
        <Card className='border border-gray-200 bg-white/80 backdrop-blur shadow-sm'>
          <CardContent className='flex flex-col gap-5 py-8 sm:py-10'>
            <div className='flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-orange-600'>
              <span className='inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1'>
                <Sparkles className='h-3.5 w-3.5' />
                Premium workflow
              </span>
              <span className='inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1 text-white'>
                <Clapperboard className='h-3.5 w-3.5' />
                Social repurpose in minutes
              </span>
            </div>
            <div className='space-y-4'>
              <h1 className='text-3xl font-semibold text-gray-900 sm:text-4xl'>
                Video Repurpose Studio
              </h1>
              <p className='text-base text-gray-600 sm:text-lg leading-relaxed max-w-3xl'>
                Paste a transcript, choose tone and channels, and Studio&nbsp;24
                returns the short-form bundle—hooks, scripts, captions, and an
                executive summary—ready to launch across platforms.
              </p>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  title: 'Upload context',
                  body: 'Use cleaned transcripts or YouTube links with speaker cues.',
                },
                {
                  title: 'Align tone & channels',
                  body: 'Select tone, CTA, and up to four target platforms.',
                },
                {
                  title: 'Publish everywhere',
                  body: 'Copy hooks, scripts, captions, and the executive summary instantly.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className='rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-xs'
                >
                  <p className='text-sm font-semibold text-gray-900'>
                    {item.title}
                  </p>
                  <p className='mt-2 text-sm text-gray-600 leading-relaxed'>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
              {isPro ? (
                <span className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200'>
                  <CheckCircle2 className='h-4 w-4' />
                  Pro plan · unlimited repurpose runs
                </span>
              ) : (
                <span className='inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-white'>
                  <Film className='h-4 w-4' />
                  Upgrade to unlock the workflow
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)] items-start'>
          <div className='space-y-6'>
            <Card className='border border-gray-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-xl font-semibold text-gray-900'>
                  {isPro
                    ? 'Configure your repurpose request'
                    : 'Preview the workflow'}
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-8'>
                {isPro ? (
                  <form className='space-y-8' onSubmit={handleSubmit}>
                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'>
                      <FormStepHeading
                        step={1}
                        title='Transcript intake'
                        description='Upload cleaned text so Gemini can identify moments worth repurposing. Remove timestamps and filler chatter ahead of time.'
                      />
                      <textarea
                        id='transcript'
                        required
                        className={textareaStyles}
                        value={transcript}
                        onChange={(event) => setTranscript(event.target.value)}
                        placeholder='Paste the cleaned transcript here. Include speaker cues only if they help the edit.'
                      />
                      <p className='text-xs text-gray-400'>
                        Supports up to ~16,000 characters per run.
                      </p>
                    </section>

                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'>
                      <FormStepHeading
                        step={2}
                        title='Context & calls to action'
                        description='Optional fields that help Studio 24 frame the final scripts and caption CTAs.'
                      />
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label htmlFor='title'>Video title</Label>
                          <Input
                            id='title'
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder='Ex: Scaling a zero-to-one content engine'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='sourceUrl'>Source URL</Label>
                          <Input
                            id='sourceUrl'
                            value={sourceUrl}
                            onChange={(event) =>
                              setSourceUrl(event.target.value)
                            }
                            placeholder='https://youtube.com/watch?v=…'
                          />
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor='callToAction'>Preferred CTA</Label>
                        <Input
                          id='callToAction'
                          value={callToAction}
                          onChange={(event) =>
                            setCallToAction(event.target.value)
                          }
                          placeholder='Ex: Subscribe for weekly growth breakdowns'
                        />
                      </div>
                    </section>

                    <section className='space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-xs'>
                      <FormStepHeading
                        step={3}
                        title='Tone & distribution'
                        description='Select a tone and the channels you want to ship to this week.'
                      />
                      <div className='grid gap-2 sm:grid-cols-2'>
                        {toneOptions.map((option) => {
                          const isActive = tone === option.value
                          return (
                            <button
                              key={option.value}
                              type='button'
                              onClick={() => setTone(option.value)}
                              className={cn(
                                'rounded-lg border border-gray-200 bg-white px-3 py-3 text-left text-sm transition hover:border-gray-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
                                isActive &&
                                  'border-orange-500 bg-orange-500/10 text-orange-800 shadow-sm'
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

                      <div className='space-y-3'>
                        <p className='text-sm font-medium text-gray-700'>
                          Target platforms (max 4)
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          {platformOptions.map((platform) => {
                            const isSelected = selectedPlatforms.includes(
                              platform.value
                            )
                            return (
                              <button
                                type='button'
                                key={platform.value}
                                onClick={() =>
                                  handleTogglePlatform(platform.value)
                                }
                                className={cn(
                                  'rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
                                  isSelected &&
                                    'border-orange-500 bg-orange-500/10 text-orange-700'
                                )}
                              >
                                {platform.label}
                              </button>
                            )
                          })}
                        </div>
                        {platformsHint && (
                          <p className='text-xs text-gray-500'>
                            {platformsHint}
                          </p>
                        )}
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
                            Generating bundle…
                          </span>
                        ) : (
                          <span className='flex items-center gap-2'>
                            Generate bundle
                            <ArrowRight className='h-4 w-4' />
                          </span>
                        )}
                      </Button>
                      <p className='text-xs text-gray-500'>
                        Unlimited runs on the Pro plan—iterate on tone, CTA, or
                        distribution mix any time.
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className='space-y-5 text-sm text-gray-600 leading-relaxed'>
                    <p>
                      Video Repurpose Studio is built for Premium teams that
                      need to turn long-form recordings into publish-ready
                      short-form calendars without touching an editor.
                    </p>
                    <ul className='space-y-3'>
                      <li className='flex items-start gap-3'>
                        <Sparkles className='mt-1 h-4 w-4 text-orange-500' />
                        <span>
                          Upload cleaned transcripts or drop a YouTube link and
                          get platform-specific hooks, short scripts, and
                          caption packs in seconds.
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <Clock className='mt-1 h-4 w-4 text-orange-500' />
                        <span>
                          Outputs include estimated runtime so you can quickly
                          map clips to Shorts, Reels, or TikTok limits.
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <ArrowRight className='mt-1 h-4 w-4 text-orange-500' />
                        <span>
                          Send winning scripts directly into Storyboard Studio
                          (Phase 5) for Canva handoff.
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </CardContent>
              {!isPro && (
                <CardFooter className='justify-between items-center gap-3 bg-gray-50 border-t border-gray-200'>
                  <div className='text-sm text-gray-600'>
                    Upgrade to unlock unlimited repurpose runs and saved project
                    history.
                  </div>
                  <Button asChild className='rounded-full'>
                    <Link href='/pricing'>
                      View plans
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card className='border border-orange-200 bg-orange-50 shadow-none'>
              <CardContent className='py-5'>
                <div className='flex flex-col gap-3 text-sm text-orange-800'>
                  <div className='font-semibold uppercase tracking-wide text-xs'>
                    QA checklist
                  </div>
                  <ul className='space-y-2'>
                    <li>
                      ✓ Scan hooks for platform-specific compliance before
                      publishing.
                    </li>
                    <li>
                      ✓ Cross-check runtime estimates against your edit
                      timeline.
                    </li>
                    <li>✓ Align captions with campaign hashtags and voice.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-6'>
            <Card className='border border-gray-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-xl font-semibold text-gray-900'>
                  {isPro ? 'Repurpose bundle' : 'Sample output'}
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-8'>
                {!resultToDisplay ? (
                  <div className='text-sm text-gray-500'>
                    {isPro
                      ? 'Your hooks, scripts, captions, and summary will appear here after you run a repurpose request.'
                      : 'Here’s the kind of structured output Studio 24 ships to Premium teams.'}
                  </div>
                ) : (
                  <div className='space-y-8'>
                    <section className='rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-xs'>
                      <PanelHeader title='Executive summary' />
                      <p className='mt-3 text-sm leading-relaxed text-gray-700'>
                        {resultToDisplay.summary}
                      </p>
                      <div className='mt-4 flex justify-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() =>
                            handleCopy(resultToDisplay.summary, 'summary-copy')
                          }
                          className='rounded-full px-3 text-gray-600 hover:text-gray-900'
                        >
                          Copy summary
                        </Button>
                      </div>
                    </section>

                    <div className='grid gap-6 lg:grid-cols-2'>
                      <section className='rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-xs'>
                        <PanelHeader
                          title='Hooks'
                          subtitle={`${resultToDisplay.hooks.length} ideas`}
                        />
                        <ul className='mt-4 space-y-3'>
                          {resultToDisplay.hooks.map((hook, index) => (
                            <li
                              key={`hook-${index}`}
                              className='flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700'
                            >
                              <span>{hook}</span>
                              {renderCopyButton(hook, `hook-${index}`)}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className='rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-xs'>
                        <PanelHeader
                          title='Short-form scripts'
                          subtitle={`${resultToDisplay.shortScripts.length} variants`}
                        />
                        <div className='mt-4 space-y-3'>
                          {resultToDisplay.shortScripts.map((item, index) => (
                            <div
                              key={`script-${index}`}
                              className='rounded-lg border border-gray-200 px-3 py-3'
                            >
                              <div className='flex items-start justify-between gap-3'>
                                <div>
                                  <p className='text-sm font-semibold text-gray-900'>
                                    {item.headline}
                                  </p>
                                  <p className='mt-1 text-xs text-gray-500 inline-flex items-center gap-1'>
                                    <Clock className='h-3.5 w-3.5' />
                                    {item.estimatedRuntimeSeconds} sec
                                  </p>
                                </div>
                                {renderCopyButton(
                                  item.script,
                                  `script-${index}`
                                )}
                              </div>
                              <p className='mt-2 text-sm leading-relaxed text-gray-700'>
                                {item.script}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <section className='rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-xs'>
                      <PanelHeader
                        title='Caption pack'
                        subtitle={`${resultToDisplay.captions.length} platforms`}
                      />
                      <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                        {resultToDisplay.captions.map((caption, index) => {
                          const captionBody = `${caption.copy}${
                            caption.hashtags.length
                              ? `\n\n${caption.hashtags
                                  .map((tag) =>
                                    tag.startsWith('#') ? tag : `#${tag}`
                                  )
                                  .join(' ')}`
                              : ''
                          }`

                          return (
                            <div
                              key={`caption-${index}`}
                              className='flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3'
                            >
                              <div className='flex items-center justify-between gap-2'>
                                <span className='text-sm font-semibold text-gray-900 capitalize'>
                                  {caption.platform.replace('_', ' ')}
                                </span>
                                {renderCopyButton(
                                  captionBody,
                                  `caption-${index}`
                                )}
                              </div>
                              <p className='mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line'>
                                {caption.copy}
                              </p>
                              {caption.hashtags.length > 0 && (
                                <div className='mt-3 flex flex-wrap gap-1 text-xs text-gray-500'>
                                  {caption.hashtags.map((tag) => (
                                    <span
                                      key={`${caption.platform}-${tag}`}
                                      className='rounded-full bg-white px-2 py-1 shadow-xs'
                                    >
                                      {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </CardContent>
              {bundle && (
                <CardFooter className='border-t border-gray-200 bg-gray-50 text-xs text-gray-500'>
                  Document high-performing scripts so Storyboard Studio can pick
                  them up next.
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
