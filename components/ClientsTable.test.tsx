import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClientsTable } from './ClientsTable'
import type { ClientRow } from '@/types'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('ClientsTable', () => {
  const mockClients: ClientRow[] = [
    { id: '1', fullName: 'Иван Иванов', phone: '+7 999 123-45-67', balance: 1000, createdAt: '2024-01-01T00:00:00Z', qrToken: 'token1' },
    { id: '2', fullName: 'Мария Петрова', phone: '+7 999 987-65-43', balance: 500, createdAt: '2024-01-02T00:00:00Z', qrToken: 'token2' },
  ]

  it('renders loading state', () => {
    render(<ClientsTable clients={[]} loading={true} onEdit={() => {}} />)
    expect(screen.getByText('Загрузка...')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<ClientsTable clients={[]} loading={false} onEdit={() => {}} />)
    expect(screen.getByText('Нет клиентов')).toBeInTheDocument()
  })

  it('renders clients list', () => {
    render(<ClientsTable clients={mockClients} loading={false} onEdit={() => {}} />)
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.getByText('Мария Петрова')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<ClientsTable clients={mockClients} loading={false} onEdit={onEdit} />)
    
    const editButtons = screen.getAllByText('Изменить')
    fireEvent.click(editButtons[0])
    
    expect(onEdit).toHaveBeenCalledWith(mockClients[0])
  })
})