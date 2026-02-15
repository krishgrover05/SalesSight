import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { products } from '../api/client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [blinkitItems, setBlinkitItems] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch all valid products (ML + Blinkit) for search validation
        const res = await products.list();
        if (res.data.success) {
          setAvailableProducts(res.data.products);
        }

        // Fetch detailed Blinkit products for display
        const resBlinkit = await products.blinkit();
        if (resBlinkit.data.success) {
          // Store full objects for display
          setBlinkitItems(resBlinkit.data.products);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    };
    fetchProducts();
  }, []);

  const handleSearch = async (query) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setSearchQuery(searchTerm); // Ensure input matches click

    try {
      // 1. Search Products (Analysis)
      const res = await products.search([searchTerm]);

      if (!res.data.success || !res.data.analysis || res.data.analysis.length === 0) {
        throw new Error("No products found or backend returned empty analysis.");
      }

      const productAnalysis = res.data.analysis[0];

      // 2. Get Forecast (ML)
      // Note: We don't fail the whole operation if forecast fails, just log it
      let forecastData = null;
      try {
        const forecastRes = await products.forecast([searchTerm], 6);
        if (forecastRes.data.success && forecastRes.data.forecast && forecastRes.data.forecast.length > 0) {
          forecastData = forecastRes.data.forecast[0];
        }
      } catch (forecastErr) {
        console.warn("Forecast fetch failed:", forecastErr);
      }

      setAnalysis({ ...productAnalysis, forecast: forecastData });

    } catch (err) {
      console.error(err);
      // Extract backend error message if available
      const backendMsg = err.response?.data?.error || err.message || 'Failed to connect to backend.';
      setError(backendMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">SalesSight Dashboard</h1>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter product name (e.g. 'Amul Butter')"
            className="flex-1 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {loading ? 'Analyzing...' : 'Analyze Market'}
          </button>
        </div>

        {/* Available Products List */}
        <details className="bg-white border text-sm rounded-lg p-2 cursor-pointer">
          <summary className="font-medium text-blue-600 hover:text-blue-800">
            View Available Products ({availableProducts.length})
          </summary>

          {/* Show Blinkit items first with details if available, else plain list */}
          <div className="mt-2 max-h-60 overflow-y-auto p-2">
            {blinkitItems.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-700 mb-2 sticky top-0 bg-white">Blinkit Grocery Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {blinkitItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 border rounded hover:bg-blue-50 cursor-pointer flex justify-between items-center group"
                      onClick={() => handleSearch(item.name)}
                      title={`Click to analyze ${item.name}`}
                    >
                      <div>
                        <div className="font-medium truncate w-48">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.brand} • {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{item.price}</div>
                        <div className="text-xs text-yellow-600">★ {item.rating}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-bold text-gray-700 mb-2 sticky top-0 bg-white pt-2 border-t">Other ML Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableProducts.filter(p => !blinkitItems.some(b => b.name === p)).map((prod, idx) => (
                <div
                  key={idx}
                  className="p-1 px-2 hover:bg-gray-100 rounded cursor-pointer truncate"
                  onClick={() => handleSearch(prod)}
                  title="Click to search"
                >
                  {prod}
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Market Overview Card */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-700">Market Analysis: {analysis.product}</h2>
              <a
                href={`/analysis/${encodeURIComponent(analysis.product)}`}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
              >
                View Full Details →
              </a>
            </div>

            {/* Blinkit specific details if available */}
            {analysis.price && (
              <div className="mb-4 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 uppercase">Price</span>
                  <p className="font-bold text-slate-900">₹{analysis.price}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Brand</span>
                  <p className="font-bold text-slate-900">{analysis.brand || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Category</span>
                  <p className="font-bold text-slate-900">{analysis.category || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Rating</span>
                  <p className="font-bold text-yellow-600">★ {analysis.rating || 'N/A'}</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Current Trend</span>
                <span className="font-semibold text-green-600 capitalize">{analysis.trend}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Demand Score</span>
                <span className="font-semibold text-blue-600">{analysis.score}/100</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Est. Market Share</span>
                <span className="font-semibold">{analysis.marketShare}</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="font-medium text-blue-800">💡 Recommendation</p>
                <p className="text-blue-600 mt-1">{analysis.recommendation}</p>
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Demand Forecast (6 Months)</h2>
            {analysis.forecast ? (
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels: analysis.forecast.forecast.map(p => p.month),
                    datasets: [
                      {
                        label: 'Predicted Sales Volume',
                        data: analysis.forecast.forecast.map(p => p.value),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        tension: 0.3
                      }
                    ]
                  }}
                  plugins={[
                    {
                      id: 'custom-canvas-background-color',
                      beforeDraw: (chart) => {
                        const ctx = chart.canvas.getContext('2d');
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                      }
                    }
                  ]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                  }}
                />
              </div>
            ) : (
              <p className="text-gray-400 italic">No forecast data available.</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;
