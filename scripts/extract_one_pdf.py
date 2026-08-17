from pathlib import Path
import pdfplumber
import pandas as pd

# ============================================================
# PROJECT LOCATION
# ============================================================

ROOT = Path(__file__).resolve().parent.parent


# ============================================================
# PDF TO TEST
# ============================================================
# IMPORTANT:
# Change this to a DIGITAL PDF.
#
# Example:
# Flood_Level / 2026 / May / 2026-05-31_2100_Water_Level.pdf
#
# If your 2026 file is in a different month folder, change it.

# ============================================================
# AUTOMATIC TEST PDF
# ============================================================

DIGITAL_TEST_YEAR = "2025"

PDF_FILES = list(
    (ROOT / "Flood_Level" / DIGITAL_TEST_YEAR).rglob("*.pdf")
)

if not PDF_FILES:
    print(f"No PDFs found for {DIGITAL_TEST_YEAR}")
    exit()

PDF_FILE = PDF_FILES[0]


# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = ROOT / "outputs"

OUTPUT_DIR.mkdir(exist_ok=True)

CSV_FILE = OUTPUT_DIR / "sample_digital_output.csv"


# ============================================================
# START
# ============================================================

print("=" * 70)
print("DIGITAL PDF EXTRACTION TEST")
print("=" * 70)

print("\nOpening PDF:")
print(PDF_FILE)

print("\nOutput CSV:")
print(CSV_FILE)

print("=" * 70)


# ============================================================
# CHECK FILE
# ============================================================

if not PDF_FILE.exists():

    print("\nERROR!")
    print("PDF file was not found.")

    print("\nExpected location:")
    print(PDF_FILE)

    print("\nPlease check:")
    print("1. Year folder")
    print("2. Month folder")
    print("3. PDF filename")

    exit()


# ============================================================
# OPEN PDF
# ============================================================

all_tables = []

with pdfplumber.open(PDF_FILE) as pdf:

    print(f"\nTotal Pages: {len(pdf.pages)}")

    # --------------------------------------------------------
    # Read every page
    # --------------------------------------------------------

    for page_no, page in enumerate(pdf.pages, start=1):

        print("\n" + "-" * 70)
        print(f"PAGE {page_no}")
        print("-" * 70)


        # ====================================================
        # TEXT EXTRACTION
        # ====================================================

        text = page.extract_text()

        if text:

            print("\nTEXT FOUND:")
            print("-" * 50)

            # Print first 2000 characters only
            print(text[:2000])

            if len(text) > 2000:
                print("\n... text truncated ...")

        else:

            print("\nNO TEXT FOUND.")


        # ====================================================
        # TABLE EXTRACTION
        # ====================================================

        print("\nAttempting table extraction...")

        tables = page.extract_tables()


        if not tables:

            print("No tables found on this page.")

            continue


        print(f"Tables found: {len(tables)}")


        # ----------------------------------------------------
        # Process tables
        # ----------------------------------------------------

        for table_no, table in enumerate(tables, start=1):

            print("\n" + "=" * 50)
            print(f"TABLE {table_no}")
            print("=" * 50)


            if not table:

                print("Empty table.")

                continue


            df = pd.DataFrame(table)


            print("\nRows:", len(df))
            print("Columns:", len(df.columns))

            print("\nExtracted table:")
            print(df.to_string(index=False))


            # Store table
            all_tables.append(df)


# ============================================================
# SAVE TABLES
# ============================================================

if all_tables:

    print("\n" + "=" * 70)
    print("COMBINING TABLES")
    print("=" * 70)


    final_df = pd.concat(
        all_tables,
        ignore_index=True
    )


    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    final_df.to_csv(
        CSV_FILE,
        index=False
    )


    print("\nSUCCESS!")

    print("\nFinal dataset shape:")
    print(final_df.shape)


    print("\nSaved CSV:")
    print(CSV_FILE)


    print("\nPreview:")
    print(final_df.head(10).to_string(index=False))


else:

    print("\n" + "=" * 70)
    print("NO TABLES EXTRACTED")
    print("=" * 70)


    print("\nThis PDF may be:")
    print("- scanned/image based")
    print("- using a table layout pdfplumber cannot detect")
    print("- or using another PDF structure")


    print("\nHowever, check the TEXT FOUND output above.")

    print("If text was extracted successfully, we can")
    print("build a text-based parser instead of OCR.")