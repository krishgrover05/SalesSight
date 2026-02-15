import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const products = trimmed.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    navigate('/dashboard', { state: { products: products.length ? products : [trimmed] } });
  };

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="text-center pt-8 sm:pt-16">
        <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
          Sales analytics that
          <span className="text-primary-600"> drive decisions</span>
        </h1>
        <p className="mt-4 text-slate-600 text-lg max-w-xl mx-auto">
          Search products, see historical trends, forecasts, and ranked recommendations—all in one place.
        </p>
        <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Laptop, Wireless Earbuds, Smart Watch"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Analyze
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Enter one or more products separated by commas
          </p>
        </form>
      </section>

      <section className="grid sm:grid-cols-3 gap-6">
        {[
          { title: 'Trends', desc: 'Historical sales and market trends per product.' },
          { title: 'Forecasts', desc: 'ML-powered predictions for the next months.' },
          { title: 'Recommendations', desc: 'Ranked list of products to sell.' }
        ].map(({ title, desc }) => (
          <div key={title} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h3 className="font-display font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-slate-600 text-sm">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
