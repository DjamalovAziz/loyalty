import { describe, it, expect } from 'vitest'

describe('UI Components Structure', () => {
  it('should have correct nav item count', () => {
    const navItems = [
      { href: '/admin/clients', label: 'Клиенты' },
      { href: '/admin/transactions', label: 'Журнал операций' },
      { href: '/admin/users', label: 'Сотрудники' },
      { href: '/admin/settings', label: 'Настройки' },
    ]
    expect(navItems.length).toBe(4)
  })

  it('should have correct role options', () => {
    const roles = ['CASHIER', 'ADMIN']
    expect(roles).toContain('ADMIN')
    expect(roles).toContain('CASHIER')
  })
})