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

// ==================== API HELPER ====================

const USE_MOCK_API = false;
const API_BASE = "http://127.0.0.1:5000";

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
  if (USE_MOCK_API) {
    console.log("📡 [MOCK API]", endpoint, options);
    const method = (options.method || "GET").toUpperCase();

    await new Promise((resolve) => setTimeout(resolve, 300));

    if ((endpoint === "/vocabulary" || endpoint === "/api/words") && method === "GET") {
      return { data: mockVocabulary };
    }

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

    return {};
  }

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
  const isSearchListEmpty = !searchResults || searchResults.length === 0;
  const memoryRef = useRef(new VocabularyMemory());
  const decisionTreeRef = useRef(new DecisionTree());
  const [memoryStats, setMemoryStats] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  const [includeMeanings, setIncludeMeanings] = useState(true);
  const [similarSuggestions, setSimilarSuggestions] = useState([]);
  const [contextSuggestions, setContextSuggestions] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");

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
  const loadVocabulary = useCallback(async () => {
    try {
      setLoadingMessage("Đang tải từ vựng (local)...");
      console.log("📥 Backend hiện chưa có API lấy toàn bộ danh sách từ. Dùng mockVocabulary để hiển thị.");

      const normalized = mockVocabulary.map((item, idx) => ({
        id: item.id ?? idx,
        word: item.word,
        meaning: item.meaning || item.definition || "",
        source: item.source || "mock",
        createdAt: item.createdAt || null,
    }));

      setWords(normalized);
      buildMemoryFromWords(normalized);
  }   catch (error) {
      console.error("❌ Lỗi tải từ vựng:", error);
  }   finally {
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

      if (!results || results.length === 0) {
        try {
          const res = await apiCall(
            `/search?term=${encodeURIComponent(term)}`
          );
          if (res && res.found) {
      results = [
        {
          id: res.offset,
          word: res.term,
          meaning: res.definition || "",
          source: "backend",
          createdAt: null,
        },
      ];
    } else {
      results = [];
    }
  } catch (err) {
    console.error("❌ Lỗi API /search:", err);
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

        await apiCall("/insert", {
          method: "POST",
          body: JSON.stringify({
            term: w,
            definition: "",
            context: [],
             metadata: { source: "decision-tree", fromDocument: true },
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
    console.log("📄 File selected:", file.name);
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      showNotification("Vui lòng chọn file tài liệu trước", "error");
      return;
    }

    try {
      setLoadingMessage("Đang xử lý file...");

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
    const word = (currentWordText || "").trim();
    const meaning = (editMeaning || "").trim();

    if (!word) {
      alert("❌ Lỗi: Không có từ nào được chọn!");
      return;
    }
    if (!meaning) {
      showNotification("Vui lòng nhập nghĩa cho từ.", "error");
      return;
    }

    try {
      if (USE_MOCK_API) {
        if (currentWordId) {
          await apiCall(`/vocabulary/${currentWordId}`, {
            method: "PUT",
            body: JSON.stringify({ meaning }),
          });
        } else {
          await apiCall("/vocabulary", {
            method: "POST",
            body: JSON.stringify({ word, meaning }),
          });
        }
      } else {
         if (currentWordId) {
          await apiCall("/update", {
           method: "PUT",
            body: JSON.stringify({
              term: word,
              definition: meaning,
           }),
          });
        } else {
          await apiCall("/insert", {
            method: "POST",
            body: JSON.stringify({
              term: word,
              definition: meaning,
            }),
          });
        }
     }

      setWords((prev) => {
        const idx = prev.findIndex(
          (w) => w.word.toLowerCase() === word.toLowerCase()
        );
        let next;
        if (idx !== -1) {
          next = [...prev];
          next[idx] = {
            ...next[idx],
            meaning,
            source: "backend",
          };
        } else {
          const nextId =
            prev.length > 0 ? (prev[prev.length - 1].id || prev.length) + 1 : 1;
          next = [
            ...prev,
            {
              id: currentWordId || nextId,
              word,
              meaning,
              source: "backend",
              createdAt: null,
            },
          ];
        }
        buildMemoryFromWords(next);
        return next;
     });

      showNotification(`✅ Đã lưu nghĩa cho "${word}"!`, "success");
      closeModal();
    } catch (error) {
      console.error("❌ Lỗi khi lưu nghĩa:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleRemoveWord = async (word) => {
      if (!word) return;

  if (window.confirm(`Bạn có chắc muốn xóa từ "${word}"?`)) {
    try {
      if (USE_MOCK_API) {
      } else {
        await apiCall(`/delete?term=${encodeURIComponent(word)}`, {
          method: "DELETE",
        });
      }

      showNotification(`✅ Đã xóa từ "${word}"!`, "success");

      setWords((prev) => {
        const next = prev.filter(
          (w) => w.word.toLowerCase() !== word.toLowerCase()
        );
        buildMemoryFromWords(next);
        return next;
      });
    } catch (error) {
      console.error("❌ Lỗi xóa từ:", error);
      alert("❌ Lỗi xóa từ: " + error.message);
    }
  }
};

  const showMemoryDetails = () => {
    if (!memoryStats) return;
    alert(
      `🧠 Memory Statistics:\n` +
      `• Total words: ${memoryStats.totalWords}\n` +
      `• Indexed: ${memoryStats.indexed ? "Yes" : "Not yet"}\n` +
      `• AVL height: ${memoryStats.avlHeight}\n` +
      `• Estimated capacity: ${memoryStats.memorySize}`
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
        <p>Smart vocabulary learning application based on Decision Tree & AVL Tree</p>
      </header>

      {/* Split Layout Container */}
      <div className="split-container">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="panel-title">🔍 Search & Results</div>
          
          {/* Search Section - FIXED */}
          <section className="section search-section-fixed">
            <h3>Search Vocabulary</h3>
            <div className="search-box">
              <input
                type="text"
                id="searchInput"
                placeholder="Search English..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <button id="searchBtn" className="btn-primary" onClick={handleSearch}>
                🔍 Search
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
                 Exact match
              </label>
              <label>
                <input
                  type="checkbox"
                  id="includeMeanings"
                  checked={includeMeanings}
                  onChange={(e) => setIncludeMeanings(e.target.checked)}
                />{" "}
                 Include meanings
              </label>
            </div>
          </section>

          {/* Search Results Section */}
           <div className="scrollable-container">
          <section className="section scrollable-content">
            <h3>Search Results</h3>
            <div className="search-results-container" id="searchResults">
              {isSearchListEmpty && !searchTerm && (
                <div className="no-results">
                  <p>Enter a word to search to see results</p>
                </div>
              )}

              {searchTerm && searchResults.length === 0 && (
                <div className="no-results">
                  <p style={{ marginBottom: 15 }}>
                    🔍 Không tìm thấy kết quả cho{" "}
                    <strong>"{searchTerm}"</strong>
                  </p>
                  <button
                    className="btn-primary"
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
                    className="search-result-item"
                  >
                    <div className="result-header">
                      <h3 style={{ margin: 0, color: "#2c3e50" }}>{item.word}</h3>
                      <span className="source-badge">
                        {item.source === "decision-tree" ? "Decision Tree" : "Thủ công"}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>
                      {item.meaning || "Chưa có nghĩa"}
                    </p>
                    <div className="result-actions">
                      <button
                        onClick={() => openModalForWord(item)}
                        className="btn-secondary"
                      >
                        ✏️ {item.meaning ? "Edit meaning" : "Add meaning"}
                      </button>
                      <button
                        onClick={() => handleRemoveWord(item.word)}
                        className="btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}

              {(similarSuggestions.length > 0 ||
                contextSuggestions.length > 0) && (
                <div className="suggestions-section">
                  <h4 style={{ margin: "20px 0 10px 0", color: "#2c3e50" }}>
                    💡 Gợi ý tìm kiếm
                  </h4>

                  {similarSuggestions.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <strong>Từ tương tự:</strong>{" "}
                      {similarSuggestions.map((word) => (
                        <span
                          key={`sim-${word.id || word.word}`}
                          className="suggestion-link"
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
                          className="suggestion-link context"
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
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="panel-title">📚 Document & Vocabulary</div>
          
          {/* File Upload Section - FIXED */}
          <section className="file-upload-section upload-section-fixed">
            <h3>Import Learning Document</h3>

            <button
              id="uploadBtn"
              className="btn-primary"
              onClick={handleFileButtonClick}
            >
              📄 Choose document file
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
                Selected: <span id="fileName">{fileName}</span>
              </p>
              <button
                id="processBtn"
                className="btn-primary"
                onClick={handleProcessFile}
              >
                Process document
              </button>
            </div>
          </section>

          {/* Vocabulary Display Section - SCROLLABLE  */}
          <div className="scrollable-container">
          <section className="vocabulary-display scrollable-content">
            <h3>Learned Vocabulary</h3>
            
            <div className="memory-stats" onClick={showMemoryDetails}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>🧠 Vocabulary Memory:</strong>{" "}
                  <span id="memoryStats">
                    {memoryStats
                      ? `${memoryStats.totalWords} words | AVL height ${memoryStats.avlHeight} | Memory: ${memoryStats.memorySize} | ${
                          memoryStats.indexed ? "✅ Indexed" : "❌ Not indexed"
                        }`
                      : "Loading..."}
                  </span>
                </div>
                <div style={{ color: "#3498db", fontSize: 11 }}>
                  📊 Click to view details
                </div>
              </div>
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
                  const hasMeaning = item.meaning && item.meaning.trim() !== "";
                  return (
                    <div
                      key={item.id || item.word}
                      className="word-item"
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: 18 }}>
                            {item.word}
                          </div>
                          <span className="source-badge">
                            {item.source === "decision-tree" ? "Decision Tree" : "Thủ công"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#7f8c8d" }}>
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
                            ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </div>
                        {hasMeaning && (
                          <div className="meaning-preview">
                            <strong>Nghĩa:</strong> {item.meaning}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => openModalForWord(item)}
                          className="btn-secondary"
                        >
                          ✏️ {hasMeaning ? "Edit" : "Add"}
                        </button>
                        <button
                          onClick={() => handleRemoveWord(item.word)}
                          className="btn-danger"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      </div>
      </div>

      {/* Edit Word Modal */}
      {modalOpen && (
        <div id="editModal" className="modal modal-show">
          <div className="modal-content">
            <h4>Add/Edit word meaning</h4>
            <input
              type="text"
              id="editWord"
              readOnly
              className="form-input"
              value={currentWordText}
            />
            <textarea
              id="editMeaning"
              placeholder={
                editMeaning
                  ? `Edit meaning of word "${currentWordText}"...`
                  : `Add meaning for word "${currentWordText}"...`
              }
              className="form-textarea"
              value={editMeaning}
              onChange={(e) => setEditMeaning(e.target.value)}
            />
            <div className="modal-buttons">
              <button id="cancelEdit" className="btn-secondary" onClick={closeModal}>
                Hủy
              </button>
              <button id="saveMeaning" className="btn-primary" onClick={handleSaveMeaning}>
                Lưu
              </button>
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

export default App;