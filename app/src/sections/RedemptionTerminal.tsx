import { useEffect, useRef, useState, useCallback } from 'react'
import { MatrixDisplay } from '@/components/MatrixDisplay'
import { GlitchTransition } from '@/components/GlitchTransition'
import { api, getGoogleOAuthUrl, type RedeemResult } from '@/lib/api'
import { getVisitorId } from '@/lib/fingerprint'
import {
  VAULT_STANDARD, VAULT_TIER1, VAULT_TIER2, VAULT_TIER3, VAULT_VARIETY, pickCode,
} from '@/lib/demo-codes'

type TerminalState = 'standby' | 'auth-required' | 'loading' | 'success' | 'error' | 'queued'

interface QRParams {
  campaignId: string
  cartonUid: string
  signature: string
}

function parseQrParams(): QRParams | null {
  const params = new URLSearchParams(window.location.search)
  const campaignId = params.get('c')
  const cartonUid = params.get('uid')
  const signature = params.get('sig')
  if (campaignId && cartonUid && signature) return { campaignId, cartonUid, signature }
  return null
}

// ── Deterministic demo result generator ──────────────────────────────────────
function buildDemoResult(code: string): RedeemResult & { isDemoMode?: boolean } {
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

  const skus = [
    { code: 'BC', label: 'BC – Gotchard Edition' },
    { code: 'SB', label: 'SB – Geats Edition' },
    { code: 'FC', label: 'FC – Build Edition' },
  ]
  const districts = [
    'Kebayoran Baru', 'Setiabudi', 'Menteng', 'Kebon Jeruk', 'Coblong',
    'Gubeng', 'Yogyakarta Kota', 'Semarang Tengah', 'Medan Kota', 'Tanjung Priok',
    'Tebet', 'Grogol Petamburan', 'Jatinegara', 'Kramat Jati', 'Kelapa Gading',
  ]

  const sku = skus[seed % skus.length]
  const district = districts[(seed * 7) % districts.length]

  // Code length + seed digit drives scan count (1–12), so users can type longer
  // codes to unlock higher tiers as a natural demo progression
  const totalScans = Math.min(12, Math.max(1, code.length + (seed % 4)))

  const tier1 = totalScans >= 3
  const tier2 = totalScans >= 6
  const tier3 = totalScans >= 9
  const variety = totalScans >= 12

  const scannedSkuCodes = Array.from(
    new Set(Array.from({ length: Math.min(totalScans, 3) }, (_, i) => skus[(seed + i) % skus.length].code))
  )

  // Draw from pre-populated vault pools using seed so same code → same codes
  const tierRewards: { tier: string; game_code: string }[] = []
  if (tier1) tierRewards.push({ tier: 'TIER_1', game_code: pickCode(VAULT_TIER1, seed) })
  if (tier2) tierRewards.push({ tier: 'TIER_2', game_code: pickCode(VAULT_TIER2, seed + 1) })
  if (tier3) tierRewards.push({ tier: 'TIER_3', game_code: pickCode(VAULT_TIER3, seed + 2) })

  return {
    isDemoMode: true,
    game_code: pickCode(VAULT_STANDARD, seed),
    campaign_name: 'Ultra Milk × Kamen Rider: Gotchard',
    sku_resolved: sku.label,
    district_resolved: district,
    tier_rewards_issued: tierRewards,
    variety_reward_issued: variety ? { game_code: pickCode(VAULT_VARIETY, seed) } : null,
    lucky_draw_entries_total: totalScans,
    progress: {
      total_scans: totalScans,
      tier1_rewarded: tier1,
      tier2_rewarded: tier2,
      tier3_rewarded: tier3,
      variety_rewarded: variety,
      scanned_skus: scannedSkuCodes,
    },
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RewardBadge({ tier, code }: { tier: string; code: string }) {
  const colors: Record<string, string> = {
    TIER_1: '#FCEE0A',
    TIER_2: '#FF6B8A',
    TIER_3: '#00F2FF',
    VARIETY: '#FF00FF',
  }
  const color = colors[tier] ?? '#00F2FF'
  const label = tier === 'VARIETY' ? '★ VARIETY REWARD UNLOCKED' : `★ TIER ${tier.replace('TIER_', '')} REWARD UNLOCKED`
  return (
    <div style={{ border: `4px solid ${color}`, padding: '12px 16px', marginTop: '12px', background: '#000' }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color, letterSpacing: '0.15em', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', color, letterSpacing: '0.1em', wordBreak: 'break-all' }}>{code}</p>
    </div>
  )
}

function ProgressBar({ label, value, max, color = '#00F2FF' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: '#666' }}>{label}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color }}>{value}/{max}</span>
      </div>
      <div style={{ height: '4px', background: '#222', border: '1px solid #333' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RedemptionTerminal() {
  const matrixRef = useRef<HTMLDivElement>(null)
  const matrixInstance = useRef<MatrixDisplay | null>(null)
  const scrambleInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const [manualCode, setManualCode] = useState('')
  const [terminalState, setTerminalState] = useState<TerminalState>('standby')
  const [statusText, setStatusText] = useState('VOUCHER TERMINAL')
  const [logs, setLogs] = useState<string[]>(['> SISTEM DIINISIALISASI...', '> MASUKKAN KODE UNTUK DEMO...'])
  const [qrParams, setQrParams] = useState<QRParams | null>(null)
  const [redeemResult, setRedeemResult] = useState<(RedeemResult & { isDemoMode?: boolean }) | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const getMatrixConfig = () => {
    const w = window.innerWidth
    if (w < 480) return { cols: 36, rows: 9, dotSize: 3, gap: 0 }
    if (w < 768) return { cols: 54, rows: 11, dotSize: 3, gap: 1 }
    return { cols: 78, rows: 13, dotSize: 4, gap: 1 }
  }

  useEffect(() => {
    if (!matrixRef.current) return
    const config = getMatrixConfig()
    const display = new MatrixDisplay(matrixRef.current, config.cols, config.rows, config.dotSize, config.gap)
    matrixInstance.current = display
    display.renderText('MASUKKAN KODE', '#00F2FF')

    const handleResize = () => {
      if (!matrixRef.current) return
      const c = getMatrixConfig()
      matrixInstance.current?.destroy()
      const d = new MatrixDisplay(matrixRef.current, c.cols, c.rows, c.dotSize, c.gap)
      matrixInstance.current = d
      d.renderText(manualCode || 'MASUKKAN KODE', '#00F2FF')
    }
    window.addEventListener('resize', handleResize)

    const qr = parseQrParams()
    if (qr) {
      setQrParams(qr)
      addLog('> QR CODE TERDETEKSI...')
      addLog('> MEMUAT PARAMETER HADIAH...')
    }

    const authError = sessionStorage.getItem('o2o_auth_error')
    if (authError) {
      sessionStorage.removeItem('o2o_auth_error')
      addLog(`> ERROR AUTENTIKASI: ${authError.toUpperCase()}`)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      display.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (matrixInstance.current && terminalState === 'standby') {
      matrixInstance.current.renderText(manualCode.length > 0 ? manualCode : 'MASUKKAN KODE', '#00F2FF')
    }
  }, [manualCode, terminalState])

  useEffect(() => {
    return () => { if (scrambleInterval.current) clearInterval(scrambleInterval.current) }
  }, [])

  const addLog = useCallback((msg: string) => { setLogs(prev => [...prev.slice(-4), msg]) }, [])

  const handleLogin = () => {
    const qr = qrParams ?? parseQrParams()
    if (qr) sessionStorage.setItem('o2o_pending_redeem', JSON.stringify(qr))
    window.location.href = getGoogleOAuthUrl(qr?.campaignId)
  }

  // ── Real QR redemption (production path) ─────────────────────────────────
  const handleRedeem = async (params: QRParams) => {
    if (!api.auth.isLoggedIn()) {
      setTerminalState('auth-required')
      setStatusText('LOGIN DIPERLUKAN')
      addLog('> ERROR: AUTENTIKASI DIPERLUKAN')
      matrixInstance.current?.renderText('LOGIN', '#FCEE0A')
      return
    }

    setTerminalState('loading')
    setStatusText('MEMPROSES...')
    addLog('> MEMVERIFIKASI QR CODE...')
    addLog('> MENGHUBUNGI SERVER...')
    scrambleInterval.current = matrixInstance.current?.katakanaScramble(2000) || null

    try {
      const fp = await getVisitorId()
      const res = await api.redeem(params.campaignId, params.cartonUid, params.signature, fp)

      if (res.success && res.data) {
        addLog('> KODE DIVERIFIKASI')
        addLog('> AKSES DIBERIKAN')
        setRedeemResult(res.data)
        const transition = new GlitchTransition('/img/reward-wallpaper.jpg')
        transition.init(() => { setTerminalState('success'); setStatusText('AKSES DIBERIKAN') })
        setTimeout(() => transition.hide(), 2500)
      } else if (res.data && (res.data as { queued?: boolean }).queued) {
        setTerminalState('queued')
        setStatusText('DALAM ANTRIAN')
        addLog('> PENEBUSAN SEDANG DITINJAU')
      } else {
        setTerminalState('error')
        setErrorMessage(res.error ?? 'Terjadi kesalahan')
        setStatusText('GAGAL')
        addLog(`> ERROR: ${res.error?.toUpperCase() ?? 'UNKNOWN'}`)
        matrixInstance.current?.renderText('ERROR', '#FF00FF')
      }
    } catch {
      setTerminalState('error')
      setErrorMessage('Gagal terhubung ke server')
      setStatusText('ERROR JARINGAN')
      addLog('> ERROR: KONEKSI GAGAL')
      matrixInstance.current?.renderText('ERROR', '#FF00FF')
    }
  }

  // ── Demo redemption (any typed code) ─────────────────────────────────────
  const handleDemoRedeem = (code: string) => {
    if (code.length < 4) {
      addLog('> ERROR: KODE MIN. 4 KARAKTER')
      setStatusText('KODE TIDAK VALID')
      matrixInstance.current?.renderText('INVALID', '#FF00FF')
      setTimeout(() => {
        setStatusText('VOUCHER TERMINAL')
        matrixInstance.current?.renderText(code || 'MASUKKAN KODE', '#00F2FF')
      }, 1500)
      return
    }

    setTerminalState('loading')
    setStatusText('MEMVERIFIKASI...')
    addLog(`> MEMPROSES KODE: ${code}`)
    addLog('> MENGAKSES DATABASE KAMEN RIDER...')
    scrambleInterval.current = matrixInstance.current?.katakanaScramble(1800) || null

    const result = buildDemoResult(code)
    const { progress } = result

    setTimeout(() => {
      if (scrambleInterval.current) clearInterval(scrambleInterval.current)
      addLog(`> KODE "${code}" VALID`)
      if (progress.tier3_rewarded)       addLog('> ★ TIER 1 + 2 + 3 TERBUKA!')
      else if (progress.tier2_rewarded)  addLog('> ★ TIER 1 + 2 TERBUKA!')
      else if (progress.tier1_rewarded)  addLog('> ★ TIER 1 TERBUKA!')
      else                               addLog(`> SCAN #${progress.total_scans} DICATAT — LANJUTKAN`)

      setRedeemResult(result)
      const transition = new GlitchTransition('/img/reward-wallpaper.jpg')
      transition.init(() => { setTerminalState('success'); setStatusText('AKSES DIBERIKAN') })
      setTimeout(() => transition.hide(), 2500)
    }, 1800)
  }

  const handleReset = () => {
    setTerminalState('standby')
    setManualCode('')
    setStatusText('VOUCHER TERMINAL')
    setRedeemResult(null)
    setErrorMessage('')
    setQrParams(null)
    setLogs(['> SISTEM DIINISIALISASI...', '> MASUKKAN KODE UNTUK DEMO...'])
    matrixInstance.current?.renderText('MASUKKAN KODE', '#00F2FF')
    window.history.replaceState({}, '', '/')
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const sectionStyle = {
    minHeight: '100vh', background: '#FFF' as const,
    borderLeft: '4px solid #000', borderRight: '4px solid #000', borderBottom: '4px solid #000',
    display: 'flex', flexDirection: 'column' as const, position: 'relative' as const,
  }
  const headerStyle = {
    borderBottom: '4px solid #000', padding: '12px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#000', flexWrap: 'wrap' as const, gap: '8px',
  }
  const stateColor = {
    standby: '#FF00FF', loading: '#FCEE0A', success: '#00F2FF',
    error: '#FF4444', 'auth-required': '#FCEE0A', queued: '#FCEE0A',
  }[terminalState]

  return (
    <section id="redemption-terminal" style={sectionStyle}>
      <div style={headerStyle}>
        <span className="impact-text" style={{ fontSize: '14px', color: '#00F2FF', letterSpacing: '0.15em' }}>
          {statusText}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {api.auth.isLoggedIn() && (
            <button
              onClick={() => { api.auth.logout(); window.location.reload() }}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#666', background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              [LOGOUT]
            </button>
          )}
          <span style={{ width: '8px', height: '8px', background: stateColor, display: 'block', animation: terminalState === 'loading' ? 'blink 0.5s step-end infinite' : 'none' }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#00F2FF', opacity: 0.7, letterSpacing: '0.1em' }}>
            {terminalState === 'standby' ? 'SIAP' : terminalState === 'loading' ? 'MEMPROSES' : terminalState === 'success' ? 'SELESAI' : terminalState === 'queued' ? 'ANTRIAN' : 'SIAP'}
          </span>
        </div>
      </div>

      <div className="terminal-body">

        {/* ── QR Auto-Redeem prompt ─────────────────────────────────── */}
        {terminalState === 'standby' && qrParams && (
          <div style={{ width: '100%', maxWidth: '780px', marginBottom: '24px', border: '4px solid #FCEE0A', background: '#FCEE0A', padding: '16px' }}>
            <p className="impact-text" style={{ fontSize: '18px', color: '#000', marginBottom: '8px' }}>QR CODE TERDETEKSI</p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#000', marginBottom: '12px', lineHeight: 1.5 }}>
              Kemasan Anda telah terverifikasi.{' '}
              {api.auth.isLoggedIn() ? 'Klik di bawah untuk menukarkan hadiah.' : 'Login terlebih dahulu untuk menukarkan hadiah.'}
            </p>
            {api.auth.isLoggedIn() ? (
              <button
                onClick={() => handleRedeem(qrParams)}
                style={{ width: '100%', padding: '14px', background: '#000', color: '#FCEE0A', fontFamily: "Impact, sans-serif", fontSize: '18px', letterSpacing: '0.1em', border: 'none', cursor: 'pointer' }}
              >
                [ TUKAR HADIAH ]
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{ width: '100%', padding: '14px', background: '#000', color: '#00F2FF', fontFamily: "Impact, sans-serif", fontSize: '18px', letterSpacing: '0.1em', border: 'none', cursor: 'pointer' }}
              >
                [ LOGIN DENGAN GOOGLE ]
              </button>
            )}
          </div>
        )}

        {/* ── Auth required ─────────────────────────────────────────── */}
        {terminalState === 'auth-required' && (
          <div style={{ width: '100%', maxWidth: '780px', border: '4px solid #FCEE0A', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 className="impact-text" style={{ fontSize: '28px', color: '#000', marginBottom: '12px' }}>LOGIN DIPERLUKAN</h2>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '20px', lineHeight: 1.5 }}>
              Masuk dengan akun Google Anda untuk menukarkan hadiah.
            </p>
            <button
              onClick={handleLogin}
              style={{ padding: '14px 32px', background: '#000', color: '#00F2FF', fontFamily: "Impact, sans-serif", fontSize: '18px', letterSpacing: '0.1em', border: '4px solid #000', cursor: 'pointer' }}
            >
              [ LOGIN DENGAN GOOGLE ]
            </button>
          </div>
        )}

        {/* ── Queued ────────────────────────────────────────────────── */}
        {terminalState === 'queued' && (
          <div style={{ width: '100%', maxWidth: '780px', border: '4px solid #FCEE0A', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 className="impact-text" style={{ fontSize: '28px', color: '#000', marginBottom: '12px' }}>DALAM ANTRIAN VERIFIKASI</h2>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', lineHeight: 1.5 }}>
              Penukaran Anda sedang dalam proses verifikasi. Tim kami akan memproses permintaan Anda segera.
            </p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {terminalState === 'error' && (
          <div style={{ width: '100%', maxWidth: '780px', border: '4px solid #FF4444', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 className="impact-text" style={{ fontSize: '28px', color: '#FF4444', marginBottom: '12px' }}>GAGAL</h2>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#FF4444', marginBottom: '16px' }}>{errorMessage}</p>
            <button onClick={handleReset} style={{ padding: '12px 24px', background: '#000', color: '#FF4444', fontFamily: "Impact, sans-serif", fontSize: '16px', border: '4px solid #FF4444', cursor: 'pointer' }}>
              [ COBA LAGI ]
            </button>
          </div>
        )}

        {/* ── Matrix + Input (standby / loading) ────────────────────── */}
        {terminalState !== 'success' && (
          <>
            <div style={{ width: '100%', maxWidth: '780px', border: '4px solid #000', marginBottom: '24px', overflow: 'hidden' }}>
              <div ref={matrixRef} id="matrix-display" />
            </div>

            {!qrParams && (
              <>
                {/* Code input */}
                <div style={{ width: '100%', maxWidth: '780px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', border: '4px solid #000', background: '#000' }}>
                    <span style={{ padding: '14px 10px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00F2FF', letterSpacing: '0.1em', borderRight: '4px solid #000', background: '#FFF', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' as const }}>
                      KODE:
                    </span>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 20)
                        setManualCode(val)
                        if (val.length > 0) addLog(`> INPUT: ${val}`)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && terminalState === 'standby') handleDemoRedeem(manualCode) }}
                      placeholder="KETIK KODE APA SAJA..."
                      disabled={terminalState === 'loading'}
                      style={{
                        flex: 1, padding: '14px 12px',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 'clamp(13px, 3vw, 17px)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const,
                        border: 'none', outline: 'none',
                        background: '#FFF', color: '#000', minWidth: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Redeem button */}
                <button
                  onClick={() => handleDemoRedeem(manualCode)}
                  disabled={terminalState === 'loading'}
                  style={{
                    width: '100%', maxWidth: '780px',
                    padding: 'clamp(14px, 3vw, 20px) 24px',
                    background: terminalState === 'loading' ? '#333' : '#000',
                    color: terminalState === 'loading' ? '#666' : '#00F2FF',
                    fontFamily: "Impact, 'Arial Narrow Bold', sans-serif",
                    fontSize: 'clamp(14px, 3.5vw, 20px)',
                    letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                    border: '4px solid #000', cursor: 'pointer',
                  }}
                >
                  {terminalState === 'loading' ? '[ MEMPROSES... ]' : '[ TUKAR HADIAH ]'}
                </button>

                {/* Tier hint */}
                <div style={{ width: '100%', maxWidth: '780px', marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                  {[
                    { label: 'TIER 1', hint: '≥ 4 karakter', color: '#FCEE0A', scans: 3 },
                    { label: 'TIER 2', hint: '≥ 7 karakter', color: '#FF6B8A', scans: 6 },
                    { label: 'TIER 3', hint: '≥ 10 karakter', color: '#00F2FF', scans: 9 },
                    { label: 'VARIETY', hint: '≥ 13 karakter', color: '#FF00FF', scans: 12 },
                  ].map(({ label, hint, color }) => (
                    <div key={label} style={{ flex: 1, minWidth: '80px', padding: '6px 8px', border: `1px solid ${color}33`, background: '#00000008', textAlign: 'center' as const }}>
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color, letterSpacing: '0.1em', marginBottom: '2px' }}>{label}</p>
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#666' }}>{hint}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Log */}
            <div style={{ width: '100%', maxWidth: '780px', marginTop: '16px', padding: '12px', border: '4px solid #000', background: '#000', minHeight: '100px' }}>
              {logs.map((log, i) => (
                <p key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#00F2FF', letterSpacing: '0.05em', lineHeight: 1.6, opacity: i === logs.length - 1 ? 1 : 0.4, wordBreak: 'break-word' as const }}>{log}</p>
              ))}
            </div>

            {/* Instruction strip */}
            <div style={{ width: '100%', maxWidth: '780px', marginTop: '12px', padding: '12px', border: '2px solid #000', background: '#FCEE0A' as const }}>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 'clamp(9px, 2.5vw, 10px)', letterSpacing: '0.05em', lineHeight: 1.5, fontWeight: 700 }}>
                DEMO MODE: Ketik kode apapun (min. 4 karakter) dan tekan TUKAR HADIAH untuk melihat alur penukaran hadiah. Kode lebih panjang membuka tier reward lebih tinggi.
              </p>
            </div>
          </>
        )}

        {/* ── Success state ─────────────────────────────────────────── */}
        {terminalState === 'success' && redeemResult && (
          <div style={{ width: '100%', maxWidth: '900px', textAlign: 'center' }}>
            <div style={{ border: '4px solid #000', background: '#000', padding: 'clamp(24px, 5vw, 48px) clamp(16px, 3vw, 32px)', marginBottom: '24px' }}>

              {/* Demo badge */}
              {redeemResult.isDemoMode && (
                <div style={{ display: 'inline-block', marginBottom: '16px', padding: '4px 12px', border: '1px dashed #FCEE0A33', background: '#FCEE0A11' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#FCEE0A99', letterSpacing: '0.15em' }}>⬡ DEMO MODE — BUKAN KODE NYATA ⬡</span>
                </div>
              )}

              <h2 className="impact-text" style={{ fontSize: 'clamp(28px, 8vw, 72px)', color: '#00F2FF', marginBottom: '12px' }}>AKSES DIBERIKAN</h2>

              {/* Base game code */}
              <div style={{ border: '4px solid #00F2FF', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#00F2FF', letterSpacing: '0.1em', marginBottom: '8px' }}>KODE HADIAH UTAMA</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 'clamp(16px, 4vw, 24px)', color: '#00F2FF', letterSpacing: '0.15em', wordBreak: 'break-all' }}>
                  {redeemResult.game_code}
                </p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#666', marginTop: '8px' }}>
                  {redeemResult.campaign_name} · {redeemResult.sku_resolved}
                </p>
              </div>

              {/* Tier rewards */}
              {redeemResult.tier_rewards_issued.map((r) => (
                <RewardBadge key={r.tier} tier={r.tier} code={r.game_code} />
              ))}

              {/* Variety reward */}
              {redeemResult.variety_reward_issued && (
                <RewardBadge tier="VARIETY" code={redeemResult.variety_reward_issued.game_code} />
              )}

              {/* No tier yet — encourage more scans */}
              {redeemResult.tier_rewards_issued.length === 0 && !redeemResult.variety_reward_issued && (
                <div style={{ border: '2px dashed #333', padding: '14px', marginTop: '12px' }}>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#FCEE0A', letterSpacing: '0.1em' }}>
                    SCAN #{redeemResult.progress.total_scans} BERHASIL · BUTUH {3 - redeemResult.progress.total_scans} SCAN LAGI UNTUK TIER 1
                  </p>
                </div>
              )}

              {/* Lucky draw */}
              {redeemResult.lucky_draw_entries_total > 0 && (
                <div style={{ border: '2px solid #333', padding: '12px', marginTop: '12px', background: '#111' }}>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#666', letterSpacing: '0.1em' }}>
                    UNDIAN BERHADIAH · TIKET ANDA:{' '}
                    <span style={{ color: '#FCEE0A' }}>{redeemResult.lucky_draw_entries_total}</span>
                  </p>
                </div>
              )}

              {/* Progress tracker */}
              {redeemResult.progress && (
                <div style={{ border: '4px solid #333', padding: '16px', marginTop: '16px', textAlign: 'left' }}>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    PROGRESS KAMPANYE — KAMEN RIDER: GOTCHARD
                  </p>
                  <ProgressBar label="TOTAL SCAN" value={redeemResult.progress.total_scans} max={12} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'T1 (3×)', done: redeemResult.progress.tier1_rewarded, color: '#FCEE0A' },
                      { label: 'T2 (6×)', done: redeemResult.progress.tier2_rewarded, color: '#FF6B8A' },
                      { label: 'T3 (9×)', done: redeemResult.progress.tier3_rewarded, color: '#00F2FF' },
                      { label: 'VAR (12×)', done: redeemResult.progress.variety_rewarded, color: '#FF00FF' },
                    ].map(({ label, done, color }) => (
                      <div
                        key={label}
                        style={{
                          padding: '4px 10px',
                          background: done ? color : '#111',
                          border: `2px solid ${done ? color : '#333'}`,
                          fontFamily: "'Space Mono', monospace", fontSize: '9px',
                          color: done ? '#000' : '#666', letterSpacing: '0.1em',
                        }}
                      >
                        {done ? `✓ ${label}` : label}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#444', marginTop: '8px' }}>
                    SKU TERKUMPUL: {redeemResult.progress.scanned_skus.join(', ') || '-'}
                  </p>
                </div>
              )}

              {/* Wallpaper */}
              <div style={{ border: '4px solid #00F2FF', overflow: 'hidden', margin: '24px 0' }}>
                <img src="/img/reward-wallpaper.jpg" alt="Hadiah Kamen Rider" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>

              <a
                href="/img/reward-wallpaper.jpg"
                download="ultrarider-wallpaper.jpg"
                style={{ display: 'inline-block', padding: 'clamp(12px, 3vw, 16px) clamp(24px, 5vw, 48px)', background: '#00F2FF', color: '#000', fontFamily: "Impact, 'Arial Narrow Bold', sans-serif", fontSize: 'clamp(14px, 3.5vw, 18px)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, textDecoration: 'none', border: '4px solid #00F2FF', marginBottom: '12px' }}
              >
                [ UNDUH WALLPAPER ]
              </a>

              <div>
                <button
                  onClick={handleReset}
                  style={{ padding: '10px 24px', background: 'transparent', color: '#00F2FF', fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, border: '2px solid #00F2FF', cursor: 'pointer' }}
                >
                  [ COBA KODE LAIN ]
                </button>
              </div>
            </div>

            <div className="campaign-info">
              <div className="campaign-cell" style={{ padding: '12px' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>DISTRIK</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700 }}>{redeemResult.district_resolved}</p>
              </div>
              <div className="campaign-cell" style={{ padding: '12px' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>PRODUK</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700 }}>{redeemResult.sku_resolved}</p>
              </div>
              <div className="campaign-cell" style={{ padding: '12px' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>STATUS</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#00F2FF' }}>DITUKARKAN</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
