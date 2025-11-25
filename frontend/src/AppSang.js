// AppSang_ui_only.js
// Simplified frontend: removed AVL/DecisionTree/internal text processing.
// Kept original UI, buttons, modal and added:
// - calls to backend APIs for upload / process / CRUD
// - "Save Dictionary" button which calls /save_terms
// - word detail view modal when clicking the word title
// - uses same edit modal to update meanings

import React, { useState, useEffect, useRef, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AppSang.css";

console.log("🚀 Frontend Vocab Master (UI-only) đang khởi chạy...");

// ==================== API HELPER ====================
const USE_MOCK_API = false; // set true for local UI testing without backend
const API_BASE = "http://127.0.0.1:5000";

let mockVocabulary = [
  { id: 1, word: "algorithm", meaning: "thuật toán", example: "Decision tree là một thuật toán.", source: "mock", createdAt: new Date().toISOString() },
  { id: 2, word: "database", meaning: "cơ sở dữ liệu", example: "Ví dụ: MySQL, Postgres", source: "mock", createdAt: new Date().toISOString() },
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
      const newItem = { id: mockVocabulary.length + 1, word: body.term, meaning: body.definition || "", source: "mock", createdAt: new Date().toISOString() };
      mockVocabulary.push(newItem);
      return { success: true, data: newItem };
    }

    if (endpoint === "/update_term" && method === "PUT") {
      const body = options.body ? JSON.parse(options.body) : {};
      const idx = mockVocabulary.findIndex((w) => w.word.toLowerCase() === (body.term || "").toLowerCase());
      if (idx !== -1) { mockVocabulary[idx] = { ...mockVocabulary[idx], meaning: body.definition }; return { success: true, data: mockVocabulary[idx] }; }
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
  // core states (UI only)
  const [words, setWords] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  const [includeMeanings, setIncludeMeanings] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState(null); // object for edit or detail
  const [editMeaning, setEditMeaning] = useState("");

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
      const normalized = (res.data || []).map((item, idx) => ({ id: item.id ?? idx, word: item.word, meaning: item.meaning || item.definition || "", example: item.example || "", source: item.source || "backend", createdAt: item.createdAt || item.created_at || null }));
      setWords(normalized);
    } catch (err) {
      console.error(err);
      showNotification("Lỗi tải từ vựng: " + err.message, "error");
    } finally {
      setLoadingMessage("");
    }
  }, []);

  useEffect(() => { loadVocabulary(); }, [loadVocabulary]);

  // ----- Search -----
  const handleSearch = async () => {
    const term = (searchTerm || "").trim();
    if (!term) { showNotification("Vui lòng nhập từ cần tìm", "error"); return; }

    // Prefer backend search API if exists; otherwise do simple local filter
    try {
      setLoadingMessage("Đang tìm kiếm...");
      if (!USE_MOCK_API) {
        try {
          const res = await apiCall(`/search?term=${encodeURIComponent(term)}&exact=${exactMatch ? 1 : 0}`);
          if (res && res.data) { setSearchResults(res.data); return; }
        } catch (e) { console.debug("No backend /search or failed, fallback to local filter"); }
      }

      // local filter as fallback
      const results = words.filter((w) => {
        const lw = w.word.toLowerCase();
        if (exactMatch) return lw === term.toLowerCase();
        if (includeMeanings && w.meaning && w.meaning.toLowerCase().includes(term.toLowerCase())) return true;
        return lw.includes(term.toLowerCase());
      });
      setSearchResults(results);
    } catch (err) {
      console.error(err);
      showNotification("Lỗi tìm kiếm: " + err.message, "error");
    } finally { setLoadingMessage(""); }
  };

  const handleSearchKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  // ----- File upload / process -----
  const handleFileButtonClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; setSelectedFile(f); setFileName(f.name); };

  const handleProcessFile = async () => {
    if (!selectedFile) { showNotification("Vui lòng chọn file tài liệu trước", "error"); return; }
    try {
      setLoadingMessage("Đang gửi file lên server...");
      const formData = new FormData(); formData.append("document", selectedFile);
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
      // send to backend; backend decides how to persist
      await apiCall("/save_terms", { method: "POST", body: { terms: words } });
      showNotification("✅ Đã lưu từ điển trên server.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Lỗi lưu từ điển: " + err.message, "error");
    } finally { setLoadingMessage(""); }
  };

  // ----- Word detail / edit -----
  const openDetail = (wordObj) => { setCurrentWord(wordObj); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setCurrentWord(null); };

  const openModalForWord = (wordObj) => { setCurrentWord(wordObj); setEditMeaning(wordObj.meaning || ""); setModalOpen(true); };
  const openModalForNewWord = (wordText) => { setCurrentWord({ id: null, word: wordText }); setEditMeaning(""); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setCurrentWord(null); setEditMeaning(""); };

  const handleSaveMeaning = async () => {
    const word = (currentWord?.word || "").trim();
    const meaning = (editMeaning || "").trim();
    if (!word) { showNotification("Không có từ để lưu", "error"); return; }
    if (!meaning) { showNotification("Vui lòng nhập nghĩa cho từ.", "error"); return; }

    try {
      if (USE_MOCK_API) {
        await apiCall("/update_term", { method: "PUT", body: JSON.stringify({ term: word, definition: meaning }) });
      } else {
        await apiCall("/update_term", { method: "PUT", body: JSON.stringify({ term: word, definition: meaning }) });
      }

      // update local view optimistically
      setWords((prev) => {
        const idx = prev.findIndex((w) => w.word.toLowerCase() === word.toLowerCase());
        if (idx !== -1) {
          const arr = [...prev]; arr[idx] = { ...arr[idx], meaning, source: "backend" }; return arr;
        }
        // new
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
              <input type="text" id="searchInput" placeholder="Search English..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} />
              <button id="searchBtn" className="btn-primary" onClick={handleSearch}>🔍 Search</button>
            </div>
            <div className="search-filters">
              <label><input type="checkbox" id="exactMatch" checked={exactMatch} onChange={(e) => setExactMatch(e.target.checked)} /> Exact match</label>
              <label><input type="checkbox" id="includeMeanings" checked={includeMeanings} onChange={(e) => setIncludeMeanings(e.target.checked)} /> Include meanings</label>
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
                      <span className="source-badge">{item.source === "decision-tree" ? "Decision Tree" : "Thủ công"}</span>
                    </div>
                    <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>{item.meaning || "Chưa có nghĩa"}</p>
                    <div className="result-actions">
                      <button onClick={() => openModalForWord(item)} className="btn-secondary">✏️ {item.meaning ? "Edit meaning" : "Add meaning"}</button>
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
                  const hasMeaning = item.meaning && item.meaning.trim() !== "";
                  return (
                    <div key={item.id || item.word} className="word-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: 18, cursor: 'pointer' }} onClick={() => openDetail(item)}>{item.word}</div>
                          <span className="source-badge">{item.source === "decision-tree" ? "Decision Tree" : "Thủ công"}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#7f8c8d" }}>
                          {hasMeaning ? (<span className="status-badge status-has-meaning">✓ Đã có nghĩa</span>) : (<span className="status-badge status-no-meaning">✗ Chưa có nghĩa</span>)}
                          {" • Thêm: "}{item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                        </div>
                        {hasMeaning && (<div className="meaning-preview"><strong>Nghĩa:</strong> {item.meaning}</div>)}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openModalForWord(item)} className="btn-secondary">✏️ {hasMeaning ? "Edit" : "Add"}</button>
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
            <div style={{ marginBottom: 10 }}><strong>Meaning:</strong> {currentWord.meaning || '—'}</div>
            <div style={{ marginBottom: 10 }}><strong>Example:</strong> {currentWord.example || '—'}</div>
            <div style={{ marginBottom: 10 }}><strong>Source:</strong> {currentWord.source || '—'}</div>
            <div style={{ marginBottom: 10 }}><strong>Created:</strong> {currentWord.createdAt ? new Date(currentWord.createdAt).toLocaleString() : 'N/A'}</div>
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
            <textarea id="editMeaning" placeholder={editMeaning ? `Edit meaning of word "${currentWord?.word}"...` : `Add meaning for word "${currentWord?.word}"...`} className="form-textarea" value={editMeaning} onChange={(e) => setEditMeaning(e.target.value)} />
            <div className="modal-buttons">
              <button id="cancelEdit" className="btn-secondary" onClick={closeModal}>Hủy</button>
              <button id="saveMeaning" className="btn-primary" onClick={handleSaveMeaning}>Lưu</button>
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
