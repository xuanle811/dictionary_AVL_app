// appSang.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AppSang.css";

console.log("🚀 Frontend Vocab Master đang khởi chạy...");

// ==================== AVL TREE IMPLEMENTATION ====================

class AVLNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
  }

  getHeight(node) {
    return node ? node.height : 0;
  }

  updateHeight(node) {
    node.height =
      Math.max(this.getHeight(node.left), this.getHeight(node.right)) + 1;
  }

  getBalanceFactor(node) {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    this.updateHeight(y);
    this.updateHeight(x);

    return x;
  }

  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    this.updateHeight(x);
    this.updateHeight(y);

    return y;
  }

  insert(key, value) {
    this.root = this._insert(this.root, key, value);
  }

  _insert(node, key, value) {
    if (!node) return new AVLNode(key, value);

    if (key < node.key) {
      node.left = this._insert(node.left, key, value);
    } else if (key > node.key) {
      node.right = this._insert(node.right, key, value);
    } else {
      return node; // No duplicate keys
    }

    this.updateHeight(node);

    const balance = this.getBalanceFactor(node);

    // Left Left Case
    if (balance > 1 && key < node.left.key) {
      return this.rotateRight(node);
    }

    // Right Right Case
    if (balance < -1 && key > node.right.key) {
      return this.rotateLeft(node);
    }

    // Left Right Case
    if (balance > 1 && key > node.left.key) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    // Right Left Case
    if (balance < -1 && key < node.right.key) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  searchPrefix(prefix) {
    const results = [];
    this._searchPrefix(this.root, prefix.toLowerCase(), results);
    return results;
  }

  _searchPrefix(node, prefix, results) {
    if (!node) return;

    if (node.key.startsWith(prefix)) {
      results.push(node.value);
    }

    if (prefix <= node.key) {
      this._searchPrefix(node.left, prefix, results);
    }

    if (prefix >= node.key) {
      this._searchPrefix(node.right, prefix, results);
    }
  }

  clear() {
    this.root = null;
  }

  getTreeHeight() {
    return this.getHeight(this.root);
  }
}

// ==================== VOCABULARY MEMORY CLASS ====================

class VocabularyMemory {
  constructor() {
    this.wordsMap = new Map();
    this.avlTree = new AVLTree();
    this.indexed = false;
  }

  // Xây dựng bộ nhớ từ danh sách từ vựng
  buildMemory(vocabulary) {
    console.log("🧠 Đang xây dựng bộ nhớ từ vựng...");

    this.wordsMap.clear();
    this.avlTree.clear();

    vocabulary.forEach((word) => {
      if (!word || !word.word) return;
      const wordKey = word.word.toLowerCase().trim();
      this.wordsMap.set(wordKey, word);
      this.avlTree.insert(wordKey, word);
    });

    this.indexed = true;
    console.log(`✅ Đã xây dựng bộ nhớ cho ${vocabulary.length} từ`);
  }

  // Tìm kiếm từ trong bộ nhớ
  search(word, options = {}) {
    if (!this.indexed) {
      console.warn("⚠️ Bộ nhớ chưa được xây dựng");
      return [];
    }

    const searchTerm = word.toLowerCase().trim();
    const results = [];

    if (options.exact) {
      const exactMatch = this.wordsMap.get(searchTerm);
      if (exactMatch) {
        results.push(exactMatch);
      }
      return results;
    }

    const avlResults = this.avlTree.searchPrefix(searchTerm);
    results.push(...avlResults);

    if (options.includeMeanings) {
      this.wordsMap.forEach((wordObj) => {
        if (
          wordObj.meaning &&
          wordObj.meaning.toLowerCase().includes(searchTerm)
        ) {
          if (!results.some((r) => r.id === wordObj.id)) {
            results.push(wordObj);
          }
        }
      });
    }

    return results;
  }

