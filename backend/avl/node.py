class AVLNode:
    def __init__(self, term, offset):
        self.term = term
        self.offset = offset

        # AVL fields
        self.left = None
        self.right = None
        self.height = 0

    def to_index_json(self):
        return {
            "term": self.term,
            "offset": self.offset
        }
