import os
import pdfplumber


DATA_FOLDER = "../Flood_level"


def check_pdf_type(pdf_path):

    try:
        with pdfplumber.open(pdf_path) as pdf:

            text = ""

            for page in pdf.pages[:2]:
                extracted = page.extract_text()

                if extracted:
                    text += extracted


            if len(text.strip()) > 50:
                return "Digital"

            else:
                return "Scanned"

    except Exception as e:
        return "Error"



stats = {}


for year in os.listdir(DATA_FOLDER):

    year_path = os.path.join(DATA_FOLDER, year)

    if os.path.isdir(year_path):

        digital = 0
        scanned = 0
        total = 0


        for root, dirs, files in os.walk(year_path):

            for file in files:

                if file.lower().endswith(".pdf"):

                    total += 1

                    path = os.path.join(root,file)

                    result = check_pdf_type(path)


                    if result == "Digital":
                        digital += 1

                    elif result == "Scanned":
                        scanned += 1


        stats[year] = {
            "total": total,
            "digital": digital,
            "scanned": scanned
        }



print("\nPDF ANALYSIS\n")

print(
    f"{'YEAR':<10}"
    f"{'TOTAL':<10}"
    f"{'DIGITAL':<10}"
    f"{'SCANNED':<10}"
)


for year,data in sorted(stats.items()):

    print(
        f"{year:<10}"
        f"{data['total']:<10}"
        f"{data['digital']:<10}"
        f"{data['scanned']:<10}"
    )