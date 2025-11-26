from flask import Flask, request, jsonify
import os
import json
from avl.tree import AVLTree
from avl.node import AVLNode
from flask_cors import CORS
from werkzeug.utils import secure_filename

from services.loader import load_terms_index
from services.auto_save import auto_save
from services.tree_binary import save_avl, load_avl
from services.info_loader import load_info_by_offset
from pdf_processing import process_multi_pdfs
app = Flask(__name__)
CORS(app, resources = {r"/*": {"origins": "*"}})
# CÂY AVL LƯU TRONG RAM

tree = AVLTree()
root = None
max_offset = -1   # tự tăng offset
INFO_PATH = "data/terms_info.json"
if not os.path.exists(INFO_PATH):
    with open(INFO_PATH, "w", encoding="utf-8") as f:
        json.dump({}, f)
with open("data/terms_info.json", "r", encoding="utf-8") as f:
    TERMS_INFO = {item["offset"]: item for item in json.load(f)}

# 1. UPLOAD → BUILD AVL TREE → SAVE avl.bin


# @app.route("/upload", methods=["POST"])
# def upload_terms():
#     global tree, root, max_offset

#     # Nếu đã có avl.bin → KHÔNG RESET CÂY
#     if os.path.exists("data/avl.bin"):
#         return jsonify({
#             "error": "Từ điển đã tồn tại. Không được upload lại để tránh mất dữ liệu.",
#             "hint": "Hãy dùng /sync_terms để cập nhật từ mới."
#         }), 409

#     if "terms_index" not in request.files:
#         return jsonify({"error": "Thiếu file terms_index"}), 400

#     file = request.files["terms_index"]

#     try:
#         index_data = json.load(file)
#     except:
#         return jsonify({"error": "File JSON không hợp lệ"}), 400

#     # Build cây mới lần đầu
#     tree = AVLTree()
#     root = None
#     max_offset = -1

#     for item in index_data:
#         term = item["term"]
#         offset = item["offset"]

#         node = AVLNode(term=term, offset=offset)
#         root = tree.insert(root, node)
#         max_offset = max(max_offset, offset)

#     # Lưu cây khởi tạo
#     save_avl(root, "data/avl.bin")

#     return jsonify({
#         "message": "Tạo cây AVL ban đầu + lưu avl.bin thành công",
#         "total_nodes": len(index_data)
#     })

# def upload_terms():
#     global tree, root, max_offset

#     # Nếu đã có avl.bin → không cho upload lại
#     if os.path.exists("data/avl.bin"):
#         return jsonify({
#             "error": "Từ điển đã tồn tại. Không được upload lại để tránh mất dữ liệu.",
#             "hint": "Hãy dùng API /sync_terms để cập nhật từ mới vào từ điển."
#         }), 409

#     # # Kiểm tra file
#     # if "terms_index" not in request.files:
#     #     return jsonify({"error": "Thiếu file terms_index"}), 400

#     # index_file = request.files["terms_index"]

#     # Lấy index_data từ file pdf được extract
#     try:
#         index_data = extract_pdfs()
#     except:
#         return jsonify({"error": "File JSON không hợp lệ"}), 400

#     # Reset cây lần đầu (không lo mất dữ liệu vì chưa có avl.bin)
#     tree = AVLTree()
#     root = None
#     max_offset = -1

#     # Build lại AVL
#     for item in index_data:
#         term = item["term"]
#         offset = item["offset"]

#         node = AVLNode(term=term, offset=offset)  # chỉ term + offset
#         root = tree.insert(root, node)

#         if offset > max_offset:
#             max_offset = offset

#     # Lưu cây mới vào nhị phân
#     save_avl(root, "data/avl.bin")

#     return jsonify({
#         "message": "Upload & build AVL Tree thành công. Đã lưu avl.bin",
#         "total_nodes": len(index_data),
#         "max_offset": max_offset
#     })

# 2. API SEARCH (chính xác)


