'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import useSWR from 'swr'
import {
  Sparkles,
  Clapperboard,
  LayoutDashboard,
  Film,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

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

type StudioCard = {
  key: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  status: 'live' | 'coming-soon'
  premium?: boolean
}

const studios: StudioCard[] = [
  {
    key: 'text',
    title: 'Text Studio',
    description:
      'Spin up hooks, captions, scripts, and outlines tuned to your brand voice in seconds.',
    href: '/studio/text',
    icon: Sparkles,
    status: 'live',
  },
  {
    key: 'video',
    title: 'Video Repurpose Studio',
    description:
      'Drop in a transcript or YouTube link and get shorts playbooks, teaser scripts, and caption packs.',
    href: '/studio/video-repurpose',
    icon: Clapperboard,
    status: 'live',
    premium: true,
  },
  {
    key: 'storyboard',
    title: 'Storyboard Studio',
    description:
      'Turn scripts into scene timelines with Canva handoffs so creative teams can export fast.',
    href: '/studio/storyboard',
    icon: LayoutDashboard,
    status: 'live',
    premium: true,
  },
  {
    key: 'auto-reels',
    title: 'Auto Reels Rendering',
    description:
      'Send long-form clips to our managed renderer for premium shorts with captions and motion graphics.',
    href: '/studio/auto-reels',
    icon: Film,
    status: 'live',
    premium: true,
  },
]

function StudioCardItem({
  studio,
  plan,
}: {
  studio: StudioCard
  plan: 'free' | 'pro'
}) {
  const Icon = studio.icon
  const isPremium = studio.premium === true
  const isLocked = isPremium && plan !== 'pro'
  const isLive = studio.status === 'live'
  const isComingSoon = studio.status === 'coming-soon'

  return (
    <Card className='h-full border border-gray-200 shadow-sm'>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Icon className='h-5 w-5 text-orange-500' />
            <CardTitle className='text-lg font-semibold text-gray-900'>
              {studio.title}
            </CardTitle>
          </div>
          <span className='rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600'>
            {isLive
              ? isPremium
                ? 'Premium'
                : 'Live'
              : isPremium
              ? 'Premium · Soon'
              : 'Coming soon'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-gray-600 leading-relaxed'>
          {studio.description}
        </p>
      </CardContent>
      <CardFooter>
        {isLive && !isLocked ? (
          <Button asChild className='rounded-full'>
            <Link href={studio.href}>
              Open studio
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        ) : isComingSoon ? (
          <Button
            variant='outline'
            className='rounded-full border-dashed'
            disabled
          >
            Coming soon
          </Button>
        ) : (
          <Button
            asChild
            variant='outline'
            className='rounded-full border-dashed'
          >
            <Link href='/pricing'>
              Upgrade to unlock
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: user } = useSWR<ApiUser>('/api/user', fetcher)
  const plan = user?.plan ?? 'free'
  const planLabel = plan === 'pro' ? 'Premium' : 'Free'
  const usage = user?.usage

  return (
    <main className='flex-1 p-4 lg:p-8 space-y-8'>
      <Card className='overflow-hidden border-none bg-gray-900 text-white'>
        <CardContent className='px-6 py-8 lg:px-10'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div className='space-y-3'>
              <span className='inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-orange-200'>
                Creator Command Center
              </span>
              <h1 className='text-3xl lg:text-4xl font-semibold'>
                Ship campaigns in minutes, not weeks.
              </h1>
              <p className='text-sm lg:text-base text-white/80 leading-relaxed'>
                Rally your team around Studio 24’s AI studios. Generate copy,
                storyboard visuals, and queue renders without leaving the
                dashboard.
              </p>
            </div>
            <div className='flex flex-col gap-3'>
              <div className='rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium'>
                <div className='text-white/70'>Current plan</div>
                <div className='mt-1 text-lg text-white'>{planLabel}</div>
                {usage && usage.limit !== null && usage.remaining !== null ? (
                  <div className='mt-2 text-xs text-white/70'>
                    {usage.remaining} of {usage.limit} generations remaining
                    today
                  </div>
                ) : null}
              </div>
              {plan === 'free' ? (
                <Button
                  asChild
                  className='rounded-full bg-white text-gray-900 hover:bg-gray-100'
                >
                  <Link href='/pricing'>
                    Upgrade for unlimited studios
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant='outline'
                  className='rounded-full border-white/40 text-black hover:bg-white/10 hover:text-white'
                >
                  <Link href='/settings'>
                    Manage plan
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className='space-y-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Studios & workflows
            </h2>
            <p className='text-sm text-gray-600'>
              Launch the right studio for where you are in the content
              lifecycle.
            </p>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {studios.map((studio) => (
            <StudioCardItem key={studio.key} studio={studio} plan={plan} />
          ))}
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-2'>
        <Card className='border border-gray-200'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <ShieldCheck className='h-5 w-5 text-orange-500' />
              <CardTitle className='text-lg font-semibold text-gray-900'>
                Plan guardrails
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-gray-600'>
            <p>
              {plan === 'pro'
                ? 'Enjoy unlimited runs across every studio plus Canva handoffs and saved projects.'
                : 'Free plan includes 10 generations every 24 hours. Upgrade to unlock unlimited runs, saved projects, and premium studios.'}
            </p>
            <p>
              Usage resets every 24 hours. We’ll surface upgrade prompts within
              studios when you approach the limit.
            </p>
          </CardContent>
        </Card>

        <Card className='border border-gray-200'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-orange-500' />
              <CardTitle className='text-lg font-semibold text-gray-900'>
                Getting the most from Studio 24
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-gray-600'>
            <ul className='list-disc space-y-2 pl-5'>
              <li>
                Start in Text Studio to lock in messaging, then repurpose and
                storyboard for visual polish.
              </li>
              <li>
                Save your best variants (Premium) so teams can republish
                instantly.
              </li>
              <li>
                Share upgrade-worthy wins with your stakeholders—anything that
                saves hours gets logged here.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
