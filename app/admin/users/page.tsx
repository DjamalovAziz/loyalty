'use client'
import { useState, useEffect } from 'react'
import type { UserRow } from '@/types'

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'CASHIER' | 'ADMIN'>('CASHIER')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleCreate() {
    if (!email || !name || !password) { setError('Заполните все поля'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, role }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Ошибка')
      return
    }
    setEmail(''); setName(''); setPassword(''); setShowForm(false)
    fetchUsers()
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    fetchUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Сотрудники</h1>
          <p className="text-sm text-gray-500 mt-0.5">Администраторы и кассиры</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <h2 className="font-medium text-gray-900 mb-4 text-sm">Новый сотрудник</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Имя</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="cashier@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Минимум 6 символов" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Роль</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="CASHIER">Кассир</option>
                <option value="ADMIN">Администратор</option>
              </select>
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Сохранение...' : 'Создать'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Имя</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Роль</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Добавлен</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role === 'ADMIN' ? 'Администратор' : 'Кассир'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                    }`}>
                      {u.isActive ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('ru')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        u.isActive
                          ? 'text-red-500 hover:bg-red-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {u.isActive ? 'Отключить' : 'Активировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