  // Gợi ý từ tương tự
  suggestSimilar(word, limit = 5) {
    if (!this.indexed) return [];

    const searchTerm = word.toLowerCase().trim();
    const suggestions = [];

    this.wordsMap.forEach((wordObj, key) => {
      if (key.startsWith(searchTerm) && key !== searchTerm) {
        suggestions.push(wordObj);
      }
    });

    return suggestions
      .sort((a, b) => {
        const aSimilarity = this.calculateSimilarity(
          searchTerm,
          a.word.toLowerCase()
        );
        const bSimilarity = this.calculateSimilarity(
          searchTerm,
          b.word.toLowerCase()
        );
        return bSimilarity - aSimilarity;
      })
      .slice(0, limit);
  }

  // Tính độ tương tự
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    return (
      (longer.length - this.editDistance(longer, shorter)) /
      parseFloat(longer.length)
    );
  }

  // Tính khoảng cách chỉnh sửa
  editDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Thống kê bộ nhớ
  getStats() {
    return {
      totalWords: this.wordsMap.size,
      indexed: this.indexed,
      avlHeight: this.avlTree.getTreeHeight(),
      memorySize: this.getMemorySize(),
    };
  }

  // Ước tính kích thước bộ nhớ
  getMemorySize() {
    let size = 0;
    this.wordsMap.forEach((value, key) => {
      size += key.length * 2;
      size += JSON.stringify(value).length * 2;
    });
    return `${(size / 1024).toFixed(2)} KB`;
  }
}

// ==================== DECISION TREE IMPLEMENTATION ====================

class DecisionTree {
  constructor() {
    this.categories = new Map();
  }

  // Phân loại từ vựng theo độ dài
  categorizeWords(vocabulary) {
    console.log("🌳 Đang phân loại từ vựng với Decision Tree...");

    this.categories.clear();

    vocabulary.forEach((word) => {
      if (!word || !word.word) return;
      const length = word.word.length;
      let category;

      if (length <= 4) {
        category = "short";
      } else if (length <= 7) {
        category = "medium";
      } else {
        category = "long";
      }

      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }
      this.categories.get(category).push(word);
    });

    console.log(
      `✅ Đã phân loại ${vocabulary.length} từ vào ${this.categories.size} nhóm`
    );
  }

  // Gợi ý từ theo ngữ cảnh
  suggestByContext(context, limit = 3) {
    const contextWords = context.toLowerCase().split(/\s+/);
    const suggestions = new Map();

    contextWords.forEach((contextWord) => {
      this.categories.forEach((words) => {
        words.forEach((word) => {
          if (this.isContextRelevant(contextWord, word.word)) {
            const score = this.calculateRelevanceScore(contextWord, word);
            suggestions.set(word.word, { word, score });
          }
        });
      });
    });

    return Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.word);
  }

  // Kiểm tra tính liên quan ngữ cảnh
  isContextRelevant(contextWord, targetWord) {
    const ctx = contextWord.toLowerCase();
    const target = targetWord.toLowerCase();

    return (
      target.includes(ctx) ||
      ctx.includes(target) ||
      this.calculateSimilarity(ctx, target) > 0.6
    );
  }

  // Tính điểm liên quan
  calculateRelevanceScore(contextWord, wordObj) {
    let score = 0;
    const ctx = contextWord.toLowerCase();
    const word = wordObj.word.toLowerCase();

    score += this.calculateSimilarity(ctx, word) * 0.6;

    if (wordObj.meaning && wordObj.meaning.toLowerCase().includes(ctx)) {
      score += 0.4;
    }

    return score;
  }

  // Tính độ tương tự
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    return (
      (longer.length - this.editDistance(longer, shorter)) /
      parseFloat(longer.length)
    );
  }

  editDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// {==================== API HELPER ====================
// THAY ĐỔI ĐỂ GỌI API GIẢ
// ==================== API HELPER ====================

const USE_MOCK_API = true; // << ĐANG BẬT API ẢO
const API_BASE = "http://localhost:5000/api";

