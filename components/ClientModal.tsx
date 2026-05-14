'use client'
import { useState, useEffect } from 'react'
import { QRModal } from './QRModal'
import type { ClientRow } from '@/types'

interface Props {
  client: ClientRow | null
  onClose: () => void
  onSaved: () => void
}

export function ClientModal({ client, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(client?.fullName || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Bonus operation state
  const [opType, setOpType] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [opAmount, setOpAmount] = useState('')
  const [opComment, setOpComment] = useState('')
  const [opError, setOpError] = useState('')
  const [opLoading, setOpLoading] = useState(false)
  const [opSuccess, setOpSuccess] = useState('')

  const [showQR, setShowQR] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(client?.balance || 0)

  async function handleSave() {
    setSaving(true)
    setError('')
    const method = client ? 'PUT' : 'POST'
    const url = client ? `/api/clients/${client.id}` : '/api/clients'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Ошибка')
      return
    }
    onSaved()
  }

  async function handleOperation() {
    if (!client) return
    const amount = parseInt(opAmount)
    if (!amount || amount <= 0) { setOpError('Введите сумму'); return }
    setOpLoading(true)
    setOpError('')
    setOpSuccess('')
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, type: opType, amount, comment: opComment }),
    })
    setOpLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setOpError(d.error || 'Ошибка')
      return
    }
    const tx = await res.json()
    setCurrentBalance(tx.balanceAfter)
    setOpAmount('')
    setOpComment('')
    setOpSuccess(opType === 'CREDIT' ? `+${amount} начислено` : `-${amount} списано`)
    setTimeout(() => setOpSuccess(''), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {client ? 'Редактировать клиента' : 'Новый клиент'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+998901234567"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving || !fullName || !phone}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : client ? 'Сохранить изменения' : 'Создать клиента'}
          </button>

          {client && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <hr className="flex-1 border-gray-100" />
                <span className="text-xs text-gray-400">Операции с бонусами</span>
                <hr className="flex-1 border-gray-100" />
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">Текущий баланс</span>
                  <span className="text-lg font-bold text-gray-900">{currentBalance.toLocaleString('ru')} бонусов</span>
                </div>

                <div className="flex gap-2 mb-3">
                  {(['CREDIT', 'DEBIT'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOpType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        opType === t
                          ? t === 'CREDIT' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {t === 'CREDIT' ? '+ Начислить' : '− Списать'}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={opAmount}
                  onChange={(e) => setOpAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Сумма (целое число)"
                  min="1"
                />
                <input
                  value={opComment}
                  onChange={(e) => setOpComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Комментарий (необязательно)"
                />

                {opError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-2">{opError}</div>}
                {opSuccess && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg mb-2">{opSuccess}</div>}

                <button
                  onClick={handleOperation}
                  disabled={opLoading || !opAmount}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {opLoading ? 'Обработка...' : 'Применить'}
                </button>
              </div>

              <button
                onClick={() => setShowQR(true)}
                className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Показать QR-код
              </button>
            </>
          )}
        </div>
      </div>

      {showQR && client && (
        <QRModal client={{ ...client, balance: currentBalance }} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
