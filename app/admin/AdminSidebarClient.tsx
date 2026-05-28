'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/AdminSidebar'

export default function AdminSidebarClient({ user }: { user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  return <AdminSidebar user={user} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
}