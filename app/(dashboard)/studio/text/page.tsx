'use client'

import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import {
  Sparkles,
  Copy,
  BookmarkPlus,
  AlertCircle,
  Loader2,
  RefreshCcw,
} from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ApiUser = {
  id: number
  name: string | null
  email: string
  role: string
  plan: 'free' | 'pro'
  usage: {
    used: number
    limit: number | null
    remaining: number | null
  } | null
} | null

type ContentTypeOption = 'hook' | 'caption' | 'script' | 'outline'
type ToneOption =
  | 'bold'
  | 'friendly'
  | 'professional'
  | 'playful'
  | 'empathetic'

type Variant = {
  label: string
  platform: string
  text: string
  callToAction?: string
}

type UsageSummary = {
  limit: number | null
  remaining: number | null
}

type ApiSuccess = {
  success: true
  data: {
    variants: Variant[]
    guidance?: string
    usage: UsageSummary
  }
}

type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    limit?: number
  }
}

type ApiResponse = ApiSuccess | ApiFailure

type CurrentUser = ApiUser

const contentTypeOptions: { label: string; value: ContentTypeOption }[] = [
  { label: 'Hook', value: 'hook' },
  { label: 'Caption', value: 'caption' },
  { label: 'Script', value: 'script' },
  { label: 'Outline', value: 'outline' },
]

