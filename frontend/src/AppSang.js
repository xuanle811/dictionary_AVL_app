import React, { useState, useEffect, useRef, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AppSang.css";

console.log("🚀 Frontend Vocab Master (UI-only) đang khởi chạy...");

// ==================== API HELPER ====================
const USE_MOCK_API = false; // set true for local UI testing without backend
const API_BASE = "http://127.0.0.1:5000";

let mockVocabulary = [
  { id: 1, word: "algorithm", definition: "thuật toán", example: "Decision tree là một thuật toán.", source: "mock", createdAt: new Date().toISOString() },
  { id: 2, word: "database", definition: "cơ sở dữ liệu", example: "Ví dụ: MySQL, Postgres", source: "mock", createdAt: new Date().toISOString() },
];

async function apiCall(endpoint, options = {}) {
  if (USE_MOCK_API) {
    console.log("📡 [MOCK API]", endpoint, options);
    const method = (options.method || "GET").toUpperCase();
    await new Promise((r) => setTimeout(r, 200));

    if ((endpoint === "/all-terms" || endpoint === "/get_all") && method === "GET") {
      return { data: mockVocabulary };
    }

    if (endpoint === "/upload-extract_pdf" && method === "POST") {
      // pretend backend extracted words and saved
      return { success: true, message: "ok" };
    }

    if (endpoint === "/insert_term" && method === "POST") {
      const body = options.body ? JSON.parse(options.body) : {};
      const newItem = { id: mockVocabulary.length + 1, word: body.term, definition: body.definition || "", source: "mock", createdAt: new Date().toISOString() };
      mockVocabulary.push(newItem);
      return { success: true, data: newItem };
    }

    if (endpoint === "/update_term" && method === "PUT") {
      const body = options.body ? JSON.parse(options.body) : {};
      const idx = mockVocabulary.findIndex((w) => w.word.toLowerCase() === (body.term || "").toLowerCase());
      if (idx !== -1) { mockVocabulary[idx] = { ...mockVocabulary[idx], definition: body.definition }; return { success: true, data: mockVocabulary[idx] }; }
      return { success: false };
    }

    if (endpoint.startsWith("/delete_term") && method === "DELETE") {
      const q = new URL("http://dummy" + endpoint);
      const term = q.searchParams.get("term");
      mockVocabulary = mockVocabulary.filter((w) => w.word.toLowerCase() !== (term || "").toLowerCase());
      return { success: true };
    }

    if (endpoint === "/save_terms" && method === "POST") {
      return { success: true, message: "saved" };
    }

    if (endpoint.startsWith("/fuzzy_full") && method === "GET") {
      // mock returning results array of minimal objects
      const url = new URL("http://dummy" + endpoint);
      const q = url.searchParams.get("query") || "";
      // naive mock: return words containing q
      const results = mockVocabulary
        .filter(w => w.word.toLowerCase().includes(q.toLowerCase()))
        .map(w => ({ term: w.word, offset: w.id }));
      return { query: q, threshold: 2, results };
    }

    if (endpoint.startsWith("/term_info") && method === "GET") {
      const url = new URL("http://dummy" + endpoint);
      const offset = Number(url.searchParams.get("offset"));
      const found = mockVocabulary.find(w => w.id === offset);
      if (!found) return { success: false, error: "Not found" };
      return { success: true, data: { offset: found.id, definition: found.definition, context: [], metadata: {} } };
    }

    return {};
  }

  const opts = { ...options };
  // If body is a plain object and not FormData, stringify
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== "string") {
    opts.body = JSON.stringify(opts.body);
  }

  const headers = opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {};

  const res = await fetch(`${API_BASE}${endpoint}`, { ...opts, headers: { ...(opts.headers || {}), ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

// ==================== UI HELPERS ====================
const notificationContainerStyle = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 10000,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};
const getNotificationStyle = (type) => {
  let bg = "#2196F3";
  if (type === "error") bg = "#f44336";
  if (type === "success") bg = "#4CAF50";
  if (type === "warning") bg = "#ff9800";
  return { padding: "12px 16px", background: bg, color: "white", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", minWidth: 250, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" };
};

// ==================== MAIN REACT COMPONENT ====================
const AppSang = () => {
  // config for suggestions / fuzzy
  const MIN_SUGGEST_CHARS =2;
  const SUGGEST_DEBOUNCE_MS = 300;
  const computeThreshold = (q) => {
    if (!q) return 1;
    const L = q.length;
    if (L <= 3) return 1;
    if (L <= 6) return 3;
    return Math.max(4, Math.floor(L * 0.45));
  };

  // core states (UI only)
  const [words, setWords] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionDebounceRef = useRef(null);
  const [exactMatch, setExactMatch] = useState(false);
  const [includeDefinitions, setIncludeDefinitions] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState(null);
  const [fileName, setFileName] = useState("No file selected");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState(null); // object for edit or detail
  const [editDefinition, setEditDefinition] = useState("");

  const [loadingMessage, setLoadingMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);
  const fileInputRef = useRef(null);

  const showNotification = (message, type = "info", duration = 5000) => {
    const id = notificationIdRef.current++;
    setNotifications((prev) => [...prev, { id, message, type }]);
    if (duration) setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), duration);
  };
  const dismissNotification = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  // ----- Load vocabulary from backend -----
  const loadVocabulary = useCallback(async () => {
    try {
      setLoadingMessage("Đang tải từ vựng...");
      let res;
      if (USE_MOCK_API) {
        res = { data: mockVocabulary };
      } else {
        res = await apiCall("/all-terms");
      }
      const normalized = (res.data || []).map((item, idx) => ({
        id: item.id ?? idx,
        word: item.word,
        definition: item.definition || item.definition || "",
        definition: item.definition || item.definition || "",
        example: item.example || "",
        source: item.source || "backend",
        createdAt: item.createdAt || item.created_at || null,
        context: item.context || []
      }));
      setWords(normalized);
    } catch (err) {
      console.error(err);
      showNotification("Lỗi tải từ vựng: " + err.message, "error");
    } finally {
      setLoadingMessage("");
    }
  }, []);

  useEffect(() => { loadVocabulary(); }, [loadVocabulary]);

  // suggestions debounce
  useEffect(() => {
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);

    suggestionDebounceRef.current = setTimeout(() => {
      if (searchTerm && searchTerm.trim().length >= MIN_SUGGEST_CHARS) {
        fetchSuggestions(searchTerm);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // only depend on searchTerm for suggestions

  // ----- Search -----
  const handleSearch = async () => {
    const term = (searchTerm || "").trim();
    if (!term) { showNotification("Vui lòng nhập từ cần tìm", "error"); return; }

    try {
      setLoadingMessage("Đang tìm kiếm...");

      if (!USE_MOCK_API) {
        try {
          const res = await apiCall(`/search?term=${encodeURIComponent(term)}&exact=${exactMatch ? 1 : 0}`);

          if (res && res.error) {
            console.debug("Backend returned error:", res.error);
            showNotification("Lỗi từ server: " + res.error, "warning");
          } else if (res && typeof res.found !== "undefined") {
            if (res.found) {
              setSearchResults([{
                id: res.offset ?? null,
                word: res.term ?? term,
                definition: res.definition || "",
                definition: res.definition || "",
                context: Array.isArray(res.context) ? res.context : [],
                source: "backend"
              }]);
            } else {
              setSearchResults([]);
              showNotification(`🔍 Không tìm thấy "${term}" trên server`, "info");
            }
            return;
          }
        } catch (e) {
          console.debug("No backend /search or failed, fallback to local filter", e);
        }
      }

      // local filter as fallback (only when search button explicitly used)
      const results = words.filter((w) => {
        const lw = (w.word || "").toLowerCase();
        if (exactMatch) return lw === term.toLowerCase();
        if (includeDefinitions && w.definition && w.definition.toLowerCase().includes(term.toLowerCase())) return true;
        return lw.includes(term.toLowerCase());
      });

      setSearchResults(results);
      if (results.length === 0) showNotification(`🔍 Không tìm thấy "${term}" (local).`, "info");
    } catch (err) {
      console.error(err);
      showNotification("Lỗi tìm kiếm: " + (err.message || err), "error");
    } finally {
      setLoadingMessage("");
    }
  };

  // ----- Suggestions: use backend fuzzy_full ONLY (no local fallback) -----
  const fetchSuggestions = async (q) => {
    const qTrim = (q || "").trim();
    if (!qTrim || qTrim.length < MIN_SUGGEST_CHARS) {
      setSuggestions([]);
      return;
    }

    try {
      const threshold = computeThreshold(qTrim);
      const res = await apiCall(`/fuzzy_full?query=${encodeURIComponent(qTrim)}&threshold=${encodeURIComponent(threshold)}`);

      // Support both { results: [...] } and direct array response
      const arr = Array.isArray(res.results) ? res.results : (Array.isArray(res) ? res : []);
      if (!arr || arr.length === 0) {
        setSuggestions([]);
        return;
      }

      // normalize: only need term + offset for suggestions
      const normalized = arr.map((r, i) => ({
        id: r.offset ?? i,
        word: r.term ?? r.word ?? "",
      }));

      setSuggestions(normalized.slice(0, 10));
    } catch (err) {
      console.error("Fuzzy API failed:", err);
      // If backend fails, clear suggestions (NO local fallback per request)
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item) => {
    if (!item) return;
    // put term into input and hide suggestions
    setSearchTerm(item.word || "");
    setShowSuggestions(false);

    // Open detail modal by calling openDetail with { id, word }
    openDetail({ id: item.id, word: item.word });
  };

  const handleSearchKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  // ----- File upload / process -----
  const handleFileButtonClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(files);
    setFileName(files.map(f => f.name).join(", "));
  };

  const handleProcessFile = async () => {
    if (!selectedFiles) { showNotification("Vui lòng chọn file tài liệu trước", "error"); return; }
    try {
      setLoadingMessage("Đang gửi file lên server...");
      const formData = new FormData(); selectedFiles.forEach(f => formData.append("documents", f));
      await apiCall("/upload-extract_pdf", { method: "POST", body: formData });
      showNotification("✅ File đã được gửi và xử lý ở backend (nếu API có).", "success");
      await loadVocabulary();
    } catch (err) {
      console.error(err);
      showNotification("Lỗi xử lý file: " + err.message, "error");
    } finally { setLoadingMessage(""); }
  };

  // ----- Save dictionary (new button) -----
  const handleSaveDictionary = async () => {
    try {
      setLoadingMessage("Đang lưu từ điển...");
      await apiCall("/save_terms", { method: "POST", body: { terms: words } });
      showNotification("✅ Đã lưu từ điển trên server.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Lỗi lưu từ điển: " + err.message, "error");
    } finally { setLoadingMessage(""); }
  };

  // ----- Word detail / edit -----
  const openDetail = async (wordObj) => {
    try {
      setLoadingMessage("Đang tải thông tin chi tiết...");

      // wordObj expected to contain id (offset)
      const res = await apiCall(`/term_info?offset=${encodeURIComponent(wordObj.id)}`);

      if (!res.success) {
        showNotification(res.error || "Không tìm thấy thông tin chi tiết!", "error");
        return;
      }

      const info = res.data;
      const fullInfo = {
        id: wordObj.id,
        word: wordObj.word,
        definition: info.definition || "",
        definition: info.definition || "",
        context: info.context || [],
        metadata: info.metadata || {},
        source: "backend"
      };

      setCurrentWord(fullInfo);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
      showNotification("Lỗi tải thông tin từ BE!", "error");
    } finally {
      setLoadingMessage("");
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
  };

  const openModalForWord = (wordObj) => { setDetailOpen(false); setCurrentWord(wordObj); setEditDefinition(wordObj.definition || ""); setModalOpen(true); };
  const openModalForNewWord = (wordText) => { setCurrentWord({ id: null, word: wordText }); setEditDefinition(""); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setCurrentWord(null); setEditDefinition(""); };

  const handleSaveDefinition = async () => {
    const word = (currentWord?.word || "").trim();
    const meaning = (editDefinition || "").trim();
    if (!word) { showNotification("Không có từ để lưu", "error"); return; }
    if (!meaning) { showNotification("Vui lòng nhập nghĩa cho từ.", "error"); return; }

    try {
      await apiCall("/update_term", { method: "PUT", body: JSON.stringify({ term: word, definition: meaning }) });

      setWords((prev) => {
        const idx = prev.findIndex((w) => w.word.toLowerCase() === word.toLowerCase());
        if (idx !== -1) {
          const arr = [...prev]; arr[idx] = { ...arr[idx], meaning, source: "backend" }; return arr;
        }
        const newItem = { id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1, word, meaning, source: "backend", createdAt: new Date().toISOString() };
        return [...prev, newItem];
      });

      showNotification(`✅ Đã lưu nghĩa cho "${word}"!`, "success");
      closeModal();
    } catch (err) {
      console.error(err);
      showNotification("Lỗi khi lưu nghĩa: " + err.message, "error");
    }
  };

  const handleRemoveWord = async (word) => {
    if (!word) return;
    if (!window.confirm(`Bạn có chắc muốn xóa từ "${word}"?`)) return;
    try {
      await apiCall(`/delete_term?term=${encodeURIComponent(word)}`, { method: "DELETE" });
      setWords((prev) => prev.filter((w) => w.word.toLowerCase() !== word.toLowerCase()));
      showNotification(`✅ Đã xóa từ "${word}"!`, "success");
    } catch (err) {
      console.error(err);
      showNotification("Lỗi xóa từ: " + err.message, "error");
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="vocab-container">
      {/* Notifications */}
      <div style={notificationContainerStyle} id="notification-container">
        {notifications.map((n) => (
          <div key={n.id} style={getNotificationStyle(n.type)} className={`notification ${n.type}`}>
            <span>{n.message}</span>
            <button onClick={() => dismissNotification(n.id)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", padding: 0, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <h1>📚 Vocab Master</h1>
        <p>Smart vocabulary learning application (UI-only)</p>
      </header>

      {/* Save dictionary button near header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 10px 20px" }}>
        <button className="btn-primary" onClick={handleSaveDictionary}>💾 Lưu từ điển</button>
      </div>

      {/* Split Layout Container (kept structure) */}
      <div className="split-container">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="panel-title">🔍 Search & Results</div>
          <section className="section search-section-fixed">
            <h3>Search Vocabulary</h3>
            <div className="search-box">
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  id="searchInput"
                  placeholder="Search English..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (showSuggestions && suggestions.length > 0) {
                        handleSelectSuggestion(suggestions[0]);
                      } else {
                        handleSearch();
                      }
                    } else {
                      handleSearchKeyDown(e);
                    }
                  }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }} // delay để allow click
                  autoComplete="off"
                />

                {/* Suggestion dropdown */}
                {showSuggestions && suggestions && suggestions.length > 0 && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    maxHeight: 260,
                    overflowY: "auto",
                    zIndex: 9999,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                  }}>
                    {suggestions.map((s) => (
                      <div key={`${s.id}-${s.word}`} onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }} style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #f1f1f1" }}>
                        <div style={{ fontWeight: "600" }}>{s.word}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button id="searchBtn" className="btn-primary" onClick={handleSearch}>🔍 Search</button>
            </div>
            <div className="search-filters">
              <label><input type="checkbox" id="exactMatch" checked={exactMatch} onChange={(e) => setExactMatch(e.target.checked)} /> Exact match</label>
              <label><input type="checkbox" id="includeMeanings" checked={includeDefinitions} onChange={(e) => setIncludeDefinitions(e.target.checked)} /> Include meanings</label>
            </div>
          </section>

          <div className="scrollable-container">
            <section className="section scrollable-content">
              <h3>Search Results</h3>
              <div className="search-results-container" id="searchResults">
                {!searchTerm && searchResults.length === 0 && (
                  <div className="no-results"><p>Enter a word to search to see results</p></div>
                )}

                {searchTerm && searchResults.length === 0 && (
                  <div className="no-results">
                    <p style={{ marginBottom: 15 }}>🔍 Không tìm thấy kết quả cho <strong>"{searchTerm}"</strong></p>
                    <button className="btn-primary" onClick={() => openModalForNewWord(searchTerm)}>➕ Thêm từ "{searchTerm}"</button>
                  </div>
                )}

                {searchResults.map((item) => (
                  <div key={item.id || item.word} className="search-result-item">
                    <div className="result-header">
                      <h3 style={{ margin: 0, color: "#2c3e50", cursor: "pointer" }} onClick={() => openDetail(item)}>{item.word}</h3>
                      <span className="source-badge">{item.source === "decision-tree" ? "Decision Tree" : " "}</span>
                    </div>
                    {item.context && item.context.length > 0 && (
                      <div style={{ marginTop: 5, color: "#777", fontSize: 13 }}>
                        <strong>Context:</strong>
                        {item.context.map((c, i) => (
                          <div key={i}>• {c}</div>
                        ))}
                      </div>
                    )}
                    <div className="result-actions">
                      <button onClick={() => { console.log("EDIT CLICKED SEARCH", item); openModalForWord(item) }} className="btn-secondary">✏️ {item.definition ? "Edit definition" : "Add definition"}</button>
                      <button onClick={() => handleRemoveWord(item.word)} className="btn-danger">🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="panel-title">📚 Document & Vocabulary</div>

          <section className="file-upload-section upload-section-fixed">
            <h3>Import Learning Document</h3>
            <button id="uploadBtn" className="btn-primary" onClick={handleFileButtonClick}>📄 Choose document file</button>
            <input type="file" id="documentInput" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileChange} />
            <div className="file-info">
              <p>Selected: <span id="fileName">{fileName}</span></p>
              <button id="processBtn" className="btn-primary" onClick={handleProcessFile}>Process document</button>
            </div>
          </section>

          <div className="scrollable-container">
            <section className="vocabulary-display scrollable-content">
              <h3>Learned Vocabulary</h3>
              <div className="memory-stats" style={{ cursor: 'default' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><strong>🧠 Vocabulary Memory:</strong> <span id="memoryStats">{words ? `${words.length} words` : 'Loading...'}</span></div>
                  <div style={{ color: "#3498db", fontSize: 11 }}>📊 Click a word to view details</div>
                </div>
              </div>

              <div className="word-list" id="wordList">
                {(!words || words.length === 0) && (
                  <div className="empty-state"><p>📝 Chưa có từ vựng nào</p><p>Hãy upload file hoặc thêm từ mới để bắt đầu!</p></div>
                )}

                {words.map((item) => {
                  const hasMeaning = item.definition && item.definition.trim() !== "";
                  return (
                    <div key={item.id || item.word} className="word-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: 18, cursor: 'pointer' }} onClick={() => openDetail(item)}>{item.word}</div>
                          <span className="source-badge">{item.source === "decision-tree" ? "Decision Tree" : " "}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#7f8c8d" }}>
                          {/*hasMeaning ? (<span className="status-badge status-has-meaning">✓ Đã có nghĩa</span>) : (<span className="status-badge status-no-meaning">✗ Chưa có nghĩa</span>)}
                          {" • Thêm: "}{item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "N/A"*/}
                        </div>
                        {hasMeaning && (<div className="meaning-preview"></div>)}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openModalForWord(item)} className="btn-secondary">✏️ {hasMeaning ? "Edit" : "Edit"}</button>
                        <button onClick={() => handleRemoveWord(item.word)} className="btn-danger">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailOpen && currentWord && (
        <div id="detailModal" className="modal modal-show">
          <div className="modal-content">
            <h4>Word details</h4>
            <div style={{ marginBottom: 10 }}><strong>Word:</strong> {currentWord.word}</div>
            <div style={{ marginBottom: 10 }}><strong>Meaning:</strong> {currentWord.definition || '—'}</div>
            <div style={{ marginBottom: 10 }}><strong>Context:</strong>    {currentWord.context?.length > 0
              ? currentWord.context.map((c, i) => (<div key={i}>• {c}</div>))
              : "—"}
            </div>
            <div style={{ marginBottom: 10 }}><strong>Source:</strong> {currentWord.source || '—'}</div>
            <div style={{ marginBottom: 10 }}><strong>Metadata:</strong>  <pre>{JSON.stringify(currentWord.metadata, null, 2)}</pre></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => { closeDetail(); openModalForWord(currentWord); }}>✏️ Edit</button>
              <button className="btn-secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Word Modal */}
      {modalOpen && (
        <div id="editModal" className="modal modal-show">
          <div className="modal-content">
            <h4>Add/Edit word meaning</h4>
            <input type="text" id="editWord" readOnly className="form-input" value={currentWord?.word || ""} />
            <textarea id="editMeaning" placeholder={editDefinition ? `Edit definition of word "${currentWord?.word}"...` : `Add definition for word "${currentWord?.word}"...`} className="form-textarea" value={editDefinition} onChange={(e) => setEditDefinition(e.target.value)} />
            <div className="modal-buttons">
              <button id="cancelEdit" className="btn-secondary" onClick={closeModal}>Hủy</button>
              <button id="saveMeaning" className="btn-primary" onClick={handleSaveDefinition}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingMessage && (
        <div id="loadingOverlay" className="loading-overlay">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      )}
    </div>
  );
};

export default AppSang;
