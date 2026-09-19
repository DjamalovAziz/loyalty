export default function StaffPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LoyaltySphere</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">Staff Panel</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earn Points</h3>
            <p className="text-gray-500">Staff earn interface coming soon.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Redeem Points</h3>
            <p className="text-gray-500">Staff redeem interface coming soon.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-in</h3>
            <p className="text-gray-500">QR check-in interface coming soon.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
