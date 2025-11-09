import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Clapperboard,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';
import { Terminal } from './terminal';

export default function HomePage() {
  return (
    <main>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                Turn Every Idea Into
                <span className="block text-orange-500">
                  Multi-Platform Campaigns in Minutes
                </span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Studio 24 orchestrates Gemini, Canva, and automated rendering so
                you deliver hooks, scripts, captions, and storyboards without
                juggling six different tools.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <a href="/sign-up">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg rounded-full"
                  >
                    Start Your Free Studio
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <p className="mt-3 text-sm text-gray-500">
                  No credit card required · 10 free generations every day
                </p>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <Terminal />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Text Studio
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Gemini-tailored hooks, captions, and scripts tuned to your
                  brand voice—copy or save every variant instantly.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <Clapperboard className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Video Repurpose Studio
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Turn transcripts or YouTube links into shorts playbooks, hooks,
                  and caption packs tuned for every channel.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Storyboard Studio + Canva
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Structured scene timelines with one-click Canva handoffs for
                  polished, production-ready visuals.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-sm text-gray-500">
            Premium unlocks automated reels rendering, saved projects, and
            unlimited Canva handoffs.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Loved by Creators, Agencies, and Growth Teams
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
              <span>🚀 12%+ Free → Premium upgrade rate</span>
              <span>⏱ &lt;5 minutes to first publishable asset</span>
              <span>🌍 Trusted by boutique agencies in 15+ markets</span>
            </div>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">
                “Our agency ships weekly cross-channel campaigns with a single
                brief.”
              </p>
              <p className="mt-4 text-sm font-medium text-gray-900">
                Sofia M. — Social Lead, LaunchLab
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">
                “Studio 24 cut my Shorts production time by 80% without hiring
                contractors.”
              </p>
              <p className="mt-4 text-sm font-medium text-gray-900">
                Devon K. — Creator &amp; Podcaster
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">
                “Clients finally see polished drafts in the first meeting instead
                of week three.”
              </p>
              <p className="mt-4 text-sm font-medium text-gray-900">
                Amelia J. — Fractional CMO
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                How Studio 24 Works
              </h2>
              <ol className="mt-6 space-y-4 text-base text-gray-600">
                <li>
                  <span className="font-semibold text-gray-900">
                    1. Capture the idea —
                  </span>{' '}
                  Paste a brief, transcript, or campaign goal once.
                </li>
                <li>
                  <span className="font-semibold text-gray-900">
                    2. Configure the outputs —
                  </span>{' '}
                  Choose tone, channels, and audience so Gemini stays on-brand.
                </li>
                <li>
                  <span className="font-semibold text-gray-900">
                    3. Generate &amp; refine —
                  </span>{' '}
                  Instantly review structured copy, video scripts, and storyboards.
                </li>
                <li>
                  <span className="font-semibold text-gray-900">
                    4. Export &amp; hand off —
                  </span>{' '}
                  Copy to clipboard, open Canva templates, or download rendered
                  shorts.
                </li>
              </ol>
            </div>
            <div className="mt-8 lg:mt-0 flex flex-col items-center lg:items-end">
              <a href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg rounded-full"
                >
                  Explore Studios
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </a>
              <a
                href="/pricing"
                className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Preview pricing →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white px-6 py-10 shadow-sm sm:px-10">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Pricing That Scales with Your Ambition
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              Start free with 10 AI generations per day. Upgrade to Premium for
              unlimited runs, Canva handoffs, saved projects, and automated reels
              rendering—billed in USD, cancel anytime.
            </p>
            <div className="mt-6">
              <a href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg rounded-full"
                >
                  View Plans &amp; Compare
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Premium unlocks team-ready features soon, including shared
              workspaces and brand libraries.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Common Questions
          </h2>
          <dl className="mt-8 space-y-6">
            <div className="rounded-xl bg-gray-50 p-6">
              <dt className="text-base font-semibold text-gray-900">
                Can I test Studio 24 without paying?
              </dt>
              <dd className="mt-2 text-base text-gray-600">
                Yes—create an account and you’ll get 10 free generations per day
                with access to Text Studio previews so you can see the full
                workflow.
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-6">
              <dt className="text-base font-semibold text-gray-900">
                What happens when I upgrade to Premium?
              </dt>
              <dd className="mt-2 text-base text-gray-600">
                Premium unlocks all studios, unlimited runs, Canva handoffs,
                saved projects, and automated reels rendering. The upgrade takes
                effect immediately after checkout.
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-6">
              <dt className="text-base font-semibold text-gray-900">
                Do I need design or video skills?
              </dt>
              <dd className="mt-2 text-base text-gray-600">
                Nope. Gemini delivers ready-to-paste copy, and our Canva
                templates plus auto-reels outputs keep the polish without manual
                editing.
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-6">
              <dt className="text-base font-semibold text-gray-900">
                Is my content secure?
              </dt>
              <dd className="mt-2 text-base text-gray-600">
                Your data stays in your workspace. We enforce Supabase Row Level
                Security, and billing runs through Stripe with full PCI
                compliance.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="py-16 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm sm:px-10">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Ready to Ship Your Next Campaign in Minutes?
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              Join Studio 24 and move from idea to publish-ready content faster
              than ever.
            </p>
            <div className="mt-6 flex justify-center">
              <a href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg rounded-full border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                >
                  Get Started Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
