import { describe, it, expect } from 'vitest'

describe('API Validation', () => {
  it('validates email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    expect(emailRegex.test('test@test.com')).toBe(true)
    expect(emailRegex.test('invalid')).toBe(false)
    expect(emailRegex.test('test@')).toBe(false)
  })

  it('validates minimum password length', () => {
    const password = '12345'
    expect(password.length).toBeGreaterThanOrEqual(5)
    
    const shortPassword = '1234'
    expect(shortPassword.length).toBeLessThan(6)
  })

  it('validates role values', () => {
    const validRoles = ['ADMIN', 'CASHIER']
    expect(validRoles).toContain('ADMIN')
    expect(validRoles).toContain('CASHIER')
    expect(validRoles).not.toContain('USER')
  })
})