import Link from 'next/link'
import type { ClientRow } from '@/types'

interface Props {
  clients: ClientRow[]
  loading: boolean
  onEdit: (c: ClientRow) => void
  onDelete?: (id: string) => void
}

export function ClientsTable({ clients, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (!clients.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
        Нет клиентов
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">ФИО</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Телефон</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Баланс</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Дата регистрации</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/client/${c.qrToken}`} target="_blank" className="font-medium text-gray-900 hover:text-indigo-600">
                  {c.fullName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500">{c.phone}</td>
              <td className="px-4 py-3 text-right">
                <span className={`font-semibold ${c.balance > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {c.balance.toLocaleString('ru')}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">
                {new Date(c.createdAt).toLocaleDateString('ru')}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(c)}
                    className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    Изменить
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
