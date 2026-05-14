'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import type { TransactionRow } from '@/types'

interface ClientData {
  id: string
  fullName: string
  phone: string
  balance: number
  qrToken: string
  createdAt: string
  transactions: (TransactionRow & { user: { name: string } })[]
}

export default function ClientPublicPage() {
  const { token } = useParams<{ token: string }>()
  const [client, setClient] = useState<ClientData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrReady, setQrReady] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/token/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setClient)
      .catch(() => setNotFound(true))
  }, [token])

  useEffect(() => {
    if (!client || !canvasRef.current) return
    const url = `${window.location.origin}/client/${client.qrToken}`
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, { width: 160, margin: 1 }, () => setQrReady(true))
    })
  }, [client])

  function downloadQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-${client?.fullName?.replace(/\s+/g, '-')}.png`
    a.click()
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Клиент не найден</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Карта клиента</p>
              <h1 className="text-xl font-semibold text-gray-900 mb-0.5">{client.fullName}</h1>
              <p className="text-sm text-gray-400">{client.phone}</p>

              <div className="mt-4 bg-indigo-50 rounded-xl px-4 py-3 inline-block">
                <p className="text-xs text-indigo-400 mb-0.5">Баланс бонусов</p>
                <p className="text-3xl font-bold text-indigo-700">{client.balance.toLocaleString('ru')}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <canvas
                ref={canvasRef}
                className={`rounded-lg transition-opacity ${qrReady ? 'opacity-100' : 'opacity-0'}`}
              />
              <button
                onClick={downloadQR}
                disabled={!qrReady}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 font-medium"
              >
                Скачать QR
              </button>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-medium text-gray-900 text-sm">История операций</h2>
          </div>

          {!client.transactions.length ? (
            <div className="p-8 text-center text-sm text-gray-400">Операций пока нет</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {client.transactions.map((t) => (
                <div key={t.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.type === 'CREDIT' ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-sm font-bold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'CREDIT' ? '+' : '−'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'CREDIT' ? '+' : '−'}{t.amount.toLocaleString('ru')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{t.comment || t.user?.name}</span>
                      <span className="text-xs text-gray-300 flex-shrink-0">остаток: {t.balanceAfter.toLocaleString('ru')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Зарегистрирован {new Date(client.createdAt).toLocaleDateString('ru')}
        </p>
      </div>
    </div>
  )
}
