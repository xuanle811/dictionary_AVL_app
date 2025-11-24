// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [words, setWords] = useState([]);
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [message, setMessage] = useState('');

  const API_BASE = "http://127.0.0.1:5000"; // Flask backend

    // ==== Hàm tải danh sách từ
  const loadWords = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/words`);
      setWords(res.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const searchWord = async () => {
    try {
      const response = await axios.get(`${API_BASE}/search_word?word=${word}`);
      setDefinition(response.data.definition);
      setMessage('');
    } catch (error) {
      setMessage('Word not found');
    }
  };

  const addWord = async () => {
    try {
      await axios.post(`${API_BASE}/add_word`, {
        word,
        definition
      });
      setMessage('Word added successfully');
      setWord('');
      setDefinition('');
      loadWords(); // cập nhật danh sách
    } catch (error) {
      setMessage('Error adding word');
    }
  };

  // ===== Xóa từ =====
  const deleteWord = async (wordToDelete) => {
    if (!window.confirm(`Bạn có chắc muốn xóa từ "${wordToDelete}" không?`)) return;
    try {
      await axios.delete(`${API_BASE}/delete_word`, {
        params: { word: wordToDelete },
      });
      setMessage(`Đã xóa từ "${wordToDelete}"`);
      loadWords(); // tải lại danh sách
    } catch (err) {
      console.error("Lỗi khi xóa từ:", err);
      alert("Không thể xóa từ!");
    }
  };


  // sửa từ
  // Thêm state tạm để lưu từ đang sửa
const [editingWord, setEditingWord] = useState(null);
const [editingDefinition, setEditingDefinition] = useState('');

// Hàm mở modal/form sửa
const startEdit = (word, definition) => {
  setEditingWord(word);
  setEditingDefinition(definition);
};

// Hàm gửi sửa từ lên backend
const saveEdit = async () => {
  try {
    await axios.put(`${API_BASE}/update_word`, {
      old_word: editingWord,
      new_word: editingWord, // giữ nguyên từ, chỉ sửa nghĩa; nếu muốn đổi từ thì input khác
      definition: editingDefinition
    });
    setEditingWord(null);
    setEditingDefinition('');
    loadWords();
    alert('Đã cập nhật từ thành công');
  } catch (err) {
    console.error(err);
    alert('Không thể cập nhật từ');
  }
};


  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">📘 TỪ ĐIỂN AVL TREE</h2>

      {/* Nhập từ mới */}
      <div className="card p-3 mb-4">
        <div className="row g-2">
          <div className="col-md-4">
            <input
              type="text"
              placeholder="Nhập từ..."
              className="form-control"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <input
              type="text"
              placeholder="Nghĩa của từ..."
              className="form-control"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button onClick={addWord} className="btn btn-primary px-4">
              Thêm
            </button>
          </div>
        </div>
      </div>


      <div className="card p-3 mb-4">
      <div className="row g-2 align-items-center">
        <div className="col-md-8">
          <input
            type="text"
            placeholder="Nhập từ cần tìm..."
            className="form-control"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchWord(); }} // Nhấn Enter cũng tìm
          />
        </div>
        <div className="col-md-4">
          <button className="btn btn-info px-4" onClick={searchWord}>
            🔍 Tìm
          </button>
        </div>
      </div>

      {/* Hiển thị kết quả tìm kiếm */}
      {word && (
        <div className="mt-3">
          {message ? (
            <p className="text-danger">{message}</p>
          ) : definition ? (
            <p><strong>{word}:</strong> {definition}</p>
          ) : null}
        </div>
      )}
    </div>

      {/* Bảng hiển thị danh sách */}
      <table className="table table-bordered table-hover">
        <thead className="table-dark text-center">
          <tr>
            <th style={{ width: "25%" }}>Từ</th>
            <th style={{ width: "60%" }}>Nghĩa</th>
            <th style={{ width: "15%" }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {words.length > 0 ? (
            words.map((w) => (
              <tr key={w.word}>
                <td>{w.word}</td>
                <td>
                  {editingWord === w.word ? (
                    <input
                      type="text"
                      value={editingDefinition}
                      onChange={(e) => setEditingDefinition(e.target.value)}
                      className="form-control"
                    />
                  ) : (
                    w.definition
                  )}
                </td>
                <td className="text-center">
                  {editingWord === w.word ? (
                    <>
                      <button className="btn btn-success btn-sm me-1" onClick={saveEdit}>Lưu</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingWord(null)}>Hủy</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-warning btn-sm me-1" onClick={() => startEdit(w.word, w.definition)}>Sửa</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteWord(w.word)}>Xóa</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">Chưa có từ nào trong từ điển.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
