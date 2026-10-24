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
            background: '#EFE7DC',
            color: '#3A0A10',
            border: '1px solid #E4D9CA',
            borderRadius: '9999px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'Montserrat, sans-serif',
            boxShadow: '0 8px 30px rgba(42, 7, 11, 0.35)',
          },
          success: {
            iconTheme: { primary: '#3FA27A', secondary: '#EFE7DC' },
          },
          error: {
            iconTheme: { primary: '#E5484D', secondary: '#EFE7DC' },
          },
        }}
      />
    </BrowserRouter>
  )
}