@app.route("/search", methods=["GET"])
def api_search():
    global root

    term = request.args.get("term")

    if not term:
        return jsonify({"error": "Thiếu term"}), 400

    node = tree.search(root, term)
    if not node:
        return jsonify({"found": False})

    # Lấy info theo offset
    info = TERMS_INFO.get(node.offset, None)

    return jsonify({
        "found": True,
        "term": node.term,
        "offset": node.offset,
        "definition": info.get("definition") if info else None,
        "context": info.get("context") if info else [],
        "metadata": info.get("metadata") if info else {}
    })

# 3. API FUZZY SEARCH


@app.route("/fuzzy_full", methods=["GET"])
def api_fuzzy_full():
    global root

    query = request.args.get("query", "").strip()
    print(request)
    threshold = int(request.args.get("threshold", 5))

    if not query:
        return jsonify({"error": "Thiếu query"}), 400

    # 1. Tìm gần đúng trong cây AVL
    fuzzy_terms = tree.fuzzy_search(root, query, threshold)

    results = []

    # 2. Lấy full info từ TERMS_INFO
    for term in fuzzy_terms:
        node = tree.search(root, term)
        if not node:
            continue

        info = TERMS_INFO.get(node.offset, {
            "definition": None,
            "context": [],
            "metadata": {}
        })

        results.append({
            "term": node.term,
            "offset": node.offset,
            "definition": info.get("definition"),
            "context": info.get("context"),
            "metadata": info.get("metadata")
        })

    return jsonify({
        "query": query,
        "threshold": threshold,
        "results": results,
        "total_results": len(results)
    })


# 4. LOAD AVL TREE ← avl.bin

# @app.route("/load_tree", methods=["GET"])
def load_tree():
    global root, tree

    bin_path = os.path.join(os.getcwd(), "data", "avl.bin")

    #Nếu chưa có file → trả về ROOT RỖNG, không lỗi
    if not os.path.exists(bin_path):
        root = None  # cây trống
        return root, None, None   # không error, không status code


    try:
        root = load_avl(bin_path)
    except Exception as e:
        return None,jsonify({
            "error": "Lỗi khi đọc avl.bin",
            "path": bin_path,
            "exception": str(e)
        }), 500

    # Đếm số node trong cây
    total_nodes = tree.count_nodes(root) if tree else 0

    json_results = jsonify({
        "message": "Load thành công AVL tree từ avl.bin",
        "path": bin_path,
        "total_nodes": total_nodes
    })

    return root, None, None

# 4.1. Hàm traverse cây AVL để lấy tất cả thuật ngữ
def inorder_traverse(node, results):
    if not node:
        return
    inorder_traverse(node.left, results)
    results.append({
        "id": getattr(node, "offset", None),
        "word": getattr(node, "term", ""),
        "definition": getattr(node, "definition", ""),
        "context": (getattr(node, "context", [""])) [0] if getattr(node, "context", None) else "",
        "source": "AVL tree",
        "createdAt": getattr(getattr(node, "metadata", None), "created_at", "")
    })
    inorder_traverse(node.right, results)

# 4.2. API xem toàn bộ từ
@app.route("/all-terms", methods=["GET"])
def api_get_all_terms():
    global root

    # Load AVL tree từ file bin
    root_node, error_response, status_code = load_tree()
    if error_response:
        return error_response, status_code
    results = []
    inorder_traverse(root_node, results)

    # print(results)

    return jsonify({
        "message": "Load và xuất toàn bộ từ thành công",
        "total_terms": len(results),
        "data": results
    })

# 4.3. Xem chi tiết từng từ dựa vào offset
@app.route("/term_info", methods=["GET"])
def api_term_info():
    offset = request.args.get("offset", type=int)
    if offset is None:
        return jsonify({"error": "Missing offset"}), 400

    info = load_info_by_offset("data/terms_info.json", offset)
    if info is None:
        return jsonify({"error": "Not found"}), 404
    print (info)
    return jsonify({"success": True, "data": info})


# 5. API INSERT

def next_offset():
    global max_offset
    max_offset += 1
    return max_offset

# API THÊM TỪ TỪ FILE terms_index.json