// dữ liệu mẫu để test UI
let mockVocabulary = [
  {
    id: 1,
    word: "algorithm",
    meaning: "thuật toán",
    example: "Decision tree là một thuật toán trong machine learning.",
    source: "mock",
  },
  {
    id: 2,
    word: "database",
    meaning: "cơ sở dữ liệu",
    example: "Từ điển của bạn được lưu trong một database.",
    source: "mock",
  },
  {
    id: 3,
    word: "tree",
    meaning: "cây (trong cấu trúc dữ liệu)",
    example: "AVL Tree là một dạng cây cân bằng.",
    source: "mock",
  },
];

async function apiCall(endpoint, options = {}) {
  // ====== CHẾ ĐỘ MOCK (API ẢO) ======
  if (USE_MOCK_API) {
    console.log("📡 [MOCK API]", endpoint, options);
    const method = (options.method || "GET").toUpperCase();

    // giả lập delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // GET /vocabulary
    if ((endpoint === "/vocabulary" || endpoint === "/api/words") && method === "GET") {
      return { data: mockVocabulary };
    }

    // POST /vocabulary  (thêm từ mới)
    if (endpoint === "/vocabulary" && method === "POST") {
      try {
        const body = options.body ? JSON.parse(options.body) : {};
        const newItem = {
          id: mockVocabulary.length + 1,
          word: body.word || "",
          meaning: body.meaning || "",
          example: body.example || "",
          source: body.source || "mock",
        };
        mockVocabulary = [...mockVocabulary, newItem];
        return { success: true, data: newItem };
      } catch (e) {
        console.error("Lỗi parse body mock POST /vocabulary:", e);
        return { success: false };
      }
    }

    // Mặc định trả về rỗng
    return {};
  }

  // ====== CHẾ ĐỘ THẬT (GỌI BACKEND) ======
  const defaultHeaders = options.body
    ? { "Content-Type": "application/json" }
    : {};

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
//=============API giả======================


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

  return {
    padding: "12px 16px",
    background: bg,
    color: "white",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    minWidth: 250,
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  };
};

// ==================== MAIN REACT COMPONENT ====================

