# backend/avl_tree.py

class AVLNode:
    def __init__(self, key, left=None, right=None):
        self.key = key
        self.left = left
        self.right = right
        self.height = 1

class AVLTree:
    def __init__(self):
        self.root = None

    def insert(self, root, key):
        if not root:
            return AVLNode(key)

        if key < root.key:
            root.left = self.insert(root.left, key)
        else:
            root.right = self.insert(root.right, key)

        root.height = 1 + max(self.getHeight(root.left), self.getHeight(root.right))
        balance = self.getBalance(root)

        if balance > 1 and key < root.left.key:
            return self.rightRotate(root)

        if balance < -1 and key > root.right.key:
            return self.leftRotate(root)

        if balance > 1 and key > root.left.key:
            root.left = self.leftRotate(root.left)
            return self.rightRotate(root)

        if balance < -1 and key < root.right.key:
            root.right = self.rightRotate(root.right)
            return self.leftRotate(root)

        return root

    def leftRotate(self, z):
        y = z.right
        T2 = y.left

        y.left = z
        z.right = T2

        z.height = max(self.getHeight(z.left), self.getHeight(z.right)) + 1
        y.height = max(self.getHeight(y.left), self.getHeight(y.right)) + 1

        return y

    def rightRotate(self, z):
        y = z.left
        T3 = y.right

        y.right = z
        z.left = T3

        z.height = max(self.getHeight(z.left), self.getHeight(z.right)) + 1
        y.height = max(self.getHeight(y.left), self.getHeight(y.right)) + 1

        return y

    def getHeight(self, root):
        if not root:
            return 0
        return root.height

    def getBalance(self, root):
        if not root:
            return 0
        return self.getHeight(root.left) - self.getHeight(root.right)
    
    def search(self, root, key):
        if not root or root.key == key:
            return root
        if key < root.key:
            return self.search(root.left, key)
        return self.search(root.right, key)
    # ===================== HÀM XÓA NODE =====================
    def delete(self, root, key):
        if not root:
            return root

        if key < root.key:
            root.left = self.delete(root.left, key)
        elif key > root.key:
            root.right = self.delete(root.right, key)
        else:
            # Node cần xóa được tìm thấy
            if root.left is None:
                return root.right
            elif root.right is None:
                return root.left

            # Node có 2 con: lấy node nhỏ nhất ở cây con phải
            min_larger_node = self.get_min_value_node(root.right)
            root.key = min_larger_node.key
            root.right = self.delete(root.right, min_larger_node.key)

        # Cập nhật chiều cao
        root.height = 1 + max(self.getHeight(root.left), self.getHeight(root.right))

        # Kiểm tra cân bằng
        balance = self.getBalance(root)

        # Cân bằng lại cây nếu cần
        if balance > 1 and self.getBalance(root.left) >= 0:
            return self.right_rotate(root)
        if balance > 1 and self.getBalance(root.left) < 0:
            root.left = self.left_rotate(root.left)
            return self.right_rotate(root)
        if balance < -1 and self.getBalance(root.right) <= 0:
            return self.left_rotate(root)
        if balance < -1 and self.getBalance(root.right) > 0:
            root.right = self.right_rotate(root.right)
            return self.left_rotate(root)

        return root

## Sửa update
    def update(self, root, old_key, new_key):
        """
        Cập nhật giá trị từ old_key sang new_key trong cây AVL.
        Thực chất: xóa old_key, thêm new_key.
        """
        node = self.search(root, old_key)
        if not node:
            return root  # từ cũ không tồn tại, trả về cây gốc
        # Xóa từ cũ
        root = self.delete(root, old_key)
        # Thêm từ mới
        root = self.insert(root, new_key)
        return root
    
    def get_min_value_node(self, node):
        current = node
        while current.left:
            current = current.left
        return current
    