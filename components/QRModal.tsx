'use client'
import { useEffect, useRef, useState } from 'react'
import type { ClientRow } from '@/types'

interface Props {
  client: ClientRow
  onClose: () => void
}

export function QRModal({ client, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/client/${client.qrToken}`
    : ''

  useEffect(() => {
    if (!url) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 256,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      }, () => setReady(true))
    })
  }, [url])

  function downloadPNG() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-${client.fullName.replace(/\s+/g, '-')}.png`
    a.click()
  }

  function downloadPDF() {
    import('qrcode').then(async (QRCode) => {
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 })
      const win = window.open('', '_blank')!
      win.document.write(`
        <html><head><title>QR — ${client.fullName}</title></head>
        <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;gap:16px;">
          <h2 style="font-size:18px;color:#1a1a1a;margin:0">${client.fullName}</h2>
          <p style="font-size:14px;color:#666;margin:0">Баланс: ${client.balance.toLocaleString('ru')} бонусов</p>
          <img src="${dataUrl}" style="width:256px;height:256px" />
          <p style="font-size:11px;color:#aaa;margin:0">${url}</p>
        </body></html>`)
      win.document.close()
      setTimeout(() => win.print(), 500)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">QR-код клиента</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm font-medium text-gray-900 mb-1">{client.fullName}</p>
        <p className="text-xs text-gray-400 mb-4">{client.phone}</p>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className={`rounded-lg transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadPNG}
            disabled={!ready}
            className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            PNG
          </button>
          <button
            onClick={downloadPDF}
            disabled={!ready}
            className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            PDF (печать)
          </button>
        </div>
      </div>
    </div>
  )
}
