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
       </div>
     </div>
   )
}
