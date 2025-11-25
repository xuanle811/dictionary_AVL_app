import struct
from avl.node import AVLNode


def save_node(node, f):
    if node is None:
        f.write(b'\x00')
        return

    f.write(b'\x01')

    # TERM
    t = node.term.encode("utf-8")
    f.write(struct.pack("i", len(t)))
    f.write(t)

    # OFFSET
    f.write(struct.pack("i", node.offset))

    # HEIGHT
    f.write(struct.pack("i", node.height))

    save_node(node.left, f)
    save_node(node.right, f)


def save_avl(root, path="data/avl.bin"):
    with open(path, "wb") as f:
        save_node(root, f)


def load_node(f):
    flag = f.read(1)
    if not flag or flag == b'\x00':
        return None

    # TERM
    term_len = struct.unpack("i", f.read(4))[0]
    term = f.read(term_len).decode("utf-8")

    # OFFSET
    offset = struct.unpack("i", f.read(4))[0]

    # HEIGHT
    height = struct.unpack("i", f.read(4))[0]

    node = AVLNode(term, offset)
    node.height = height

    node.left = load_node(f)
    node.right = load_node(f)

    return node


def load_avl(path="data/avl.bin"):
    try:
        with open(path, "rb") as f:
            return load_node(f)
    except FileNotFoundError:
        return None
