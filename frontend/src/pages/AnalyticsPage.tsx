export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Analytics</h1>
      <p className="text-gray-600 mb-8">Platform-wide analytics powered by Blockscout</p>
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Total Agents</p>
          <p className="text-3xl font-bold">50</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Total Executions</p>
          <p className="text-3xl font-bold">1,200</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold">$50K</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Active Users</p>
          <p className="text-3xl font-bold">350</p>
        </div>
      </div>
    </div>
  );
}
