'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  CircleIcon,
  Clapperboard,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from '@/app/(login)/actions'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'

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

function NavigationLinks() {
  const { data: user } = useSWR<ApiUser>('/api/user', fetcher)

  if (!user) {
    return null
  }

  return (
    <nav className='hidden md:flex items-center space-x-6 text-sm font-medium text-gray-600'>
      <Link href='/dashboard' className='hover:text-gray-900 transition-colors'>
        Dashboard
      </Link>
      <Link
        href='/studio/text'
        className='hover:text-gray-900 transition-colors'
      >
        Text Studio
      </Link>
      <Link
        href='/studio/video-repurpose'
        className='hover:text-gray-900 transition-colors'
      >
        Video Repurpose
      </Link>
      <Link
        href='/studio/storyboard'
        className='hover:text-gray-900 transition-colors'
      >
        Storyboard
      </Link>
      <Link
        href='/studio/auto-reels'
        className='hover:text-gray-900 transition-colors'
      >
        Auto Reels
      </Link>
      <Link href='/settings' className='hover:text-gray-900 transition-colors'>
        Settings
      </Link>
    </nav>
  )
}

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: user } = useSWR<ApiUser>('/api/user', fetcher)
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    mutate('/api/user')
    router.push('/')
  }

  if (!user) {
    return (
      <>
        <Link
          href='/pricing'
          className='text-sm font-medium text-gray-700 hover:text-gray-900'
        >
          Pricing
        </Link>
        <Button asChild className='rounded-full'>
          <Link href='/sign-up'>Sign Up</Link>
        </Button>
      </>
    )
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className='cursor-pointer size-9'>
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='flex flex-col gap-1'>
        <DropdownMenuItem className='cursor-pointer'>
          <Link href='/dashboard' className='flex w-full items-center'>
            <Home className='mr-2 h-4 w-4' />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer'>
          <Link href='/studio/text' className='flex w-full items-center'>
            <Sparkles className='mr-2 h-4 w-4' />
            <span>Text Studio</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer'>
          <Link
            href='/studio/video-repurpose'
            className='flex w-full items-center'
          >
            <Clapperboard className='mr-2 h-4 w-4' />
            <span>Video Repurpose</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer'>
          <Link href='/studio/storyboard' className='flex w-full items-center'>
            <LayoutDashboard className='mr-2 h-4 w-4' />
            <span>Storyboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer'>
          <Link href='/settings' className='flex w-full items-center'>
            <Settings className='mr-2 h-4 w-4' />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className='w-full'>
          <button type='submit' className='flex w-full'>
            <DropdownMenuItem className='w-full flex-1 cursor-pointer'>
              <LogOut className='mr-2 h-4 w-4' />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Header() {
  return (
    <header className='border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center'>
        <Link href='/' className='flex items-center'>
          <CircleIcon className='h-6 w-6 text-orange-500' />
          <span className='ml-2 text-xl font-semibold text-gray-900'>
            Studio 24
          </span>
        </Link>
        <div className='flex items-center space-x-4'>
          <Suspense fallback={null}>
            <NavigationLinks />
          </Suspense>
          <Suspense fallback={<div className='h-9' />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className='flex flex-col min-h-screen'>
      <Header />
      {children}
    </section>
  )
}
