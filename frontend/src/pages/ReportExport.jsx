import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ReportExport() {
  const location = useLocation();
  const stateProduct = location.state?.productName || location.state?.analysis?.product;
  const stateAnalysis = location.state?.analysis;
  const stateForecast = location.state?.forecast;
  const [products, setProducts] = useState(stateProduct ? [stateProduct] : []);
  const [report, setReport] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (stateAnalysis && stateForecast) {
      setReport({
        product: stateProduct,
        generatedAt: new Date().toISOString(),
        analysis: stateAnalysis,
        forecast: stateForecast
      });
    }
  }, [stateAnalysis, stateForecast, stateProduct]);

  const buildReport = () => {
    if (report) return report;
    return {
      products,
      generatedAt: new Date().toISOString(),
      message: 'Run analysis from Dashboard to include full data, or export structure only.'
    };
  };

  const handleDownload = () => {
    const data = buildReport();
    let blob;
    let ext = 'txt';
    let mime = 'text/plain';

    if (exportFormat === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      ext = 'json';
      mime = 'application/json';
    } else if (exportFormat === 'csv') {
      // Flatten data for CSV
      const headers = ['Product', 'Price', 'Brand', 'Rating', 'Trend', 'Score', 'Recommendation', 'Forecast_Month_1', 'Forecast_Value_1', 'Forecast_Month_2', 'Forecast_Value_2', 'Forecast_Month_3', 'Forecast_Value_3'];

      const row = [
        data.product || data.products[0],
        data.analysis?.price || '',
        data.analysis?.brand || '',
        data.analysis?.rating || '',
        data.analysis?.trend || '',
        data.analysis?.score || '',
        `"${data.analysis?.recommendation || ''}"`
      ];

      // Add first 3 months of forecast
      if (data.forecast?.forecast) {
        data.forecast.forecast.slice(0, 3).forEach(f => {
          row.push(f.month, f.value);
        });
      }

      const csvContent = [headers.join(','), row.join(',')].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv' });
      ext = 'csv';
      mime = 'text/csv';
    } else {
      blob = new Blob([objectToText(data)], { type: 'text/plain' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salessight-${(data.product || 'report').substring(0, 20).replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const objectToText = (obj, indent = '') => {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) return obj.map((v) => indent + (typeof v === 'object' && v !== null ? objectToText(v, indent + '  ') : v)).join('\n');
    return Object.entries(obj)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) return `${indent}${k}:\n${objectToText(v, indent + '  ')}`;
        return `${indent}${k}: ${v}`;
      })
      .join('\n');
  };

  const reportData = buildReport();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">Report export</h1>
        <p className="text-slate-600 mt-1">Download analysis and forecast as JSON, CSV or text</p>
      </div>

      {!stateProduct && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-sm text-slate-600">
            For a full report, open a product from the Dashboard → Analysis Details, then click &quot;Export report&quot;.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="format"
            checked={exportFormat === 'json'}
            onChange={() => setExportFormat('json')}
            className="text-primary-600 focus:ring-primary-500"
          />
          JSON
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="format"
            checked={exportFormat === 'csv'}
            onChange={() => setExportFormat('csv')}
            className="text-primary-600 focus:ring-primary-500"
          />
          CSV
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="format"
            checked={exportFormat === 'text'}
            onChange={() => setExportFormat('text')}
            className="text-primary-600 focus:ring-primary-500"
          />
          Text
        </label>
        <button
          onClick={handleDownload}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          Download report
        </button>
        {downloaded && <span className="text-green-600 text-sm font-medium animate-pulse">Downloaded!</span>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <span className="font-medium text-slate-700">Preview ({exportFormat.toUpperCase()})</span>
        </div>
        <pre className="p-4 overflow-auto text-sm text-slate-700 max-h-96 font-mono bg-white">
          {exportFormat === 'json'
            ? JSON.stringify(reportData, null, 2)
            : (exportFormat === 'csv'
              ? "Product, Price, Brand, Rating, Trend...\n" + (reportData.product || "Sample Product") + ",..."
              : objectToText(reportData)
            )
          }
        </pre>
      </div>
    </div>
  );
}
