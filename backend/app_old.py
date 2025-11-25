# backend/app.py

from flask import Flask, request, jsonify
import os
from flask_cors import CORS
from avl_tree import AVLTree, AVLNode
import sqlite3
from pdf_processing import process_multi_pdfs
from io import BytesIO
from werkzeug.utils import secure_filename
app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


CORS(app)
# Xác định đường dẫn tuyệt đối đến database trong thư mục backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "dictionary.db")





# Kết nối SQLite
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ==== Khởi tạo database==========

tree = AVLTree()
# Nạp dữ liệu từ database vào cây AVL khi khởi động
def load_data_to_tree():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT word FROM words")
    rows = c.fetchall()
    for row in rows:
        tree.root = tree.insert(tree.root, row[0])
    conn.close()

# Gọi hàm nạp dữ liệu ngay khi Flask khởi động
load_data_to_tree()

# ===API extract terms
@app.route("/api/process-pdfs", methods=["POST"])
def upload_pdfs():
    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")
    saved_paths = []

    # Lưu tất cả file trước khi xử lý
    for f in files:
        filename = secure_filename(f.filename)
        path = os.path.join(UPLOAD_FOLDER, filename)
        f.save(path)
        saved_paths.append(path)

    # Gọi xử lý nhiều PDF
    results = process_multi_pdfs(saved_paths, dictpath="data/dict.json")

    return jsonify(results), 200


# ===== API: Lấy tất cả từ =====
@app.route('/api/words', methods=['GET'])
def get_words():
    conn = get_db()
    words = conn.execute('SELECT * FROM words').fetchall()
    conn.close()
    return jsonify([dict(w) for w in words])


# API thêm từ
@app.route('/add_word', methods=['POST'])
def add_word():
    word = request.json['word']
    definition = request.json['definition']
    
    # Thêm từ vào cây AVL
    tree.root = tree.insert(tree.root, word)
    
    # Thêm vào SQLite
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO words (word, definition) VALUES (?, ?)", (word, definition))

    conn.commit()
    
    return jsonify({'message': 'Word added successfully'}), 201

################## API xóa từ
@app.route('/delete_word', methods=['DELETE'])
def delete_word():
    word = request.args.get('word')

    if not word:
        return jsonify({'message': 'Missing word parameter'}), 400

    # Xóa từ trong cây AVL
    node = tree.search(tree.root, word)
    if node is None:
        return jsonify({'message': 'Word not found in AVL tree'}), 404

    tree.root = tree.delete(tree.root, word)

    # Xóa từ trong SQLite
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM words WHERE word=?", (word,))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Word "{word}" deleted successfully'}), 200


@app.route('/search_word', methods=['GET'])
def search_word():
    word = request.args.get('word')
    
    # Tìm từ trong cây AVL
    node = tree.search(tree.root, word)
    if node:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT definition FROM words WHERE word=?", (word,))
        definition = c.fetchone()[0]
        return jsonify({'word': word, 'definition': definition})
    return jsonify({'message': 'Word not found'}), 404

@app.route('/update_word', methods=['PUT'])
def update_word():
    data = request.get_json()
    old_word = data.get('old_word')  # từ cũ
    new_word = data.get('new_word')  # từ mới (có thể giống cũ)
    new_definition = data.get('definition')

    if not old_word or not new_word or not new_definition:
        return jsonify({'message': 'Missing parameters'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM words WHERE word=?", (old_word,))
    result = c.fetchone()
    if not result:
        conn.close()
        return jsonify({'message': 'Word not found'}), 404

    # Cập nhật trong DB
    c.execute("UPDATE words SET word=?, definition=? WHERE word=?", (new_word, new_definition, old_word))
    conn.commit()
    conn.close()

    # Cập nhật trong cây AVL
    tree.root = tree.delete(tree.root, old_word)
    tree.root = tree.insert(tree.root, new_word)

    return jsonify({'message': f'Word "{old_word}" updated successfully'}), 200



# ===== Route gốc (chỉ để test) =====
@app.route('/')
def home():
    return 'Flask backend đang hoạt động! Thử truy cập /api/words'


if __name__ == '__main__':
    app.run(debug=True)
