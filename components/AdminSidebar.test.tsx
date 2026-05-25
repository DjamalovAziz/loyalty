import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminSidebar } from './AdminSidebar'

describe('AdminSidebar', () => {
  const user = { name: 'Test User', email: 'test@example.com', role: 'ADMIN' }

  it('renders sidebar with user info', () => {
    render(<AdminSidebar user={user} isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />)
    
    // Check brand
    expect(screen.getByText('Лояльность')).toBeInTheDocument()
    // Check user info
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders navigation items', () => {
    render(<AdminSidebar user={user} isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />)
    
    expect(screen.getByText('Клиенты')).toBeInTheDocument()
    expect(screen.getByText('Журнал операций')).toBeInTheDocument()
    expect(screen.getByText('Сотрудники')).toBeInTheDocument()
    expect(screen.getByText('Настройки')).toBeInTheDocument()
  })

  it('has mobile menu close button when open', () => {
    const setIsMobileMenuOpen = vi.fn()
    render(<AdminSidebar user={user} isMobileMenuOpen={true} setIsMobileMenuOpen={setIsMobileMenuOpen} />)
    
    // Find the close button by its icon (the X) - it's the button in the header
    const headerButtons = screen.getAllByRole('button')
    // The close button should be the button with the X icon (M6 18L18 6M6 6l12 12)
    const closeButton = headerButtons.find(button => 
      button.querySelector('svg') && 
      button.querySelector('svg')?.innerHTML.includes('M6 18L18 6M6 6l12 12')
    )
    expect(closeButton).toBeInTheDocument()
  })

  it('toggles mobile menu when clicking the close button', () => {
    const setIsMobileMenuOpen = vi.fn()
    render(<AdminSidebar user={user} isMobileMenuOpen={true} setIsMobileMenuOpen={setIsMobileMenuOpen} />)
    
    // Find the close button by its icon (the X)
    const headerButtons = screen.getAllByRole('button')
    const closeButton = headerButtons.find(button => 
      button.querySelector('svg') && 
      button.querySelector('svg')?.innerHTML.includes('M6 18L18 6M6 6l12 12')
    )
    expect(closeButton).toBeInTheDocument()
    
    fireEvent.click(closeButton)
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false)
  })
})