const toneOptions: { label: string; value: ToneOption }[] = [
  { label: 'Bold', value: 'bold' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Professional', value: 'professional' },
  { label: 'Playful', value: 'playful' },
  { label: 'Empathetic', value: 'empathetic' },
]

export default function TextStudioPage() {
  const { data: user } = useSWR<CurrentUser>('/api/user', fetcher)

  const [contentType, setContentType] = useState<ContentTypeOption>('hook')
  const [tone, setTone] = useState<ToneOption>('bold')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const [variants, setVariants] = useState<Variant[]>([])
  const [guidance, setGuidance] = useState<string | null>(null)
  const [usageOverride, setUsageOverride] = useState<UsageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isPro = user?.plan === 'pro'
  const usageSnapshot = usageOverride ?? user?.usage ?? null
  const planType = user?.plan ?? 'free'

  const usageHint = useMemo(() => {
    if (!usageSnapshot) {
      return planType === 'pro' ? 'Pro plan: unlimited generations.' : null
    }

    if (
      planType === 'free' &&
      usageSnapshot.limit !== null &&
      usageSnapshot.remaining !== null
    ) {
      return `Free plan: ${usageSnapshot.remaining} of ${usageSnapshot.limit} generations remaining today.`
    }

    return planType === 'pro' ? 'Pro plan: unlimited generations.' : null
  }, [planType, usageSnapshot])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (copyError) {
      console.error('Failed to copy text', copyError)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!topic.trim() || !audience.trim()) {
      setError('Topic and audience are required.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/text/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          tone,
          topic,
          audience,
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      })

      const data: ApiResponse = await response.json()

      if (!data.success) {
        setVariants([])
        setGuidance(null)
        setUsageOverride(null)
        setError(data.error.message)
        return
      }

      setVariants(data.data.variants)
      setGuidance(data.data.guidance ?? null)
      setUsageOverride(data.data.usage)
    } catch (requestError) {
      console.error(requestError)
      setError('We ran into an unexpected error. Please try again in a moment.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetResults = () => {
    setVariants([])
    setGuidance(null)
    setError(null)
    setUsageOverride(null)
  }

  return (
    <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8'>
      <section>
        <div className='flex items-start gap-3'>
          <Sparkles className='h-10 w-10 text-orange-500 shrink-0' />
          <div>
            <h1 className='text-3xl font-semibold text-gray-900'>
              Text Studio
            </h1>
            <p className='mt-2 text-base text-gray-600'>
              Turn a single idea into channel-ready hooks, captions, and
              scripts. Gemini keeps tone, audience, and call-to-action aligned
              with Studio 24’s playbook.
            </p>
            {usageHint ? (
              <p className='mt-2 text-sm text-gray-500'>{usageHint}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Configure the prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-6' onSubmit={handleSubmit}>
              <div className='grid gap-6 md:grid-cols-2'>
                <div className='space-y-3'>
                  <Label className='text-sm font-medium text-gray-700'>
                    Content type
                  </Label>
                  <RadioGroup
                    value={contentType}
                    onValueChange={(value: ContentTypeOption) =>
                      setContentType(value)
                    }
                    className='grid grid-cols-2 gap-3'
                  >
                    {contentTypeOptions.map((option) => (
                      <Label
                        key={option.value}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition',
                          contentType === option.value
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value={option.value} />
                          {option.label}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className='space-y-3'>
                  <Label className='text-sm font-medium text-gray-700'>
                    Tone
                  </Label>
                  <RadioGroup
                    value={tone}
                    onValueChange={(value: ToneOption) => setTone(value)}
                    className='grid grid-cols-2 gap-3'
                  >
                    {toneOptions.map((option) => (
                      <Label
                        key={option.value}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition',
                          tone === option.value
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value={option.value} />
                          {option.label}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='topic'>Topic or angle</Label>
                  <Input
                    id='topic'
                    placeholder='Launch a premium AI studio in 24 hours'
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='audience'>Audience</Label>
                  <Input
                    id='audience'
                    placeholder='Growth marketers running paid social'
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='notes'>Brand constraints or notes</Label>
                <textarea
                  id='notes'
                  rows={3}
                  className='block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
                  placeholder='Mention 10 free generations, emphasise agency-grade polish, keep copy under 120 characters.'
                  value={additionalNotes}
                  onChange={(event) => setAdditionalNotes(event.target.value)}
                />
              </div>

              {error ? (
                <div className='flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                  <AlertCircle className='mt-0.5 h-4 w-4' />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className='flex flex-wrap items-center gap-3'>
                <Button
                  type='submit'
                  className='rounded-full px-6'
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Generating
                    </>
                  ) : (
                    'Generate content'
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={resetResults}
                  disabled={isLoading && variants.length === 0}
                >
                  <RefreshCcw className='mr-2 h-4 w-4' />
                  Reset
                </Button>
                {!isPro ? (
                  <Button
                    type='button'
                    variant='outline'
                    className='rounded-full border-dashed'
                    onClick={() => (window.location.href = '/pricing')}
                  >
                    Upgrade for saved projects
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {variants.length > 0 ? (
        <section className='space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-2xl font-semibold text-gray-900'>
                Generated variants
              </h2>
              <p className='text-sm text-gray-500'>
                Copy the best-performing option or remix for other formats.
              </p>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {variants.map((variant) => (
              <Card key={`${variant.platform}-${variant.label}`}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base font-semibold text-gray-900'>
                    {variant.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <span className='inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600'>
                    {variant.platform}
                  </span>
                  <p className='text-sm leading-relaxed text-gray-800'>
                    {variant.text}
                  </p>
                  {variant.callToAction ? (
                    <p className='text-xs text-gray-500'>
                      CTA: {variant.callToAction}
                    </p>
                  ) : null}
                </CardContent>
                <CardFooter className='flex justify-between gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={() => handleCopy(variant.text)}
                  >
                    <Copy className='mr-2 h-4 w-4' />
                    Copy
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className={cn('rounded-full', !isPro && 'border-dashed')}
                    onClick={() =>
                      !isPro ? (window.location.href = '/pricing') : null
                    }
                    disabled={!isPro}
                  >
                    <BookmarkPlus className='mr-2 h-4 w-4' />
                    {isPro ? 'Save to project' : 'Upgrade to save'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {guidance ? (
            <Card className='border-dashed border-gray-200 bg-gray-50'>
              <CardHeader>
                <CardTitle className='text-base font-semibold text-gray-900'>
                  Studio guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-700'>{guidance}</p>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
