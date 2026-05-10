import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { getVisitorId } from '../lib/fingerprint'

export default function AuthCallback() {
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      if (error || !code) {
        sessionStorage.setItem('o2o_auth_error', error ?? 'no_code')
        window.location.replace('/')
        return
      }

      try {
        const fingerprintHash = await getVisitorId()
        const redirectUri = `${window.location.origin}/auth/callback`

        const res = await api.auth.googleCallback(code, fingerprintHash, redirectUri)

        if (res.success) {
          // Store any pending QR params from sessionStorage
          const pendingRedeem = sessionStorage.getItem('o2o_pending_redeem')
          sessionStorage.removeItem('o2o_pending_redeem')
          window.location.replace(pendingRedeem ? `/?redeem=${pendingRedeem}` : '/')
        } else {
          sessionStorage.setItem('o2o_auth_error', res.error ?? 'auth_failed')
          window.location.replace('/')
        }
      } catch {
        sessionStorage.setItem('o2o_auth_error', 'network_error')
        window.location.replace('/')
      }
    }

    run()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#00F2FF', letterSpacing: '0.2em' }}>
          AUTHENTICATING...
        </p>
        <div style={{ marginTop: '16px', width: '8px', height: '8px', background: '#00F2FF', margin: '16px auto', animation: 'blink 0.5s step-end infinite' }} />
      </div>
    </div>
  )
}
