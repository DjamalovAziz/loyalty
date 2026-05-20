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
  const [telegramLink, setTelegramLink] = useState('')
  const [createdName, setCreatedName] = useState('')

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
    const data = await res.json()
    setCreatedName(name)
    setTelegramLink(data.telegramLink || '')
    setEmail(''); setName(''); setPassword('')
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

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Сотрудники</h1>
          <p className="text-sm text-gray-500 mt-0.5">Администраторы и кассиры</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setTelegramLink('') }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <h2 className="font-medium text-gray-900 mb-4 text-sm">Новый сотрудник</h2>

          {!telegramLink ? (
            <>
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
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.367l-2.95-.924c-.64-.204-.657-.64.136-.953l11.57-4.461c.537-.194 1.006.131.636.22z" />
                </svg>
                <p className="text-sm font-medium text-blue-800">Сотрудник {createdName} создан!</p>
              </div>
              <p className="text-xs text-gray-500 mb-1">✉️ Email с данными для входа отправлен</p>
              <p className="text-xs text-blue-600 mb-3">
                Отправьте сотруднику эту ссылку для привязки Telegram уведомлений:
              </p>
              <div className="flex gap-2 mb-3">
                <input readOnly value={telegramLink}
                  className="flex-1 px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs text-gray-600 truncate" />
                <button onClick={() => copyLink(telegramLink)}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
                  Копировать
                </button>
              </div>
              <button onClick={() => { setTelegramLink(''); setShowForm(false) }}
                className="w-full border border-blue-200 text-blue-700 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors">
                Готово
              </button>
            </div>
          )}
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
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Telegram</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {u.role === 'ADMIN' ? 'Администратор' : 'Кассир'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(u as any).telegramChatId ? (
                      <span className="text-xs text-emerald-600 font-medium">✓ Привязан</span>
                    ) : (
                      <span className="text-xs text-gray-400">Не привязан</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                      }`}>
                      {u.isActive ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}>
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