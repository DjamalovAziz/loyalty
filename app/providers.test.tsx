import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Providers, useTheme } from './providers'

const TestComponent = () => {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  )
}

describe('Theme Provider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides default light theme', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )
    expect(screen.getByTestId('theme-value').textContent).toBe('light')
  })

  it('toggles theme correctly', () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    )
    
    expect(screen.getByTestId('theme-value').textContent).toBe('light')
    fireEvent.click(screen.getByText('Set Dark'))
    expect(screen.getByTestId('theme-value').textContent).toBe('dark')
    fireEvent.click(screen.getByText('Set Light'))
    expect(screen.getByTestId('theme-value').textContent).toBe('light')
  })
})