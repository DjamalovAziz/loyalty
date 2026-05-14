'use client'
import { useState, useEffect, useCallback } from 'react'
import type { TransactionRow } from '@/types'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (type) params.set('type', type)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/transactions?${params}`)
    setTransactions(await res.json())
    setLoading(false)
  }, [clientId, type, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(true)
    const params = new URLSearchParams({ format })
    if (clientId) params.set('clientId', clientId)
    if (type) params.set('type', type)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report.${format}`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Журнал операций</h1>
          <p className="text-sm text-gray-500 mt-0.5">{transactions.length} записей</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        >
          <option value="">Все типы</option>
          <option value="CREDIT">Начисления</option>
          <option value="DEBIT">Списания</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">С</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">По</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        {(type || from || to) && (
          <button
            onClick={() => { setType(''); setFrom(''); setTo('') }}
            className="text-sm text-gray-400 hover:text-gray-700 px-2"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Загрузка...</div>
      ) : !transactions.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Нет операций</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Дата</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Тип</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Клиент</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Сумма</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Остаток</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Сотрудник</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {t.type === 'CREDIT' ? '+ Начисление' : '− Списание'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.client?.fullName}</div>
                    <div className="text-xs text-gray-400">{t.client?.phone}</div>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'CREDIT' ? '+' : '−'}{t.amount.toLocaleString('ru')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{t.balanceAfter.toLocaleString('ru')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.user?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{t.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