@app.route("/sync_terms", methods=["POST"])
def sync_terms():
    global tree, root, max_offset, TERMS_INFO

    data = request.json
    if "index_file" not in data or "info_file" not in data:
        return jsonify({"error": "Cần index_file và info_file"}), 400

    index_path = data["index_file"]
    info_path = data["info_file"]

    # đọc files
    with open(index_path, "r", encoding="utf-8") as f:
        new_index = json.load(f)

    with open(info_path, "r", encoding="utf-8") as f:
        new_info = {item["offset"]: item for item in json.load(f)}

    inserted = []
    updated = []

    for entry in new_index:
        term_new = entry["term"]
        offset_new = entry["offset"]

        node = tree.search(root, term_new)

        if node is None:

            # CASE 1 — chưa có trong AVL
            max_offset += 1
            node = AVLNode(term=term_new, offset=max_offset)
            root = tree.insert(root, node)
            inserted.append(term_new)

            # dùng info mới để tạo entry
            info_entry = new_info.get(offset_new, {})
            TERMS_INFO[max_offset] = {
                "offset": max_offset,
                "definition": info_entry.get("definition"),
                "context": info_entry.get("context", []),
                "metadata": info_entry.get("metadata", {})
            }

        else:

            # CASE 2 — đã có trong AVL
            updated.append(term_new)
            old_offset = node.offset
            info_entry = new_info.get(offset_new, {})

            # cập nhật info vào TERMS_INFO
            TERMS_INFO[old_offset]["definition"] = info_entry.get("definition")
            TERMS_INFO[old_offset]["context"] = info_entry.get("context", [])
            TERMS_INFO[old_offset]["metadata"] = info_entry.get("metadata", {})

    # AUTO-SAVE
    auto_save(root, TERMS_INFO)

    return jsonify({
        "message": "Đồng bộ thành công",
        "inserted": inserted,
        "updated": updated,
        "total_inserted": len(inserted),
        "total_updated": len(updated)
    })
# insert trên giao diện


@app.route("/insert_term", methods=["POST"])
def api_insert_term():
    global tree, root, max_offset, TERMS_INFO

    data = request.json
    if not data or "term" not in data:
        return jsonify({"error": "Cần JSON gồm {term, definition, context, metadata}"}), 400

    term = data["term"].strip()

    # 1. Check tồn tại trong AVL
    exists = tree.search(root, term)
    if exists:
        return jsonify({"error": "Term đã tồn tại"}), 409

    # 2. Tạo offset tự tăng
    max_offset += 1
    offset = max_offset

    # 3. Tạo node AVL
    new_node = AVLNode(term=term, offset=offset)
    root = tree.insert(root, new_node)

    # 4. Lưu FULL INFO vào TERMS_INFO
    TERMS_INFO[offset] = {
        "offset": offset,
        "definition": data.get("definition", None),
        "context": data.get("context", []),
        "metadata": data.get("metadata", {})
    }

    # 5. Auto-save
    save_avl(root, "data/avl.bin")

    with open("data/terms_info.json", "w", encoding="utf-8") as f:
        json.dump(list(TERMS_INFO.values()), f, ensure_ascii=False, indent=2)

    return jsonify({
        "message": "Insert thành công",
        "term": term,
        "offset": offset
    })

# 6. API Update trên giao diện;


@app.route("/update_term", methods=["PUT"])
def api_update_term():
    global tree, root, TERMS_INFO

    data = request.json
    if not data or "term" not in data:
        return jsonify({"error": "Cần JSON gồm {term, ...}"}), 400

    term = data["term"]

    # 1. Tìm node trong AVL
    node = tree.search(root, term)
    if not node:
        return jsonify({"error": "Term không tồn tại trong AVL"}), 404

    offset = node.offset

    # 2. Lấy thông tin cũ từ TERMS_INFO
    old_info = TERMS_INFO.get(offset, {
        "offset": offset,
        "definition": None,
        "context": [],
        "metadata": {}
    })

    # 3. Update các trường
    if "definition" in data:
        old_info["definition"] = data["definition"]

    if "context" in data:
        # context phải là list
        if isinstance(data["context"], list):
            old_info["context"] = data["context"]
        else:
            return jsonify({"error": "context phải là list"}), 400

    if "metadata" in data:
        if isinstance(data["metadata"], dict):
            old_info["metadata"] = data["metadata"]
        else:
            return jsonify({"error": "metadata phải là object"}), 400

    # 4. Ghi ngược lại vào RAM
    TERMS_INFO[offset] = old_info

    # 5. AUTO-SAVE
    auto_save(root, TERMS_INFO)

    return jsonify({
        "message": "Update thành công",
        "term": term,
        "offset": offset,
        "new_info": old_info
    })

