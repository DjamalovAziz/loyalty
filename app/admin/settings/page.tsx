'use client'
import { useTheme } from '@/app/providers'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-0.5">Настройки приложения</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Внешний вид</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тема оформления
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m8.66-9.66l-.71.71M5.05 5.05l-.71.71M21 12h-1M4 12H3m15.36 6.36l-.71-.71M6.34 17.66l.71-.71M16.95 7.05A7.02 7.02 0 115.05 16.95 7 7 0 0016.95 7.05z" />
                    </svg>
                    Светлая тема
                  </div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Тёмная тема
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}