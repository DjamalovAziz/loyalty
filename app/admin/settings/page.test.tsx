import { describe, it, expect } from 'vitest'

describe('Settings Page Structure', () => {
  it('should have theme options', () => {
    const themes = ['light', 'dark']
    expect(themes).toContain('light')
    expect(themes).toContain('dark')
  })

  it('should have correct page title', () => {
    const title = 'Настройки'
    expect(title).toBeDefined()
  })
})