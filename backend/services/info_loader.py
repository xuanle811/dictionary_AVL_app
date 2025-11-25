import json


def load_info_by_offset(info_path, offset):
    with open(info_path, "r", encoding="utf-8") as f:
        info_data = json.load(f)

    for entry in info_data:
        if entry["offset"] == offset:
            return entry

    return None
