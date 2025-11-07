// AppSang.js
import React, { useState } from "react";

export default function AppSang() {
  const [file, setFile] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  // JSON mẫu giả lập
  const sampleData = [
    { word: "algorithm", definition: "A step-by-step procedure for solving a problem." },
    { word: "data", definition: "Facts and statistics collected for reference or analysis." },
    { word: "network", definition: "An arrangement of intersecting lines or connections." },
  ];

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    if (uploadedFile) {
      // Giả lập quá trình trích xuất
      setLoading(true);
      setTimeout(() => {
        setWords(sampleData);
        setLoading(false);
      }, 1500);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tự động trích xuất từ điển chuyên ngành</h1>

      {/* Nút upload file */}
      <div style={styles.uploadBox}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={styles.fileInput}
        />
        {file && <p>Đã chọn: {file.name}</p>}
      </div>

      {/* Trạng thái tải */}
      {loading && <p>Đang trích xuất từ khóa...</p>}

      {/* Kết quả */}
      {!loading && words.length > 0 && (
        <div style={styles.resultBox}>
          <h2>Kết quả trích xuất</h2>
          <ul style={styles.wordList}>
            {words.map((item, index) => (
              <li key={index} style={styles.wordItem}>
                <strong>{item.word}</strong>: {item.definition}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// ---- CSS inline styles ----
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "700px",
    margin: "30px auto",
    textAlign: "center",
  },
  title: {
    color: "#2c3e50",
  },
  uploadBox: {
    border: "2px dashed #3498db",
    borderRadius: "10px",
    padding: "30px",
    background: "#ecf0f1",
    cursor: "pointer",
  },
  fileInput: {
    marginBottom: "10px",
  },
  resultBox: {
    marginTop: "30px",
    textAlign: "left",
    background: "#f8f9fa",
    padding: "20px",
    borderRadius: "10px",
  },
  wordList: {
    listStyle: "none",
    padding: 0,
  },
  wordItem: {
    marginBottom: "10px",
  },
};
