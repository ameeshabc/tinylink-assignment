import { useState, useEffect } from "react";
import axios from "axios";
import { Link as RouterLink } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/links`);
      setLinks(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch links. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Validate URL
    if (!targetUrl.trim()) {
      setFormError("Please enter a URL");
      return;
    }

    // Basic URL validation - must include protocol
    if (!/^https?:\/\/.+/.test(targetUrl)) {
      setFormError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    // Validate custom code if provided
    if (customCode && !/^[A-Za-z0-9]{6,8}$/.test(customCode)) {
      setFormError("Custom code must be 6-8 alphanumeric characters [A-Za-z0-9]");
      return;
    }

    setSubmitting(true);

    try {
      const payload = { target_url: targetUrl };
      if (customCode.trim()) {
        payload.custom_code = customCode.trim();
      }

      const response = await axios.post(`${API}/links`, payload);
      setFormSuccess(`Link created! Short URL: ${BACKEND_URL}/${response.data.code}`);
      setTargetUrl("");
      setCustomCode("");
      fetchLinks();

      setTimeout(() => setFormSuccess(""), 5000);
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError("This short code already exists. Please choose another.");
      } else if (err.response?.status === 400) {
        setFormError(err.response?.data?.error || "Invalid input");
      } else {
        setFormError("Failed to create link. Please try again.");
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Are you sure you want to delete the link "${code}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/links/${code}`);
      setLinks(links.filter(link => link.code !== code));
    } catch (err) {
      alert("Failed to delete link. Please try again.");
      console.error(err);
    }
  };

  const handleCopy = (code) => {
    const shortUrl = `${BACKEND_URL}/${code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredLinks = links
    .filter(
      (link) =>
        link.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.target_url.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "clicks") {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🔗 TinyLink</h1>
        <p>URL Shortener - Shorten URLs, track clicks, and manage your links</p>
      </header>

      {/* Create Link Form */}
      <div className="card">
        <h2 style={{ marginBottom: "1.5rem", fontFamily: "'Space Grotesk', sans-serif" }}>
          Create New Short Link
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="target-url">
              Target URL (Long URL) *
            </label>
            <input
              id="target-url"
              type="text"
              className={`form-input ${formError && !targetUrl ? "error" : ""}`}
              placeholder="https://example.com/your-very-long-url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="custom-code">
              Custom Short Code (Optional)
            </label>
            <input
              id="custom-code"
              type="text"
              className={`form-input ${formError && customCode ? "error" : ""}`}
              placeholder="MyLink1 (6-8 alphanumeric characters)"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              disabled={submitting}
              maxLength={8}
            />
            <small style={{ color: "#718096", fontSize: "0.875rem", display: "block", marginTop: "0.5rem" }}>
              Leave blank to auto-generate. Must match pattern: [A-Za-z0-9]{"{6,8}"}
            </small>
          </div>

          {formError && (
            <div className="error-message">
              <span>⚠️</span> {formError}
            </div>
          )}

          {formSuccess && (
            <div className="success-message">
              <span>✓</span> {formSuccess}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ marginTop: "1rem" }}
          >
            {submitting ? "Creating..." : "Create Short Link"}
          </button>
        </form>
      </div>

      {/* Links Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
            Your Links ({filteredLinks.length})
          </h2>
          <div style={{ flex: "1", maxWidth: "350px" }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search by code or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p style={{ marginTop: "1rem" }}>Loading links...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchLinks} style={{ marginTop: "1rem" }}>
              Retry
            </button>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔗</div>
            <h3>No links yet</h3>
            <p>
              {searchQuery
                ? "No links match your search."
                : "Create your first short link above to get started!"}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort("code")}>
                    Short Code {sortField === "code" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("target_url")}>
                    Target URL {sortField === "target_url" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("clicks")}>
                    Total Clicks {sortField === "clicks" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("last_clicked")}>
                    Last Clicked {sortField === "last_clicked" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => (
                  <tr key={link.code}>
                    <td>
                      <span className="code-badge">{link.code}</span>
                    </td>
                    <td className="url-cell" title={link.target_url}>
                      {link.target_url}
                    </td>
                    <td>{link.clicks || 0}</td>
                    <td>{formatDate(link.last_clicked)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className={`copy-btn ${copiedCode === link.code ? "copied" : ""}`}
                          onClick={() => handleCopy(link.code)}
                        >
                          {copiedCode === link.code ? "✓ Copied!" : "Copy"}
                        </button>
                        <RouterLink to={`/code/${link.code}`}>
                          <button className="btn btn-secondary btn-small">
                            Stats
                          </button>
                        </RouterLink>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(link.code)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;