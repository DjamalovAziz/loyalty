import { describe, it, expect } from 'vitest'

describe('API Types', () => {
  it('should validate UserRow structure', () => {
    type UserRow = {
      id: string
      email: string
      name: string | null
      role: 'ADMIN' | 'CASHIER'
      isActive: boolean
      telegramChatId: string | null
      createdAt: string
    }
    
    const user: UserRow = {
      id: 'test-id',
      email: 'test@test.com',
      name: 'Test User',
      role: 'ADMIN',
      isActive: true,
      telegramChatId: null,
      createdAt: new Date().toISOString()
    }
    
    expect(user.id).toBeDefined()
    expect(user.role).toMatch(/^(ADMIN|CASHIER)$/)
  })

  it('should validate ClientRow structure', () => {
    type ClientRow = {
      id: string
      fullName: string
      phone: string
      balance: number
      createdAt: string
      qrToken: string
    }
    
    const client: ClientRow = {
      id: 'client-id',
      fullName: 'Иван Иванов',
      phone: '+7 999 123-45-67',
      balance: 1000,
      createdAt: new Date().toISOString(),
      qrToken: 'token'
    }
    
    expect(client.fullName).toBeDefined()
    expect(client.balance).toBeGreaterThanOrEqual(0)
  })
})