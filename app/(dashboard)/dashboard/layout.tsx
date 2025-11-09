'use client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex-1 w-full'>
      <div className='max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10'>
        {children}
      </div>
    </div>
  )
}
