'use client'
import { useState, useEffect, useCallback } from 'react'
import { ClientsTable } from '@/components/ClientsTable'
import { ClientModal } from '@/components/ClientModal'
import type { ClientRow } from '@/types'

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<ClientRow | null>(null)
  const [showUnverified, setShowUnverified] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}&verified=${showUnverified ? 'false' : 'true'}`)
    const data = await res.json()
    setClients(data)
    setLoading(false)
  }, [search, showUnverified])

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300)
    return () => clearTimeout(timer)
  }, [fetchClients])

  function handleEdit(client: ClientRow) {
    setEditClient(client)
    setShowModal(true)
  }

  function handleNew() {
    setEditClient(null)
    setShowModal(true)
  }

  function handleSaved() {
    setShowModal(false)
    fetchClients()
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить клиента?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    fetchClients()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {showUnverified ? 'Не подтвержденные клиенты' : 'Клиенты'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} записей</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnverified(!showUnverified)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showUnverified
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showUnverified ? 'Показаны не подтвержденные' : 'Показать не подтвержденные'}
          </button>
          {!showUnverified && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новый клиент
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по ФИО или телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      <ClientsTable clients={clients} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />

      {showModal && (
        <ClientModal client={editClient} onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </div>
  )
}