const App = () => {
  const [words, setWords] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const isSearchListEmpty =
  !searchResults || searchResults.length === 0;
  const memoryRef = useRef(new VocabularyMemory());
  const decisionTreeRef = useRef(new DecisionTree());
  const [memoryStats, setMemoryStats] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  const [includeMeanings, setIncludeMeanings] = useState(true);
  const [similarSuggestions, setSimilarSuggestions] = useState([]);
  const [contextSuggestions, setContextSuggestions] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Chưa có file nào");

  const [modalOpen, setModalOpen] = useState(false);
  const [currentWordId, setCurrentWordId] = useState(null);
  const [currentWordText, setCurrentWordText] = useState("");
  const [editMeaning, setEditMeaning] = useState("");

  const [loadingMessage, setLoadingMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);

  const fileInputRef = useRef(null);

  // ----- Notifications -----
  const showNotification = (message, type = "info", duration = 5000) => {
    const id = notificationIdRef.current++;
    const notif = { id, message, type };
    setNotifications((prev) => [...prev, notif]);

    if (duration) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ----- Memory build -----
  const buildMemoryFromWords = (data) => {
    const mem = memoryRef.current;
    mem.buildMemory(data);
    decisionTreeRef.current.categorizeWords(data);
    setMemoryStats(mem.getStats());
  };

  // ----- Load vocabulary -----
    // ----- Load vocabulary từ Flask backend (/api/words) -----
  const loadVocabulary = useCallback(async () => {
    try {
      setLoadingMessage("Đang tải từ vựng...");
      console.log("📥 Đang tải từ vựng từ API...");

      // Gọi đúng endpoint của Flask: /api/words
      const result = await apiCall("/api/words");

      // Hỗ trợ nhiều kiểu response: array trực tiếp, {data: [...]}, {words: [...]}
      let data;
      if (Array.isArray(result)) {
        data = result;
      } else if (Array.isArray(result?.data)) {
        data = result.data;
      } else if (Array.isArray(result?.words)) {
        data = result.words;
      } else {
        data = [];
      }

      // Chuẩn hóa dữ liệu về dạng mà UI đang dùng
      const normalized = data.map((item, idx) => ({
        id: item.id ?? idx,                         // nếu backend chưa có id thì dùng idx
        word: item.word,
        meaning: item.meaning || item.definition || "",
        source: item.source || "Thủ công",
        createdAt: item.createdAt || null,
      }));

      setWords(normalized);
      buildMemoryFromWords(normalized);

      console.log(`✅ Đã tải ${normalized.length} từ từ server`);
    } catch (error) {
      console.error("❌ Lỗi tải từ vựng:", error);
      showNotification(
        "Không thể kết nối đến server. Vui lòng kiểm tra backend.",
        "error"
      );
    } finally {
      setLoadingMessage("");
    }
  }, []);

  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  // ----- Search -----
  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      showNotification("Vui lòng nhập từ cần tìm", "error");
      return;
    }

    try {
      let results = [];
      const mem = memoryRef.current;

      if (mem && mem.indexed) {
        results = mem.search(term, {
          exact: exactMatch,
          includeMeanings: includeMeanings,
        });
      }

      // Nếu bộ nhớ không có hoặc không tìm thấy gì, thử gọi API tìm kiếm
      if (!results || results.length === 0) {
        try {
          const res = await apiCall(
            `/vocabulary/search?q=${encodeURIComponent(term)}`
          );
          results = res.data || [];
        } catch (err) {
          console.error("❌ Lỗi API search:", err);
        }
      }

      setSearchResults(results || []);

      let similar = [];
      if (mem && mem.indexed) {
      similar = mem.suggestSimilar(term, 3) || [];
      }
      const ctxSug = decisionTreeRef.current.suggestByContext(term, 2) || [];

      setSimilarSuggestions(similar);
      setContextSuggestions(ctxSug);
    } catch (error) {
      console.error("❌ Lỗi tìm kiếm:", error);
      showNotification("Lỗi tìm kiếm: " + error.message, "error");
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // ----- Document processing -----
  const extractWords = (text) => {
    if (!text) return [];

    const wordsExtracted = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word, index, array) => array.indexOf(word) === index);

    return wordsExtracted;
  };

  const processDocumentText = async (input) => {
    showNotification("🔍 Đang xử lý tài liệu...", "info");

    let wordsFromText = [];

    if (Array.isArray(input)) {
      wordsFromText = input;
    } else if (typeof input === "string") {
      wordsFromText = extractWords(input);
    } else {
      throw new Error("Định dạng dữ liệu không hợp lệ");
    }

    console.log(`📝 Tìm thấy ${wordsFromText.length} từ tiềm năng`);

    const existingWordSet = new Set(
      (words || []).map((w) => w.word.toLowerCase())
    );

    const newWords = wordsFromText.filter(
      (w) => w && w.trim() && !existingWordSet.has(w.toLowerCase().trim())
    );

    console.log(`🆕 Có ${newWords.length} từ mới để thêm`);

    if (newWords.length === 0) {
      showNotification("ℹ️ Không có từ mới để thêm", "info");
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const w of newWords) {
      try {
        if (
          words.some(
            (item) => item.word.toLowerCase() === w.toLowerCase().trim()
          )
        ) {
          console.log(`ℹ️ Từ "${w}" đã tồn tại, bỏ qua`);
          skippedCount++;
          continue;
        }

        await apiCall("/vocabulary", {
          method: "POST",
          body: JSON.stringify({
            word: w,
            meaning: "",
            example: `Từ được trích xuất từ tài liệu: ${w}`,
            source: "decision-tree",
          }),
        });

        addedCount++;
      } catch (error) {
        console.log(`⚠️ Lỗi với từ "${w}":`, error.message);
        skippedCount++;
      }
    }

    await loadVocabulary();

    console.log(
      `🎉 Đã thêm ${addedCount} từ mới, bỏ qua ${skippedCount} từ trùng`
    );
    showNotification(`🎉 Hoàn thành! Đã thêm ${addedCount} từ mới`, "success");
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    console.log("📄 Đã chọn file:", file.name);
    setSelectedFile(file);
    setFileName(file.name);
  };

  //=============DÙNG API GIẢ====================
