import sqlite3

conn = sqlite3.connect('dictionary.db')
c = conn.cursor()

c.execute('''CREATE TABLE IF NOT EXISTS words
             (word TEXT PRIMARY KEY, definition TEXT)''')

# Thêm vài dòng mẫu
sample = [('hello', 'Xin chào'), ('tree', 'Cây'), ('algorithm', 'Thuật toán')]
c.executemany('INSERT OR REPLACE INTO words VALUES (?, ?)', sample)

conn.commit()
conn.close()
print("✅ Tạo xong database dictionary.db")
