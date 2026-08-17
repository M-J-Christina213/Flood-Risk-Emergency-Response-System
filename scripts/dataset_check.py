import os
import pymupdf  # PyMuPDF

DATA_FOLDER = "../Flood_level"


def check_pdf_type(pdf_path):
    """
    Classify a PDF as Digital or Scanned.

    A digital PDF contains extractable text.
    A scanned PDF contains little or no extractable text.
    """

    try:
        doc = pymupdf.open(pdf_path)

        text = ""

        # Check the first 3 pages (or fewer if the PDF has less)
        pages_to_check = min(3, len(doc))

        for page_num in range(pages_to_check):
            text += doc[page_num].get_text()

        doc.close()

        # If enough text is extracted, treat it as digital
        if len(text.strip()) > 100:
            return "Digital"
        else:
            return "Scanned"

    except Exception:
        return "Error"


stats = {}

print("\nScanning PDF files...\n")

for year in sorted(os.listdir(DATA_FOLDER)):

    year_path = os.path.join(DATA_FOLDER, year)

    if not os.path.isdir(year_path):
        continue

    total = 0
    digital = 0
    scanned = 0
    errors = 0

    print(f"\n===== {year} =====")

    for root, dirs, files in os.walk(year_path):

        for file in files:

            if file.lower().endswith(".pdf"):

                total += 1

                pdf_path = os.path.join(root, file)

                print(f"Checking: {file}")

                result = check_pdf_type(pdf_path)

                if result == "Digital":
                    digital += 1

                elif result == "Scanned":
                    scanned += 1
                    print(f"   [SCANNED?] {pdf_path}")

                else:
                    errors += 1
                    print(f"   [ERROR] {pdf_path}")

    stats[year] = {
        "total": total,
        "digital": digital,
        "scanned": scanned,
        "errors": errors
    }


print("\n" + "=" * 55)
print("PDF ANALYSIS")
print("=" * 55)

print(
    f"{'YEAR':<10}"
    f"{'TOTAL':<10}"
    f"{'DIGITAL':<10}"
    f"{'SCANNED':<10}"
    f"{'ERROR':<10}"
)

for year, data in stats.items():

    print(
        f"{year:<10}"
        f"{data['total']:<10}"
        f"{data['digital']:<10}"
        f"{data['scanned']:<10}"
        f"{data['errors']:<10}"
    )