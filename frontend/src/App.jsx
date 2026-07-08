import React, { useState } from 'react'
import Sidebar from './components/Sidebar'

export default function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)

      // Expects a backend POST /analyze that accepts multipart/form-data
      const res = await fetch('/analyze', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Server error ${res.status}: ${body}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'HIGH', color: '#dc2626' }
    if (score >= 50) return { level: 'MEDIUM', color: '#f97316' }
    return { level: 'LOW', color: '#16a34a' }
  }

  const getResultStats = (results) => {
    if (!results || !Array.isArray(results)) return null
    const highAI = results.filter(r => r.score >= 60).length
    const mediumAI = results.filter(r => r.score >= 40 && r.score < 60).length
    const lowAI = results.filter(r => r.score < 40).length
    return { highAI, mediumAI, lowAI, total: results.length }
  }

  const stats = result?.results ? getResultStats(result.results) : null
  const overallScore = result?.aggregate?.overall_score ?? 0
  const plagiarismScore = result?.aggregate?.plagiarism_score
  const externalError = result?.external_error
  const externalSource = result?.external_source

  const [activeNav, setActiveNav] = useState('upload')

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🔍 AI Detection Analyzer</h1>
          <p>Detect AI-generated content in your Word documents</p>
        </div>
      </header>

      <div className="layout">
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

        <main className="main">
          <div className="container">
            {/* Conditionally render views based on sidebar nav */}
            {activeNav === 'profile' ? (
              <section className="profile-view">
                <div className="details-section">
                  <h3>Profile</h3>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div className="avatar" style={{ width: 96, height: 96, fontSize: 28 }}>AP</div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>Alex Parker</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>Researcher • University</div>
                      <div style={{ marginTop: 12 }}>
                        <button className="btn-secondary">Edit Profile</button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <>
          {/* Upload Section */}
          <section className="upload-section">
            <div className="upload-card">
              <div className="upload-icon">📄</div>
              <h2>Upload Document</h2>
              <form onSubmit={handleSubmit}>
                <label htmlFor="file-input" className="file-label">
                  <span className="file-input-text">
                    {file ? `✓ ${file.name}` : 'Click to select .docx file or drag & drop'}
                  </span>
                  <input
                    id="file-input"
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="file-input"
                  />
                </label>
                <button type="submit" disabled={!file || loading} className="btn-submit">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing…
                    </>
                  ) : (
                    '🚀 Analyze Document'
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Error State */}
          {error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>Error</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <section className="results-section">
              {/* Overall Score Card */}
              <div className="score-card">
                <div className="score-header">
                  <h3>Overall AI Score</h3>
                  <span className="score-badge">{overallScore}%</span>
                </div>
                <div className="score-bar-container">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        width: `${overallScore}%`,
                        backgroundColor: getRiskLevel(overallScore).color,
                      }}
                    ></div>
                  </div>
                  <span className="risk-label" style={{ color: getRiskLevel(overallScore).color }}>
                    {getRiskLevel(overallScore).level} RISK
                  </span>
                </div>
                {plagiarismScore !== undefined && plagiarismScore !== null && (
                  <div className="score-summary-row" style={{ marginTop: '1.25rem' }}>
                    <strong>Plagiarism Score:</strong> {plagiarismScore}%
                    {result.aggregate.plagiarism_label ? ` — ${result.aggregate.plagiarism_label}` : ''}
                  </div>
                )}
                {externalSource && (
                  <div className="score-summary-row" style={{ marginTop: '0.75rem', color: '#2563eb' }}>
                    External API analysis applied.
                  </div>
                )}
              </div>

              {/* Statistics Grid */}
              {stats && (
                <div className="stats-grid">
                  <div className="stat-card high">
                    <div className="stat-number">{stats.highAI}</div>
                    <div className="stat-label">High AI Risk</div>
                    <div className="stat-percent">({((stats.highAI / stats.total) * 100).toFixed(0)}%)</div>
                  </div>
                  <div className="stat-card medium">
                    <div className="stat-number">{stats.mediumAI}</div>
                    <div className="stat-label">Medium AI Risk</div>
                    <div className="stat-percent">({((stats.mediumAI / stats.total) * 100).toFixed(0)}%)</div>
                  </div>
                  <div className="stat-card low">
                    <div className="stat-number">{stats.lowAI}</div>
                    <div className="stat-label">Low AI Risk</div>
                    <div className="stat-percent">({((stats.lowAI / stats.total) * 100).toFixed(0)}%)</div>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              <div className="details-section">
                <h3>Paragraph Analysis</h3>
                <div className="paragraphs-list">
                  {result.results?.map((para, idx) => {
                    const risk = getRiskLevel(para.score)
                    return (
                      <div key={idx} className="paragraph-item" style={{ borderLeftColor: risk.color }}>
                        <div className="para-header">
                          <span className="para-number">¶ {para.index}</span>
                          <span className="para-score" style={{ backgroundColor: risk.color }}>
                            {para.score}% — {risk.level}
                          </span>
                        </div>
                        <p className="para-text">{para.text.substring(0, 150)}…</p>
                        <div className="para-footer" style={{ display: 'grid', gap: 6 }}>
                          <small>{para.reason}</small>
                          {para.plagiarism_score != null && (
                            <small>
                              Plagiarism: {para.plagiarism_score}%{para.plagiarism_label ? ` — ${para.plagiarism_label}` : ''}
                            </small>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="btn-secondary" onClick={() => setResult(null)}>
                  Analyze Another File
                </button>
              </div>
            </section>
          )}

          {/* Info Box */}
          <div className="info-box">
            <h4>ℹ️ About This Tool</h4>
            <p>
              This tool analyzes Word documents to detect AI-generated content and plagiarism using your configured backend API.
            </p>
            <p style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
              Backend endpoint: <code>/analyze</code> (FastAPI wrapper around analyze_docx.py).
            </p>
            {externalError && (
              <p style={{ marginTop: 8, color: '#b91c1c', fontWeight: 700 }}>
                External API error: {externalError}
              </p>
            )}
            {!externalError && externalSource && (
              <p style={{ marginTop: 8, color: '#2563eb', fontWeight: 700 }}>
                Plagiarism and AI detection data were returned from the external API.
              </p>
            )}
          </div>
            </>
            )}
          </div>
        </main>
      </div>

      <footer className="footer">
        <p>© 2024 AI Plag Detector • Protecting Academic Integrity</p>
      </footer>
    </div>
  )
}
