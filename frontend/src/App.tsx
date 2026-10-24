import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import EvidenceDetail from './pages/EvidenceDetail'
import PublicVerify from './pages/PublicVerify'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/evidence/:id" element={<EvidenceDetail />} />
        <Route path="/verify/:id" element={<PublicVerify />} />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#14141A',
            color: '#F1F1F3',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#0B0B0F' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#0B0B0F' },
          },
        }}
      />
    </BrowserRouter>
  )
}
