

import os
import re
import json
import nltk
import numpy as np
from collections import Counter
import pandas as pd

import spacy
from keybert import KeyBERT
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler

import PyPDF2
from spacy.matcher import Matcher

import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize



# 1. READ FILE
    # ---------------------------------------------------------
def read_pdf(path):
  text = ""
  with open(path, "rb") as f:
      reader = PyPDF2.PdfReader(f)
      for page in reader.pages:
          t = page.extract_text()
          if t:
              text += t + "\n"
  return text

# 2. CLEAN TEXT 2
    # ---------------------------------------------------------
def clean_text(text):
    # Bỏ ký tự Unicode lạ nhưng giữ dấu cơ bản
  text = text.encode("ascii", "ignore").decode()
  # Về chữ thường
  text = text.lower()
  # Bỏ dấu "_" (rất nhiều PDF để nối từ)
  text = text.replace("_", " ")
  # Bỏ kí tự không phải chữ cái, số, khoảng trắng hoặc "-"
  text = re.sub(r"[^a-z0-9\s\-]", " ", text)
  # Bỏ nhiều dấu '-' liên tiếp
  text = re.sub(r"-{2,}", "-", text)
  # Bỏ từ bị tách chữ theo PDF OCR (từ kiểu: m e m o r y)
  text = re.sub(r"(?:\b[a-z] ){2,}[a-z]\b", "", text)
  # Thu gọn khoảng trắng
  text = re.sub(r"\s+", " ", text)
  # # Bỏ ký tự "-" hoặc khoảng trắng đầu chuỗi trước khi loại bỏ a/an/the
  # text = re.sub(r'^-+\s*', '', text)
  #     # bỏ tiền tố a, an, the
  # text = re.sub(r'^(a|an|the)\s+', '', text)
  # Loại số trang / số nhỏ
  text = re.sub(r"\b\d{1,3}\b", " ", text)
  return text.strip()

# 3. noun_chunks
# =========================================================
nlp = spacy.load("en_core_web_sm")

def get_noun_chunks(text):
    doc = nlp(text)
    return [chunk.text for chunk in doc.noun_chunks]


# =========================================================
# 4. POS pattern terms
# =========================================================
def get_pos_terms(text):
    doc = nlp(text)
    matcher = Matcher(nlp.vocab)

    patterns = [
        [{"POS": "ADJ"}, {"POS": "NOUN"}],
        [{"POS": "ADJ"}, {"POS": "ADJ"}, {"POS": "NOUN"}],
        [{"POS": "NOUN"}, {"POS": "NOUN"}],
        [{"POS": "NOUN"}, {"POS": "ADP"}, {"POS": "NOUN"}],
    ]

    for i, p in enumerate(patterns):
        matcher.add(f"PT_{i}", [p])

    matches = matcher(doc)
    output = []
    for _, start, end in matches:
        output.append(doc[start:end].text)

    return output


# =========================================================
# 5. Hyphenated terms
# =========================================================
def get_hyphen_terms(text):
    return re.findall(r'\b[\w]+(?:-[\w]+)+\b', text)


