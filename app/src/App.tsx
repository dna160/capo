import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import HeroGrid from '@/sections/HeroGrid'
import ProductShowcase from '@/sections/ProductShowcase'
import RedemptionTerminal from '@/sections/RedemptionTerminal'
import FooterGrid from '@/sections/FooterGrid'
import AuthCallback from '@/pages/AuthCallback'

function LandingPage() {
  const location = useLocation()

  useEffect(() => {
    // If redirected back with ?redeem= param, scroll to terminal
    const params = new URLSearchParams(location.search)
    if (params.has('c') || params.has('redeem')) {
      setTimeout(() => {
        document.getElementById('redemption-terminal')?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [location.search])

  return (
    <>
      <div className="transition-container" />
      <main>
        <HeroGrid />
        <ProductShowcase />
        <RedemptionTerminal />
        <FooterGrid />
      </main>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<LandingPage />} />
    </Routes>
  )
}
