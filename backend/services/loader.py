import json
from avl.node import AVLNode


def load_terms_index(index_path):
    with open(index_path, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    nodes = []
    for entry in index_data:
        node = AVLNode(
            term=entry["term"],
            offset=entry["offset"]
        )
        nodes.append(node)

    return nodes
