import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import * as React from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test', email: 'test@test.com', role: 'ADMIN' } },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))