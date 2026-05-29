'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { signOut, useSession } from 'next-auth/react'
import type { ClientRow, TransactionRow } from '@/types'

interface ClientData extends ClientRow {
  transactions?: TransactionRow[]
}

export default function CashierPage() {
  const { data: session } = useSession()
  
  // Search by ID/token/QR (existing functionality)
  const [manualId, setManualId] = useState('')
  const [client, setClient] = useState<ClientData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)

  // Admin-like search by name/phone (new functionality)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientsList, setClientsList] = useState<ClientRow[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClientFromList, setSelectedClientFromList] = useState<ClientRow | null>(null)

  const [opType, setOpType] = useState<'CREDIT' | 'DEBIT'>('DEBIT')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [opError, setOpError] = useState('')
  const [opSuccess, setOpSuccess] = useState('')
  const [opLoading, setOpLoading] = useState(false)

  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<any>(null)
  const videoRef = useRef<HTMLDivElement>(null)
  const [videoElementReady, setVideoElementReady] = useState(false)

  // Search clients by name/phone (like admin)
  const searchClients = useCallback(async () => {
    if (!searchTerm.trim()) {
      setClientsList([])
      return
    }
    setClientsLoading(true)
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      setClientsList(data)
    } catch (error) {
      console.error('Error searching clients:', error)
      setClientsList([])
    } finally {
      setClientsLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    const timer = setTimeout(searchClients, 300)
    return () => clearTimeout(timer)
  }, [searchClients, searchTerm])

  async function findClientByToken(token: string) {
    setSearching(true)
    setNotFound(false)
    setClient(null)
    setSelectedClientFromList(null) // Clear list selection when using direct lookup
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
    setSelectedClientFromList(null) // Clear list selection when using direct lookup
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
    setSelectedClientFromList(null) // Clear list selection when scanning
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { })
      }
    }
  }, [])

  // Handle scanner initialization when we want to scan and have the video element
  useEffect(() => {
    if (!scanning || !videoElementReady) {
      // If we're not scanning or don't have the video element ready, stop any existing scanner
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { })
        scannerRef.current = null
      }
      return
    }

    // We're scanning and have the video element - start the scanner
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
          setVideoElementReady(false)
          const match = decodedText.match(/\/client\/([^/?]+)/)
          if (match) {
            findClientByToken(match[1])
          } else {
            setNotFound(true)
          }
        },
        () => { }
      ).catch(() => {
        setScanning(false)
        setVideoElementReady(false)
      })
    })

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { })
      }
    }
  }, [scanning, videoElementReady])

  // Compute the client to display (either from list or direct lookup)
  const displayClient = selectedClientFromList || client

  async function handleOperation() {
    // Use displayClient (which is either selectedClientFromList or client)
    if (!displayClient) return
    const amt = parseInt(amount)
    if (!amt || amt <= 0) { setOpError('Введите корректную сумму'); return }
    setOpLoading(true)
    setOpError('')
    setOpSuccess('')
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: displayClient.id, type: opType, amount: amt, comment }),
    })
    setOpLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setOpError(d.error || 'Ошибка')
      return
    }
    const tx = await res.json()
    // Update the client in state if it matches
    if (client && client.id === displayClient.id) {
      setClient(prev => prev ? { ...prev, balance: tx.balanceAfter } : prev)
    }
    // Update the client in the list if it matches
    setClientsList(prev => prev.map(c => 
      c.id === displayClient.id ? { ...c, balance: tx.balanceAfter } : c
    ))
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
    setSelectedClientFromList(null)
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
        <button onClick={() => signOut()} className="text-gray-400 hover:text-gray-700">
          Выход
        </button>
      </div>

      {/* Main content */}
      <div className="px-4 py-6 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 space-y-6">
            {/* Search section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direct search (ID/token/QR) */}
                <div className="space-y-3">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="Введите ID клиента или сканируйте QR-код"
                      className="w-full px-4 py-3 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M14.5 8a6.5 6.5 0 10-13 0" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleManualSearch}
                      disabled={searching || !manualId.trim()}
                      className="w-full flex-1 sm:w-auto px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {searching ? 'Поиск...' : 'Найти клиента'}
                    </button>
                    <button
                      onClick={startScanner}
                      disabled={searching || scanning}
                      className="w-full flex-1 sm:w-auto px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {scanning ? 'Остановка сканера' : 'Сканировать QR-код'}
                    </button>
                  </div>
                </div>

                {/* Admin-like search by name/phone */}
                <div className="space-y-3">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Поиск по имени или телефону"
                      className="w-full px-4 py-3 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M14.5 8a6.5 6.5 0 10-13 0" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={searchClients}
                    disabled={clientsLoading || !searchTerm.trim()}
                    className="w-full px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {clientsLoading ? 'Поиск...' : 'Найти клиентов'}
                  </button>
                </div>
              </div>

              {/* Clients list (admin-like) */}
              {clientsLoading && !clientsList.length && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Поиск клиентов...</p>
                </div>
              )}
              {!clientsLoading && clientsList.length === 0 && searchTerm.trim() && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">Клиенты не найдены</p>
                </div>
              )}
              {!clientsLoading && clientsList.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-100">
                  <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-500 text-sm">
                    Найдено клиентов: {clientsList.length}
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                    {clientsList.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClientFromList(c);
                          setClient(null); // Clear direct lookup client
                          setNotFound(false);
                          setSearching(false);
                        }}
                        className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedClientFromList && selectedClientFromList.id === c.id
                            ? 'bg-indigo-50'
                            : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{c.fullName}</p>
                          <p className="text-xs text-gray-500">{c.phone}</p>
                        </div>
                        <div className="text-right text-sm font-mono">
                          <span className={c.balance > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                            {c.balance.toLocaleString('ru')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Scanner Video */}
              {scanning && (
                <div className="mt-4">
                  <div
                    ref={(elem) => {
                      videoRef.current = elem
                      setVideoElementReady(!!elem)
                    }}
                    id="qr-reader"
                    className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"
                  >
                    Сканирование...
                  </div>
                </div>
              )}

              {/* Status messages */}
              {searching && <p className="text-sm text-gray-500">Поиск клиента...</p>}
              {notFound && <p className="text-sm text-red-500">Клиент не найден. Проверьте ID или QR-код.</p>}
            </div>

            {/* Client info and operations */}
            {displayClient && !notFound && !searching && (
              <div className="space-y-6">
                {/* Client header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{displayClient.fullName}</h2>
                    <p className="text-sm text-gray-500">Телефон: {displayClient.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">ID клиента:</p>
                    <p className="font-mono text-sm">{displayClient.id}</p>
                  </div>
                </div>

                {/* Balance display */}
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Текущий баланс</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {displayClient.balance.toLocaleString('ru')} бонусов
                  </p>
                </div>

                {/* Operations section */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOpType('CREDIT')}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${opType === 'CREDIT'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    >
                      + Начислить
                    </button>
                    <button
                      onClick={() => setOpType('DEBIT')}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${opType === 'DEBIT'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                    >
                      − Списать
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Введите сумму"
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий (необязательно)</label>
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Добавить комментарий"
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleOperation}
                      disabled={opLoading || !amount || parseInt(amount) <= 0}
                      className="flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: opType === 'CREDIT' ? '#10b981' : '#ef4444', color: 'white' }}
                    >
                      {opLoading ? 'Обработка...' : opType === 'CREDIT' ? 'Начислить' : 'Списать'}
                    </button>
                    <button
                      onClick={reset}
                      className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Сбросить
                    </button>
                  </div>

                  {/* Operation status */}
                  {opError && <p className="text-sm text-red-500">{opError}</p>}
                  {opSuccess && <p className="text-sm text-green-500">{opSuccess}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
