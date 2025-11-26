# Chứa tất cả hàm insert / delete / update / rotate / search / fuzzy/
from avl.node import AVLNode


class AVLTree:
    def height(self, node):
        if node is None:
            return -1
        return node.height

    def get_balance(self, node):
        if not node:
            return 0
        return self.height(node.left) - self.height(node.right)

    def rotate_right(self, y):
        x = y.left
        T2 = x.right
        # xoay
        x.right = y
        y.left = T2
        # cap nhat chieu cao
        y.height = 1 + max(self.height(y.left), self.height(y.right))
        x.height = 1 + max(self.height(x.left), self.height(x.right))
        return x

    def rotate_left(self, x):
        y = x.right
        T2 = y.left
        # Xoay
        y.left = x
        x.right = T2
        # Cập nhật height
        x.height = 1 + max(self.height(x.left), self.height(x.right))
        y.height = 1 + max(self.height(y.left), self.height(y.right))
        return y

    def insert(self, root, new_node):
        # 1. chen nhu BST thong thuong
        if root is None:
            return new_node
        if new_node.term < root.term:
            root.left = self.insert(root.left, new_node)
        elif new_node.term > root.term:
            root.right = self.insert(root.right, new_node)
        else:
            # Từ đã tồn tại → không chèn thêm
            return root
        # 2. Cập nhật height
        root.height = 1 + max(self.height(root.left), self.height(root.right))
        # 3. Kiểm tra cân bằng
        balance = self.get_balance(root)
        # Case 1: Left Left
        if balance > 1 and new_node.term < root.left.term:
            return self.rotate_right(root)
        # Case 2: Right Right
        if balance < -1 and new_node.term > root.right.term:
            return self.rotate_left(root)
        # Case 3: Left Right
        if balance > 1 and new_node.term > root.left.term:
            root.left = self.rotate_left(root.left)
            return self.rotate_right(root)
        # Case 4: Right Left
        if balance < -1 and new_node.term < root.right.term:
            root.right = self.rotate_right(root.right)
            return self.rotate_left(root)
        return root
    # Tìm giá trị nhỏ nhất ở cây con bên phải

    def min_value_node(self, node):
        current = node
        while current.left:
            current = current.left
        return current

    def delete(self, root, term):
        if root is None:
            return root
        # Tim node can xoa
        if term < root.term:
            root.left = self.delete(root.left, term)
        elif term > root.term:
            root.right = self.delete(root.right, term)
        else:
            # Node chỉ có 1 hoặc 0 con
            if root.left is None:
                return root.right
            elif root.right is None:
                return root.left
            # Node có 2 con → tìm node nhỏ nhất bên phải
            temp = self.min_value_node(root.right)
            root.term = temp.term
            root.offset = temp.offset
            root.right = self.delete(root.right, temp.term)
        # Nếu cây bị rỗng
        if root is None:
            return root
        # Cập nhật height
        root.height = 1 + max(self.height(root.left), self.height(root.right))
        # Kiểm tra cân bằng
        balance = self.get_balance(root)
        # LL
        if balance > 1 and self.get_balance(root.left) >= 0:
            return self.rotate_right(root)

        # LR
        if balance > 1 and self.get_balance(root.left) < 0:
            root.left = self.rotate_left(root.left)
            return self.rotate_right(root)

        # RR
        if balance < -1 and self.get_balance(root.right) <= 0:
            return self.rotate_left(root)

        # RL
        if balance < -1 and self.get_balance(root.right) > 0:
            root.right = self.rotate_right(root.right)
            return self.rotate_left(root)

        return root

    def search(self, root, term):
        if root is None:
            return None
        if term == root.term:
            return root
        if term < root.term:
            return self.search(root.left, term)
        return self.search(root.right, term)

    def update(self, root, term):
        """
        AVL tree hiện chỉ lưu {term, offset},
        không chứa definition/context/metadata.
        Vì vậy update() chỉ kiểm tra node tồn tại.
        """
        node = self.search(root, term)
        return node is not None
    
    # Xuat tu dien

    def inorder(self, root, out_list):
        if root:
            self.inorder(root.left, out_list)
            out_list.append(root)
            self.inorder(root.right, out_list)
    # khoảng cách Levenshtein giữa hai chuỗi s1 và s2.


    def levenshtein_distance(self, s1, s2):
        m, n = len(s1), len(s2)

        # Khởi tạo bảng DP (m+1 x n+1)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        # Base cases
        for i in range(m + 1):
            # Để biến chuỗi s1 dài i thành chuỗi rỗng → phải xóa i ký tự.
            dp[i][0] = i
        for j in range(n + 1):
            # Để biến chuỗi rỗng thành chuỗi s2 dài j → phải chèn j ký tự.
            dp[0][j] = j

        # Fill DP
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1

                dp[i][j] = min(
                    dp[i - 1][j] + 1,        # xóa
                    dp[i][j - 1] + 1,        # chèn
                    dp[i - 1][j - 1] + cost  # thay
                )
        return dp[m][n]

    def fuzzy_search(self, root, query, threshold=2):
        results = []

        def dfs(node):
            if not node:
                return
            if self.levenshtein_distance(node.term, query) <= threshold:
                results.append(node.term)
            dfs(node.left)
            dfs(node.right)

        dfs(root)
        return results

    def count_nodes(self, root):
        if root is None:
            return 0
        return 1 + self.count_nodes(root.left) + self.count_nodes(root.right)
