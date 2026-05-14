import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { AdminSidebar } from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar user={session.user as any} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
