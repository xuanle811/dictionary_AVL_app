import json
from services.tree_binary import save_avl

# tự động lưu lại
def auto_save(root, terms_info,
              info_path="data/terms_info.json",
              bin_path="data/avl.bin"):

    # 1 — Save AVL tree nhị phân
    save_avl(root, bin_path)

    # 2 — Save terms_info.json
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(
            list(terms_info.values()),
            f,
            ensure_ascii=False,
            indent=2
        )