# 7. API DELETE


@app.route("/delete_term", methods=["DELETE"])
def api_delete_term():
    global tree, root, TERMS_INFO

    term = request.args.get("term")
    if not term:
        return jsonify({"error": "Thiếu tham số ?term=..."}), 400

    # 1. Tìm node trước khi xoá
    node = tree.search(root, term)
    if not node:
        return jsonify({"error": "Term không tồn tại"}), 404

    offset = node.offset

    # 2. Lưu lại thông tin cũ để trả về
    removed_info = TERMS_INFO.get(offset, None)

    # 3. Xoá khỏi AVL tree
    root = tree.delete(root, term)

    # 4. Xoá khỏi TERMS_INFO
    if offset in TERMS_INFO:
        del TERMS_INFO[offset]

    # 5. AUTO SAVE
    auto_save(root, TERMS_INFO)

    return jsonify({
        "message": "Xóa thành công",
        "term": term,
        "offset": offset,
        "info_removed": removed_info
    })





@app.route("/save_terms", methods=["POST"])
def api_save_terms():
    # Lưu TERMS_INFO → JSON
    with open("data/terms_info.json", "w", encoding="utf-8") as f:
        json.dump(list(TERMS_INFO.values()), f, ensure_ascii=False, indent=2)

    # Lưu AVL tree
    save_avl(root, "data/avl.bin")

    return jsonify({"success": True, "message": "Dictionary saved to server"})

# upload+extract pdf
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
@app.route("/upload-extract_pdf", methods=["POST"])
def upload_extract_pdfs():
    # nhận files
    if "documents" not in request.files:
        return jsonify({"success": False, "error": "No files uploaded"}), 400
    
    files = request.files.getlist("documents")
    file_paths = []

    for f in files:
        filename = secure_filename(f.filename)
        path = os.path.join(UPLOAD_FOLDER, filename)
        f.save(path)
        file_paths.append(path)

    try: # extract pdf > index+info(save)
        final_terms= process_multi_pdfs(file_paths, dictpath="data/dict.json")
        # return jsonify({"success": True, "data": terms_index})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

    # Load AVL tree từ file bin
    root, error_response, status_code = load_tree()
    if error_response:
        return error_response, status_code
    global max_offset, TERMS_INFO, tree
    for item in final_terms:
#         # 2. Tạo offset tự tăng
        term = item[0]# term = item["term"]
        # skip if appears already
        # nếu đã có → bỏ qua index, chỉ merge context vào info
        existing = tree.search(root, term)
        if existing:
            off = existing.offset
            # merge context
            for ctx in item[2]: #item["context"]:
                if ctx not in TERMS_INFO[off]["context"]:
                    TERMS_INFO[off]["context"].append(ctx)
            continue

        # chưa có → thêm mới vào AVL
        max_offset += 1
        offset = max_offset

        new_node = AVLNode(term=term, offset=offset)
        root = tree.insert(root, new_node)

        # Lưu info
        TERMS_INFO[offset] = {
            "offset": offset,
            # "term": term,
            "definition": item[1], #["definition"],
            "context": item[2], #"context"],
            "metadata": {}
        }
    
    # 5. AUTO-SAVE: info+bin

    auto_save(root, TERMS_INFO)

    # 4) Load lại toàn bộ terms để trả về FE
    results = []
    inorder_traverse(root, results)

    return jsonify({
        "message": "Upload PDF → Extract → Build AVL thành công",
        "total_terms": len(results),
        "data": results
    })
        
    

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    app.run(debug=True)
