# backend/data_manager.py
import json, os

TERMS_INDEX = 'terms_index.json'
TERMS_INFO = 'terms_info.json'

def load_terms():
    if not os.path.exists(TERMS_INFO):
        return []
    with open(TERMS_INFO, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_terms(data):
    with open(TERMS_INFO, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