const handleProcessFile = async () => {
  if (!selectedFile) {
    showNotification("Vui lòng chọn file tài liệu trước", "error");
    return;
  }

  try {
    setLoadingMessage("Đang xử lý file...");

    // ===== MOCK: không gọi backend, tự tạo text mẫu =====
    if (USE_MOCK_API) {
      const mockText =
        "classification algorithm database induction decision tree learning mining analysis computer science machine learning data structure";
      await processDocumentText(mockText);
      showNotification(
        "✅ Đã xử lý file (mock) và thêm các từ mẫu vào từ vựng",
        "success"
      );
      return;
    }

    // ===== THẬT: gọi backend khi tắt mock =====
    const formData = new FormData();
    formData.append("document", selectedFile);

    const response = await fetch(`${API_BASE}/process-document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data && result.data.extractedWords) {
      await processDocumentText(result.data.extractedWords.join(" "));
      showNotification(
        `✅ Đã xử lý file thành công! Tìm thấy ${result.data.extractedWords.length} từ`,
        "success"
      );
    } else {
      throw new Error("Không thể trích xuất từ vựng từ file");
    }
  } catch (error) {
    console.error("❌ Lỗi xử lý file:", error);
    showNotification(`❌ Lỗi xử lý file: ${error.message}`, "error");
  } finally {
    setLoadingMessage("");
  }
};

//====================DÙNG API GIẢ=======================
  // ----- Word edit/add -----
  const openModalForWord = (wordObj) => {
    setCurrentWordId(wordObj.id || null);
    setCurrentWordText(wordObj.word || "");
    setEditMeaning(wordObj.meaning || "");
    setModalOpen(true);
  };

  const openModalForNewWord = (wordText) => {
    setCurrentWordId(null);
    setCurrentWordText(wordText);
    setEditMeaning("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentWordId(null);
    setCurrentWordText("");
    setEditMeaning("");
  };

  const handleSaveMeaning = async () => {
    const word = currentWordText;
    const meaning = (editMeaning || "").trim();

    if (!word) {
      alert("❌ Lỗi: Không có từ nào được chọn!");
      return;
    }

    try {
      if (currentWordId) {
        await apiCall(`/vocabulary/${currentWordId}`, {
          method: "PUT",
          body: JSON.stringify({ meaning }),
        });
        showNotification(`✅ Đã cập nhật nghĩa cho "${word}"!`, "success");
      } else {
        await apiCall("/vocabulary", {
          method: "POST",
          body: JSON.stringify({ word, meaning }),
        });
        showNotification(`✅ Đã thêm từ "${word}"!`, "success");
      }

      await loadVocabulary();
      closeModal();
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleRemoveWord = async (id) => {
    const wordObj = words.find((w) => w.id === id);
    if (!wordObj) return;

    if (window.confirm(`Bạn có chắc muốn xóa từ "${wordObj.word}"?`)) {
      try {
        await apiCall(`/vocabulary/${id}`, {
          method: "DELETE",
        });
        showNotification(`✅ Đã xóa từ "${wordObj.word}"!`, "success");
        await loadVocabulary();
      } catch (error) {
        alert("❌ Lỗi xóa từ: " + error.message);
      }
    }
  };

  const showMemoryDetails = () => {
    if (!memoryStats) return;
    alert(
      `🧠 Thống kê bộ nhớ:\n` +
        `• Tổng số từ: ${memoryStats.totalWords}\n` +
        `• Đã index: ${memoryStats.indexed ? "Có" : "Chưa"}\n` +
        `• Chiều cao AVL: ${memoryStats.avlHeight}\n` +
        `• Dung lượng ước tính: ${memoryStats.memorySize}`
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="vocab-container">
      {/* Notifications */}
      <div style={notificationContainerStyle} id="notification-container">
        {notifications.map((n) => (
          <div
            key={n.id}
            style={getNotificationStyle(n.type)}
            className={`notification ${n.type}`}
          >
            <span>{n.message}</span>
            <button
              onClick={() => dismissNotification(n.id)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: 18,
                cursor: "pointer",
                padding: 0,
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <h1>📚 Vocab Master</h1>
        <p>Ứng dụng học từ vựng thông minh dựa trên Decision Tree & AVL Tree</p>
      </header>

      {/* Search Section */}
      <section className="search-section">
        <h3>🔍 Tìm kiếm từ vựng</h3>
        <div className="search-box">
          <input
            type="text"
            id="searchInput"
            placeholder="Nhập từ cần tìm..."
            style={{ fontSize: 16, padding: "8px 11px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button id="searchBtn" className="btn-primary" onClick={handleSearch}>
            🔍
          </button>
        </div>
        <div className="search-filters">
          <label>
            <input
              type="checkbox"
              id="exactMatch"
              checked={exactMatch}
              onChange={(e) => setExactMatch(e.target.checked)}
            />{" "}
            Khớp chính xác
          </label>
          <label>
            <input
              type="checkbox"
              id="includeMeanings"
              checked={includeMeanings}
              onChange={(e) => setIncludeMeanings(e.target.checked)}
            />{" "}
            Bao gồm nghĩa
          </label>
        </div>
      </section>

      {/* Search Results Section */}
      <section className="search-results">
        <h3>📚 Kết quả tìm kiếm</h3>
        <div id="searchResults">
          {isSearchListEmpty && !searchTerm && (
            <div className="no-results">
              <p>Nhập từ cần tìm kiếm để xem kết quả</p>
            </div>
          )}

          {searchTerm && searchResults.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#666",
                background: "#f9f9f9",
                borderRadius: 8,
              }}
            >
              <p style={{ marginBottom: 15 }}>
                🔍 Không tìm thấy kết quả cho{" "}
                <strong>"{searchTerm}"</strong>
              </p>
              <button
                className="btn-primary"
                style={{
                  padding: "10px 20px",
                  background: "#27ae60",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                }}
                onClick={() => openModalForNewWord(searchTerm)}
              >
                ➕ Thêm từ "{searchTerm}"
              </button>
            </div>
          )}

          {searchResults &&
            searchResults.length > 0 &&
            searchResults.map((item) => (
              <div
                key={item.id || item.word}
                style={{
                  border: "2px solid #3498db",
                  borderRadius: 10,
                  padding: 20,
                  margin: "15px 0",
                  background: "#f8f9fa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0, color: "#2c3e50" }}>{item.word}</h3>
                  <span
                    style={{
                      background: "#2ecc71",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: 15,
                      fontSize: 12,
                    }}
                  >
                    {item.source === "decision-tree" ? "Decision Tree" : "Thủ công"}
                  </span>
                </div>
                <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>
                  {item.meaning || "Chưa có nghĩa"}
                </p>
                <div
                  style={{ marginTop: 15, display: "flex", gap: 10 }}
                >
                  <button
                    onClick={() => openModalForWord(item)}
                    style={{
                      background: "#f39c12",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: 5,
                      cursor: "pointer",
                    }}
                  >
                    ✏️{" "}
                    {item.meaning ? "Sửa nghĩa" : "Thêm nghĩa"}
                  </button>
                  <button
                    onClick={() =>
                      item.id && handleRemoveWord(item.id)
                    }
                    style={{
                      background: "#e74c3c",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: 5,
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}

          {(similarSuggestions.length > 0 ||
            contextSuggestions.length > 0) && (
            <div
              style={{
                marginTop: 20,
                padding: 15,
                background: "#f0f8ff",
                borderRadius: 8,
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  color: "#2c3e50",
                }}
              >
                💡 Gợi ý tìm kiếm
              </h4>

              {similarSuggestions.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Từ tương tự:</strong>{" "}
                  {similarSuggestions.map((word) => (
                    <span
                      key={`sim-${word.id || word.word}`}
                      style={{
                        cursor: "pointer",
                        color: "#3498db",
                        marginRight: 10,
                      }}
                      onClick={() => {
                        setSearchTerm(word.word);
                        setTimeout(() => handleSearch(), 0);
                      }}
                    >
                      {word.word}
                    </span>
                  ))}
                </div>
              )}

              {contextSuggestions.length > 0 && (
                <div>
                  <strong>Gợi ý theo ngữ cảnh:</strong>{" "}
                  {contextSuggestions.map((word) => (
                    <span
                      key={`ctx-${word.id || word.word}`}
                      style={{
                        cursor: "pointer",
                        color: "#e67e22",
                        marginRight: 10,
                      }}
                      onClick={() => {
                        setSearchTerm(word.word);
                        setTimeout(() => handleSearch(), 0);
                      }}
                    >
                      {word.word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* File Upload Section */}
      <div className="file-upload-section">
        <h3>📁 Nhập tài liệu học tập</h3>

        <button
          id="uploadBtn"
          className="btn-primary"
          style={{ padding: "15px 30px", fontSize: 16 }}
          onClick={handleFileButtonClick}
        >
          📄 Chọn file tài liệu
        </button>
        <input
          type="file"
          id="documentInput"
          accept=".pdf,.txt,.doc,.docx"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className="file-info">
          <p>
            Đã chọn: <span id="fileName">{fileName}</span>
          </p>
          <button
            id="processBtn"
            className="btn-primary"
            onClick={handleProcessFile}
          >
            Xử lý tài liệu
          </button>
        </div>
      </div>

      {/* Vocabulary Display Section */}
      <section className="vocabulary-display">
        <div
          className="memory-stats"
          style={{
            marginTop: 15,
            padding: 12,
            background: "#e8f4fd",
            borderRadius: 8,
            fontSize: 13,
            color: "#2c3e50",
          }}
        >
          <strong>🧠 Bộ nhớ từ vựng:</strong>{" "}
          <span id="memoryStats">
            {memoryStats
              ? `${memoryStats.totalWords} từ | AVL cao ${memoryStats.avlHeight} | Bộ nhớ: ${memoryStats.memorySize} | ${
                  memoryStats.indexed ? "✅ Đã index" : "❌ Chưa index"
                }`
              : "Đang tải..."}
          </span>
        </div>

        <div className="section-header">
          <h3>📖 Từ vựng đã học</h3>
          {/* Nút export để sau có thể xử lý */}
          <button id="exportBtn" className="btn-secondary">
            Xuất từ vựng
          </button>
        </div>

        <div className="word-list" id="wordList">
          {(!words || words.length === 0) && (
            <div className="empty-state">
              <p>📝 Chưa có từ vựng nào</p>
              <p>Hãy upload file hoặc thêm từ mới để bắt đầu!</p>
            </div>
          )}

          {words &&
            words.length > 0 &&
            words.map((item) => {
              const hasMeaning =
                item.meaning && item.meaning.trim() !== "";
              return (
                <div
                  key={item.id || item.word}
                  className="word-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 15,
                    borderBottom: "1px solid #eee",
                    background: "white",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#2c3e50",
                          fontSize: 18,
                        }}
                      >
                        {item.word}
                      </div>
                      <span
                        className="source-badge"
                      >
                        {item.source === "decision-tree"
                          ? "Decision Tree"
                          : "Thủ công"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#7f8c8d",
                      }}
                    >
                      {hasMeaning ? (
                        <span className="status-badge status-has-meaning">
                          ✓ Đã có nghĩa
                        </span>
                      ) : (
                        <span className="status-badge status-no-meaning">
                          ✗ Chưa có nghĩa
                        </span>
                      )}
                      {" • Thêm: "}
                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </div>
                    {hasMeaning && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          background: "#f8f9fa",
                          borderRadius: 4,
                          borderLeft: "3px solid #27ae60",
                        }}
                      >
                        <strong>Nghĩa:</strong> {item.meaning}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => openModalForWord(item)}
                      style={{
                        background: "#f39c12",
                        color: "white",
                        border: "none",
                        padding: "8px 15px",
                        borderRadius: 5,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ✏️ {hasMeaning ? "Sửa nghĩa" : "Thêm nghĩa"}
                    </button>
                    <button
                      onClick={() =>
                        item.id && handleRemoveWord(item.id)
                      }
                      style={{
                        background: "#e74c3c",
                        color: "white",
                        border: "none",
                        padding: "8px 15px",
                        borderRadius: 5,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="memory-section" style={{ marginTop: 20 }}>
          <div
            className="memory-stats"
            style={{
              padding: 12,
              background: "#e8f4fd",
              borderRadius: 8,
              fontSize: 13,
              color: "#2c3e50",
              cursor: "pointer",
            }}
            onClick={showMemoryDetails}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>🧠 Bộ nhớ từ vựng:</strong>{" "}
                <span id="memoryStats">
                  {memoryStats
                    ? `${memoryStats.totalWords} từ | AVL cao ${memoryStats.avlHeight} | Bộ nhớ: ${memoryStats.memorySize} | ${
                        memoryStats.indexed ? "✅ Đã index" : "❌ Chưa index"
                      }`
                    : "Đang tải..."}
                </span>
              </div>
              <div
                style={{
                  color: "#3498db",
                  fontSize: 11,
                }}
              >
                📊 Click để xem chi tiết
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Word Modal */}
      {modalOpen && (
        <div
          id="editModal"
          className="modal modal-show"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
          }}
        >
          <div
            className="modal-content"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              padding: 30,
              borderRadius: 20,
              width: 500,
              maxWidth: "90vw",
              boxShadow: "0 0 30px rgba(0,0,0,0.5)",
            }}
          >
            <h4>Thêm/Sửa nghĩa của từ</h4>
            <input
              type="text"
              id="editWord"
              readOnly
              className="form-input"
              value={currentWordText}
              style={{ width: "100%", marginBottom: 10 }}
            />
            <textarea
              id="editMeaning"
              placeholder={
                editMeaning
                  ? `Sửa nghĩa của từ "${currentWordText}"...`
                  : `Thêm nghĩa cho từ "${currentWordText}"...`
              }
              className="form-textarea"
              value={editMeaning}
              onChange={(e) => setEditMeaning(e.target.value)}
              style={{
                width: "100%",
                minHeight: 100,
                marginBottom: 15,
              }}
            />
            <div
              className="modal-buttons"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                id="cancelEdit"
                className="btn-secondary"
                onClick={closeModal}
              >
                Hủy
              </button>
              <button
                id="saveMeaning"
                className="btn-primary"
                onClick={handleSaveMeaning}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingMessage && (
        <div
          id="loadingOverlay"
          className="loading-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9998,
            fontSize: 18,
          }}
        >
          <div
            className="spinner"
            style={{
              border: "4px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              borderTop: "4px solid white",
              width: 50,
              height: 50,
              animation: "spin 1s linear infinite",
              marginBottom: 15,
            }}
          ></div>
          <p>{loadingMessage}</p>
        </div>
      )}
    </div>
  );
};

export default App;
