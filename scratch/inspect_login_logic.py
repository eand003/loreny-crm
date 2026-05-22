import re

with open("c:/Users/Eduardo/Documents/projetos/lorenyCRM/app.js", "r", encoding="utf-8") as f:
    content = f.read()

print("--- Occurrences of saveLeadsLocal ---")
for m in re.finditer(r"\bsaveLeadsLocal\b", content):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 50)
    print(f"Pos {m.start()}: ...{content[start:end]}...")

print("\n--- Occurrences of localStorage ---")
for m in re.finditer(r"\blocalStorage\b", content):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 50)
    print(f"Pos {m.start()}: ...{content[start:end]}...")
