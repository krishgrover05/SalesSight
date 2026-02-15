import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AnalysisDetails from './pages/AnalysisDetails';
import ReportExport from './pages/ReportExport';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis/:id?" element={<AnalysisDetails />} />
        <Route path="/report" element={<ReportExport />} />
      </Routes>
    </Layout>
  );
}
