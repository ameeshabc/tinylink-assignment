import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StatsPage() {
  const { code } = useParams();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLinkStats();
    // eslint-disable-next-line
  }, [code]);

  const fetchLinkStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/links/${code}`);
      setLink(response.data);
      setError("");
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Link not found");
      } else {
        setError("Failed to fetch link stats. Please try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const shortUrl = `${BACKEND_URL}/${code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{ marginTop: "1rem" }}>Loading link statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Link to="/" className="back-link">
        ← Back to Dashboard
      </Link>

      <header className="header">
        <h1>📊 Link Statistics</h1>
        <p>Detailed information for short code: <strong>{link.code}</strong></p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Short Code</div>
          <div className="stat-value">{link.code}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Clicks</div>
          <div className="stat-value">{link.clicks || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Created At</div>
          <div className="stat-value" style={{ fontSize: "1.25rem" }}>
            {formatDate(link.created_at)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Last Clicked</div>
          <div className="stat-value" style={{ fontSize: "1.25rem" }}>
            {formatDate(link.last_clicked)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1rem", fontFamily: "'Space Grotesk', sans-serif" }}>
          Target URL
        </h2>
        <div
          style={{
            padding: "1rem",
            background: "#f7fafc",
            borderRadius: "8px",
            wordBreak: "break-all",
            marginBottom: "1.5rem",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            border: "1px solid #e2e8f0"
          }}
        >
          <a href={link.target_url} target="_blank" rel="noopener noreferrer" style={{ color: "#4299e1" }}>
            {link.target_url}
          </a>
        </div>

        <h2 style={{ marginBottom: "1rem", marginTop: "2rem", fontFamily: "'Space Grotesk', sans-serif" }}>
          Short URL
        </h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "1rem",
              background: "#f7fafc",
              borderRadius: "8px",
              flex: "1",
              fontFamily: "monospace",
              fontSize: "0.95rem",
              border: "1px solid #e2e8f0",
              minWidth: "200px"
            }}
          >
            {BACKEND_URL}/{link.code}
          </div>
          <button
            className={`btn ${copied ? "btn-secondary" : "btn-primary"}`}
            onClick={handleCopy}
          >
            {copied ? "✓ Copied!" : "Copy Short URL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatsPage;