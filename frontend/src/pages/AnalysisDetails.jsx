import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { products as productsApi } from '../api/client';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function AnalysisDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // If id is provided in URL, decode it, otherwise use location state if available
  const productName = id ? decodeURIComponent(id) : location.state?.analysis?.product;

  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [forecast, setForecast] = useState(location.state?.forecast || null);
  const [loading, setLoading] = useState(!analysis && !!productName);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we have product name but no analysis data (e.g. direct URL access or refresh), fetch it
    if (productName && !analysis) {
      setLoading(true);
      setError(null);

      Promise.all([
        productsApi.search([productName]),
        productsApi.forecast([productName], 6)
      ])
        .then(([resSearch, resForecast]) => {
          // Robustly check for data
          const searchData = resSearch.data;
          if (searchData && searchData.analysis && searchData.analysis.length > 0) {
            setAnalysis(searchData.analysis[0]);
          } else {
            console.warn("Analysis data missing or empty:", searchData);
            setError(`Product analysis not found for "${productName}".`);
          }

          const forecastData = resForecast.data;
          if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
            setForecast(forecastData.forecast[0]);
          } else {
            console.warn("Forecast data missing or empty:", forecastData);
            // Don't fail the whole page if just forecast is missing
          }
        })
        .catch((e) => {
          console.error("API Error in AnalysisDetails:", e);
          const msg = e.response?.data?.error || e.message || "Failed to load details.";
          setError(msg);
        })
        .finally(() => setLoading(false));
    } else if (!productName && !analysis) {
      // No product ID and no state - this shouldn't happen unless user goes to /analysis directly without ID
      setError("No product specified.");
    }
  }, [productName]); // Only re-run if productName changes

  const historicalLabels = analysis?.historicalTrend?.map((t) => t.month) || [];
  const historicalData = analysis?.historicalTrend?.map((t) => t.value) || [];
  const forecastLabels = forecast?.forecast?.map((p) => p.month) || [];
  const forecastData = forecast?.forecast?.map((p) => p.value) || [];

  const chartData = {
    labels: [...historicalLabels, ...forecastLabels],
    datasets: [
      {
        label: 'Historical',
        data: [...historicalData, ...Array(forecastLabels.length).fill(null)],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Forecast',
        data: [...Array(historicalLabels.length).fill(null), ...forecastData],
        borderColor: 'rgb(139, 92, 246)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading analysis…</p>
      </div>
    );
  }

  if (error || (!analysis && !productName)) {
    return (
      <div className="space-y-4 p-6">
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:underline">
          ← Back to Dashboard
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <h3 className="font-bold">Error</h3>
          <p>{error || "Product not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:underline">
          ← Back
        </button>
        <h1 className="font-display font-bold text-2xl text-slate-900">
          {analysis?.product || productName}
        </h1>
      </div>

      {analysis && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysis.price && (
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-sm text-slate-500">Price</p>
              <p className="font-semibold text-slate-900">₹{analysis.price}</p>
            </div>
          )}
          {analysis.rating && (
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-sm text-slate-500">Rating</p>
              <p className="font-semibold text-yellow-600">★ {analysis.rating}</p>
            </div>
          )}
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <p className="text-sm text-slate-500">Trend</p>
            <p className="font-semibold text-slate-900 capitalize">{analysis.trend}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <p className="text-sm text-slate-500">Score</p>
            <p className="font-semibold text-slate-900">{analysis.score}</p>
          </div>
          {analysis.brand && (
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-sm text-slate-500">Brand</p>
              <p className="font-semibold text-slate-900">{analysis.brand}</p>
            </div>
          )}
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <p className="text-sm text-slate-500">Market share</p>
            <p className="font-semibold text-slate-900">{analysis.marketShare}</p>
          </div>
        </div>
      )}

      {analysis?.recommendation && (
        <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
          <p className="text-sm text-primary-800 font-medium">Recommendation</p>
          <p className="text-slate-700 mt-1">{analysis.recommendation}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
        <h2 className="font-display font-semibold text-lg text-slate-900 mb-4">Trend & forecast</h2>
        <div className="h-72 sm:h-80">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top' } },
              scales: { y: { beginAtZero: false } }
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/report', { state: { analysis, forecast, productName: analysis?.product } })}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
        >
          Export report
        </button>
      </div>
    </div>
  );
}