# =========================================================
# 6. n-grams theo TF-IDF
# =========================================================
def get_tfidf_terms(text, top_k=150):
    vec = TfidfVectorizer(ngram_range=(1, 4), stop_words='english')
    X = vec.fit_transform([text])
    scores = list(zip(vec.get_feature_names_out(), X.toarray()[0]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)
    return [term for term, score in scores[:top_k]]


# =========================================================
# 7. Chuẩn hóa thuật ngữ
# =========================================================
def normalize_term(term):
    term = term.strip().lower()
    term = re.sub(r'\s+', ' ', term)
    return term



# =========================================================
# 8. Ghép toàn bộ thuật ngữ
# =========================================================
def extract_terms(text):
    terms = []

    terms += get_noun_chunks(text)
    terms += get_pos_terms(text)
    terms += get_hyphen_terms(text)
    terms += get_tfidf_terms(text)

    # chuẩn hóa
    terms = [normalize_term(t) for t in terms]

    # # bỏ từ ngắn/rác
    # terms = [t for t in terms if len(t) > 3]

    # loại trùng và sắp xếp thuật ngữ
    terms = sorted(list(set(terms)))

    return terms

# ============
# Lọc các cụm từ thuộc lĩnh vực CNTT
def filter_it_terms(terms_list, dictpath):
    # Đọc file CSV từ điển
    dict_df = pd.read_json(dictpath)  # gồm cột 'term' và 'definition'
    
    # Chuẩn hóa cột 'term'
    dict_df['term'] = dict_df['term'].str.strip().str.lower()
    
    results = []
    
    # Chuẩn hóa terms_list
    terms_list = [t.lower().strip() for t in terms_list]
    
    for t in terms_list:
        # Chỉ match nếu **dict term xuất hiện nguyên vẹn** trong chunk extract
        matched = dict_df[dict_df['term'].apply(lambda x: x in t)]
        for _, row in matched.iterrows():
            results.append((row['term'], row['definition']))
    
    # Loại trùng
    results = list(set(results))
    return results



def add_context_to_terms(it_terms, text, top_n=2):
    """
    it_terms: list of tuples (term, definition)
    text: string chứa bài báo
    top_n: số câu muốn lấy làm context
    """
    # Tách câu trong văn bản
    sentences = sent_tokenize(text)
    
    results = []
    
    for term, definition in it_terms:
        term_lower = term.lower().strip()
        contexts = []
        
        for sent in sentences:
            if term_lower in sent.lower():
                contexts.append(sent.strip())
            if len(contexts) >= top_n:
                break  # chỉ lấy top_n câu đầu tiên
        
        results.append((term, definition, contexts))
    
    return results

# =========================================================


def process_pdf(pdf_file, dictpath='data/dict.json'):
    text_read = read_pdf(pdf_file)
    text_clean = clean_text(text_read)
    text_extract = extract_terms(text_clean)
    it_terms = filter_it_terms(text_extract, dictpath)
    final_terms = add_context_to_terms(it_terms, text_read, top_n=2)
    # print("text_read: ",final_terms)
    # save_terms(final_terms, output="ResultTerms/it_terms.json")
    return final_terms

# 9. Xuất CSV
# =========================================================
import os
import json

def save_terms(terms, index_path="ResultTerms/terms_index.json", info_path="ResultTerms/terms_info.json"):
    # terms_index = []
    # terms_info = []

    # Tạo folder nếu chưa có
    os.makedirs(os.path.dirname(index_path), exist_ok=True)

    # Nếu file chưa tồn tại → tạo rỗng
    if not os.path.exists(index_path):
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump([], f)

    if not os.path.exists(info_path):
        with open(info_path, "w", encoding="utf-8") as f:
            json.dump([], f)

        # Load dữ liệu cũ
    with open(index_path, "r", encoding="utf-8") as f:
        old_index = json.load(f)

    with open(info_path, "r", encoding="utf-8") as f:
        old_info = json.load(f)
        # Build map -> offset
    term_to_offset = {item["term"]: item["offset"] for item in old_index}
        # current offset
    offset = len(old_index)

    def flatten_terms(data):
        for item in data:
            if isinstance(item, list):
                yield from flatten_terms(item)
            else:
                yield item


    # Process
    for item in flatten_terms(terms):
        term, definition, context = item

        if term in term_to_offset:
            # ĐÃ CÓ → cập nhật context
            off = term_to_offset[term]
            for ctx in context:
                if ctx not in old_info[off]["context"]:
                    old_info[off]["context"].append(ctx)

        else:
            # MỚI → thêm vào cuối
            old_index.append({"offset": offset, "term": term})
            old_info.append({
                "offset": offset,
                "definition": definition,
                "context": context,
                "metadata": {}
            })
            term_to_offset[term] = offset
            offset += 1

    # Lưu lại
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(old_index, f, ensure_ascii=False, indent=2)

    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(old_info, f, ensure_ascii=False, indent=2)

    print("Updated JSON with new + merged terms")

    return old_index



def process_multi_pdfs(file_paths, dictpath='data/dict.json'):
# Dùng dict tạm để merge term trùng trong cùng 1 lượt upload
    merged_terms = {}

    for path in file_paths:
        result = process_pdf(path, dictpath=dictpath)
        for term, definition, context in result:
            if term in merged_terms:
                # Đã có → merge context
                for ctx in context:
                    if ctx not in merged_terms[term]["context"]:
                        merged_terms[term]["context"].append(ctx)
            else:
                # Chưa có → thêm mới
                merged_terms[term] = {
                    "definition": definition,
                    "context": list(context)
                }

    # Chuyển dict thành list tuple [(term, definition, context), ...]
    final_terms = [(t, v["definition"], v["context"]) for t, v in merged_terms.items()]

    # Gọi save_terms như trước (incremental merge với JSON cũ)
    terms_index = save_terms(
        final_terms,
        index_path="ResultTerms/terms_index.json",
        info_path="ResultTerms/terms_info.json"
    )

    return terms_index

def process_multi_pdfs_folder(folder_path, dictpath='data/dict.json'):
    pdf_files = [
        os.path.join(folder_path, f)
        for f in os.listdir(folder_path)
        if f.lower().endswith(".pdf")
    ]
    return process_multi_pdfs(pdf_files, dictpath=dictpath)


index_terms = process_multi_pdfs_folder("data")
print("Số thuật ngữ tìm được:", len(index_terms))
# print("Một số ví dụ:", index_terms)
