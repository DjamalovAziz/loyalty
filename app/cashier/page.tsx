'use client'
import { useState, useRef, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import type { ClientRow, TransactionRow } from '@/types'

interface ClientData extends ClientRow {
  transactions?: TransactionRow[]
}

export default function CashierPage() {
  const { data: session } = useSession()
  const [manualId, setManualId] = useState('')
  const [client, setClient] = useState<ClientData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)

  const [opType, setOpType] = useState<'CREDIT' | 'DEBIT'>('DEBIT')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [opError, setOpError] = useState('')
  const [opSuccess, setOpSuccess] = useState('')
  const [opLoading, setOpLoading] = useState(false)

  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<any>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  async function findClientByToken(token: string) {
    setSearching(true)
    setNotFound(false)
    setClient(null)
    try {
      const res = await fetch(`/api/clients/token/${token}`)
      if (!res.ok) { setNotFound(true); return }
      setClient(await res.json())
    } finally {
      setSearching(false)
    }
  }

  async function findClientById(id: string) {
    setSearching(true)
    setNotFound(false)
    setClient(null)
    try {
      const res = await fetch(`/api/clients/${id}`)
      if (!res.ok) { setNotFound(true); return }
      setClient(await res.json())
    } finally {
      setSearching(false)
    }
  }

  function handleManualSearch() {
    const val = manualId.trim()
    if (!val) return
    // Check if it looks like a UUID (client id) or a token URL
    if (val.startsWith('http')) {
      const match = val.match(/\/client\/([^/?]+)/)
      if (match) { findClientByToken(match[1]); return }
    }
    findClientById(val)
  }

  function startScanner() {
    setScanning(true)
    setClient(null)
    setNotFound(false)
  }

  useEffect(() => {
    if (!scanning || !videoRef.current) return
    let html5QrCode: any

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 400 } },
        (decodedText: string) => {
          html5QrCode.stop().catch(() => { })
          setScanning(false)
          const match = decodedText.match(/\/client\/([^/?]+)/)
          if (match) {
            findClientByToken(match[1])
          } else {
            setNotFound(true)
          }
        },
        () => { }
      ).catch(() => setScanning(false))
    })

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { })
      }
    }
  }, [scanning])

  async function handleOperation() {
    if (!client) return
    const amt = parseInt(amount)
    if (!amt || amt <= 0) { setOpError('Введите корректную сумму'); return }
    setOpLoading(true)
    setOpError('')
    setOpSuccess('')
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, type: opType, amount: amt, comment }),
    })
    setOpLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setOpError(d.error || 'Ошибка')
      return
    }
    const tx = await res.json()
    setClient((prev) => prev ? { ...prev, balance: tx.balanceAfter } : prev)
    setAmount('')
    setComment('')
    setOpSuccess(opType === 'CREDIT' ? `Начислено ${amt} бонусов` : `Списано ${amt} бонусов`)
    setTimeout(() => setOpSuccess(''), 4000)
  }

  function reset() {
    setClient(null)
    setNotFound(false)
    setManualId('')
    setOpError('')
    setOpSuccess('')
    setAmount('')
    setComment('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-gray-900">Касса</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 pt-6">
        {/* Scanner */}
        {scanning && (
          <div className="mb-4">
            <div className="bg-black rounded-2xl overflow-hidden relative" style={{ height: 280 }}>
              <div id="qr-reader" ref={videoRef} className="w-full h-full" />
            </div>
            <button
              onClick={() => { scannerRef.current?.stop().catch(() => { }); setScanning(false) }}
              className="mt-2 w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        )}

        {!client && !scanning && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Найти клиента</h2>

            <button
              onClick={startScanner}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Сканировать QR-код
            </button>

            <div className="flex items-center gap-2 mb-4">
              <hr className="flex-1 border-gray-100" />
              <span className="text-xs text-gray-400">или введите ID</span>
              <hr className="flex-1 border-gray-100" />
            </div>

            <div className="flex gap-2">
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ID клиента..."
              />
              <button
                onClick={handleManualSearch}
                disabled={searching || !manualId.trim()}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {searching ? '...' : 'Найти'}
              </button>
            </div>

            {notFound && (
              <div className="mt-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                Клиент не найден
              </div>
            )}
          </div>
        )}

        {/* Client found */}
        {client && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Клиент</p>
                  <h2 className="font-semibold text-gray-900">{client.fullName}</h2>
                  <p className="text-sm text-gray-400">{client.phone}</p>
                </div>
                <button onClick={reset} className="text-gray-400 hover:text-gray-700 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center mb-1">
                <p className="text-xs text-indigo-400 mb-0.5">Баланс</p>
                <p className="text-3xl font-bold text-indigo-700">{client.balance.toLocaleString('ru')}</p>
                <p className="text-xs text-indigo-400">бонусов</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Операция</h3>

              <div className="flex gap-2 mb-3">
                {(['DEBIT', 'CREDIT'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOpType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${opType === t
                      ? t === 'CREDIT' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {t === 'CREDIT' ? '+ Начислить' : '− Списать'}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Сумма бонусов"
                min="1"
              />
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Комментарий (необязательно)"
              />

              {opError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-2">{opError}</div>}
              {opSuccess && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg mb-2 font-medium">{opSuccess}</div>}

              <button
                onClick={handleOperation}
                disabled={opLoading || !amount}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${opType === 'CREDIT'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
              >
                {opLoading ? 'Обработка...' : opType === 'CREDIT' ? 'Начислить бонусы' : 'Списать бонусы'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
