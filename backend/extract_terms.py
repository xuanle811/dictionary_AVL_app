# backend/extract_terms.py

# Xử lý data file pdf
import spacy

def extract_terms(text):
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    terms = []
    for chunk in doc.noun_chunks:
        if len(chunk.text.split()) > 1 and chunk.text.isalpha():
            terms.append(chunk.text.lower())
    return list(set(terms))