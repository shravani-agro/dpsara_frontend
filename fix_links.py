import os
import re
from bs4 import BeautifulSoup

public_dir = "public"

def safe_filename(path):
    path = path.strip("/")
    if not path:
        return "index.html"
    filename = path.replace("/", "_")
    if not filename.endswith(".html"):
        filename += ".html"
    return re.sub(r"[^a-zA-Z0-9._-]", "_", filename)

for root, _, files in os.walk(public_dir):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                continue

            soup = BeautifulSoup(content, "html.parser")
            changed = False

            for tag in soup.find_all("a", href=True):
                href = tag["href"]
                if href.startswith("/") and not href.startswith("//"):
                    new_href = "/" + safe_filename(href)
                    if new_href != href:
                        tag["href"] = new_href
                        changed = True

            for tag in soup.find_all("link", href=True):
                href = tag["href"]
                if "_next" in href:
                    filename = os.path.basename(href)
                    tag["href"] = f"/index_files/{filename}"
                    changed = True

            for tag in soup.find_all("script", src=True):
                src = tag["src"]
                if "_next" in src:
                    filename = os.path.basename(src)
                    tag["src"] = f"/index_files/{filename}.download"
                    changed = True

            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(str(soup))
                print(f"Fixed {filepath}")
