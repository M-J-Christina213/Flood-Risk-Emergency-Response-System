import os

DATA_FOLDER = "../Flood_level"

total = 0

for root, dirs, files in os.walk(DATA_FOLDER):
    pdfs = [f for f in files if f.lower().endswith(".pdf")]

    if pdfs:
        print(f"{root} -> {len(pdfs)} PDFs")

    total += len(pdfs)

print("\n==========================")
print(f"TOTAL PDFs: {total}")
print("==========================")