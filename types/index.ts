export type Role = 'ADMIN' | 'CASHIER'
export type TransactionType = 'CREDIT' | 'DEBIT'

export interface ClientRow {
  id: string
  fullName: string
  phone: string
  balance: number
  qrToken: string
  createdAt: string
}

export interface TransactionRow {
  id: string
  clientId: string
  userId: string
  type: TransactionType
  amount: number
  balanceAfter: number
  comment: string | null
  createdAt: string
  client?: { fullName: string; phone: string }
  user?: { name: string; email: string }
}

export interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}
