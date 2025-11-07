# import sqlite3

# conn = sqlite3.connect('dictionary.db')
# c = conn.cursor()

# c.execute('''CREATE TABLE IF NOT EXISTS words
#              (word TEXT PRIMARY KEY, definition TEXT)''')

# # Thêm vài dòng mẫu
# # Thêm 30 dòng mẫu
# sample = [
#     ('hello', 'Xin chào'),
#     ('tree', 'Cây'),
#     ('algorithm', 'Thuật toán'),
#     ('apple', 'Quả táo'),
#     ('banana', 'Quả chuối'),
#     ('cat', 'Con mèo'),
#     ('dog', 'Con chó'),
#     ('elephant', 'Con voi'),
#     ('fish', 'Con cá'),
#     ('grape', 'Quả nho'),
#     ('hat', 'Cái mũ'),
#     ('ice', 'Đá, nước đá'),
#     ('jungle', 'Rừng rậm'),
#     ('kite', 'Diều'),
#     ('lion', 'Sư tử'),
#     ('monkey', 'Con khỉ'),
#     ('nest', 'Tổ chim'),
#     ('orange', 'Quả cam'),
#     ('pig', 'Con lợn'),
#     ('queen', 'Nữ hoàng'),
#     ('rabbit', 'Con thỏ'),
#     ('sun', 'Mặt trời'),
#     ('umbrella', 'Cái dù'),
#     ('village', 'Làng'),
#     ('wolf', 'Con sói'),
#     ('xylophone', 'Đàn gỗ xylophone'),
#     ('yogurt', 'Sữa chua'),
#     ('zebra', 'Ngựa vằn'),
#     ('book', 'Quyển sách'),
#     ('car', 'Xe ô tô')
# ]
# c.executemany('INSERT OR REPLACE INTO words VALUES (?, ?)', sample)

# conn.commit()
# conn.close()
# print("✅ Tạo xong database dictionary.db")
