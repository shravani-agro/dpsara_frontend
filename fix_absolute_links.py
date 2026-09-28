import os
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse

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
                
                # If it's an absolute link to sara777, make it relative
                if href.startswith("https://sara777.com"):
                    href = href.replace("https://sara777.com", "")
                    if not href.startswith("/"):
                        href = "/" + href
                
                if href.startswith("/") and not href.startswith("//"):
                    new_href = "/" + safe_filename(href)
                    if new_href != tag["href"]:
                        tag["href"] = new_href
                        changed = True

            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(str(soup))
                print(f"Fixed absolute links in {filepath}")
