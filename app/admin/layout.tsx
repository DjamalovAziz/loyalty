import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AdminSidebarClient from './AdminSidebarClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <div className="relative min-h-screen bg-gray-50">
      <AdminSidebarClient user={session.user as any} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto ml-0 md:ml-[14rem]">{children}</main>
    </div>
  )
}
