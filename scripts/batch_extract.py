from pathlib import Path
from datetime import datetime
import re
import pdfplumber
import pandas as pd


# ============================================================
# PROJECT PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

DATA_FOLDER = ROOT / "Flood_Level"
OUTPUT_FOLDER = ROOT / "outputs"

OUTPUT_FOLDER.mkdir(exist_ok=True)

OUTPUT_CSV = OUTPUT_FOLDER / "water_levels_raw.csv"
LOG_CSV = OUTPUT_FOLDER / "extraction_log.csv"


# ============================================================
# PDF TYPE DETECTION
# ============================================================

def detect_pdf_type(pdf_path):

    try:

        with pdfplumber.open(pdf_path) as pdf:

            text = ""

            for page in pdf.pages[:2]:

                page_text = page.extract_text()

                if page_text:
                    text += page_text

            if len(text.strip()) >= 50:
                return "digital"

            return "scanned"

    except Exception:

        return "error"


# ============================================================
# EXTRACT REPORT DATE/TIME
# ============================================================

def extract_report_datetime(pdf):

    text = ""

    for page in pdf.pages[:2]:

        page_text = page.extract_text()

        if page_text:
            text += "\n" + page_text


    # Example:
    # DATE : 31-May-2026 TIME : 9:30 PM

    match = re.search(
        r"DATE\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})"
        r".*?"
        r"TIME\s*:\s*([0-9:]+\s*[APMapm]{2})",
        text,
        re.IGNORECASE | re.DOTALL
    )


    if match:

        date_text = match.group(1)
        time_text = match.group(2)

        try:

            dt = datetime.strptime(
                f"{date_text} {time_text}",
                "%d-%b-%Y %I:%M %p"
            )

            return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")

        except ValueError:

            pass


    return None, None


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(value):

    if value is None:
        return ""

    value = str(value)

    value = value.replace("\n", " ")

    value = re.sub(r"\s+", " ", value)

    return value.strip()


# ============================================================
# NUMBER CONVERSION
# ============================================================

def to_number(value):

    if value is None:
        return None

    value = clean_text(value)

    if value in ["", "-", "–", "—"]:
        return None

    value = value.replace(",", "")

    try:
        return float(value)

    except ValueError:
        return None


# ============================================================
# EXTRACT ONE PDF
# ============================================================

def extract_pdf(pdf_path):

    records = []


    with pdfplumber.open(pdf_path) as pdf:

        report_date, report_time = extract_report_datetime(pdf)


        for page_number, page in enumerate(
            pdf.pages,
            start=1
        ):

            tables = page.extract_tables()

            if not tables:
                continue


            for table in tables:

                if not table:
                    continue


                for row in table:

                    if not row:
                        continue


                    row = [
                        clean_text(x)
                        for x in row
                    ]


                    # Remove completely empty rows

                    if not any(row):
                        continue


                    # ------------------------------------------------
                    # We need at least the main data columns.
                    #
                    # In the successful 2026 PDF:
                    #
                    # 0 = River Basin
                    # 1 = Tributory/River
                    # 2 = Gauging Station
                    # 3 = Unit
                    # 4 = Alert
                    # 5 = Minor Flood
                    # 6 = Major Flood
                    # 7 = Water Level previous
                    # 8 = Water Level current
                    # 9 = Remarks
                    # 10 = Rising/Falling
                    # 11 = Rainfall
                    # ------------------------------------------------

                    if len(row) < 12:
                        continue


                    # Skip header rows

                    first_three = " ".join(
                        row[:3]
                    ).lower()


                    if (
                        "river basin" in first_three
                        or "gauging station" in first_three
                        or "station unit" in first_three
                    ):
                        continue


                    # ------------------------------------------------
                    # Extract fields
                    # ------------------------------------------------

                    river_basin = row[0]
                    river = row[1]
                    station = row[2]
                    unit = row[3]

                    alert_level = to_number(row[4])
                    minor_flood_level = to_number(row[5])
                    major_flood_level = to_number(row[6])

                    water_level_previous = to_number(row[7])
                    water_level_current = to_number(row[8])

                    remarks = row[9]

                    trend = row[10]

                    rainfall_12hr = to_number(row[11])


                    # ------------------------------------------------
                    # Ignore rows that aren't actual stations
                    # ------------------------------------------------

                    if station == "":
                        continue


                    # A station should normally have a unit

                    if unit not in ["m", "ft"]:

                        # Some PDFs may shift columns.
                        # Don't discard immediately;
                        # retain for inspection.

                        pass


                    records.append({

                        "date": report_date,

                        "time": report_time,

                        "river_basin": river_basin,

                        "river": river,

                        "station": station,

                        "unit": unit,

                        "alert_level": alert_level,

                        "minor_flood_level": minor_flood_level,

                        "major_flood_level": major_flood_level,

                        "water_level_previous":
                            water_level_previous,

                        "water_level_current":
                            water_level_current,

                        "remarks": remarks,

                        "trend": trend,

                        "rainfall_12hr":
                            rainfall_12hr,

                        "source_file":
                            str(pdf_path.relative_to(ROOT)),

                        "source_page":
                            page_number

                    })


    return records


# ============================================================
# MAIN BATCH PROCESS
# ============================================================

def main():

    print("=" * 70)
    print("FLOOD LEVEL BATCH EXTRACTION")
    print("=" * 70)

    print("\nDataset:")
    print(DATA_FOLDER)

    print("\nSearching for PDFs...\n")


    pdf_files = sorted(
        DATA_FOLDER.rglob("*.pdf")
    )


    print(f"PDFs found: {len(pdf_files)}")


    all_records = []

    log_records = []


    for index, pdf_path in enumerate(
        pdf_files,
        start=1
    ):

        print(
            f"[{index}/{len(pdf_files)}] "
            f"{pdf_path.name}"
        )


        # --------------------------------------------------------
        # Detect PDF
        # --------------------------------------------------------

        pdf_type = detect_pdf_type(
            pdf_path
        )


        # --------------------------------------------------------
        # Scanned
        # --------------------------------------------------------

        if pdf_type == "scanned":

            print("    -> SCANNED (skipped for now)")

            log_records.append({

                "file": str(
                    pdf_path.relative_to(ROOT)
                ),

                "status": "scanned",

                "records_extracted": 0,

                "error": ""

            })

            continue


        # --------------------------------------------------------
        # Error during detection
        # --------------------------------------------------------

        if pdf_type == "error":

            print("    -> ERROR")

            log_records.append({

                "file": str(
                    pdf_path.relative_to(ROOT)
                ),

                "status": "error",

                "records_extracted": 0,

                "error":
                    "Could not open PDF"

            })

            continue


        # --------------------------------------------------------
        # Extract digital PDF
        # --------------------------------------------------------

        try:

            records = extract_pdf(
                pdf_path
            )


            if records:

                print(
                    f"    -> DIGITAL "
                    f"({len(records)} records)"
                )

                all_records.extend(
                    records
                )


                log_records.append({

                    "file": str(
                        pdf_path.relative_to(ROOT)
                    ),

                    "status": "success",

                    "records_extracted":
                        len(records),

                    "error": ""

                })

            else:

                print(
                    "    -> DIGITAL but "
                    "NO RECORDS"
                )

                log_records.append({

                    "file": str(
                        pdf_path.relative_to(ROOT)
                    ),

                    "status":
                        "digital_no_records",

                    "records_extracted": 0,

                    "error":
                        "No usable table rows"

                })


        except Exception as e:

            print(
                f"    -> ERROR: {e}"
            )

            log_records.append({

                "file": str(
                    pdf_path.relative_to(ROOT)
                ),

                "status": "error",

                "records_extracted": 0,

                "error": str(e)

            })


    # ========================================================
    # SAVE DATA
    # ========================================================

    print("\n" + "=" * 70)
    print("SAVING RESULTS")
    print("=" * 70)


    if all_records:

        df = pd.DataFrame(
            all_records
        )


        # Remove exact duplicate records

        before = len(df)

        df = df.drop_duplicates()

        after = len(df)


        print(
            f"\nDuplicate rows removed: "
            f"{before - after}"
        )


        df.to_csv(
            OUTPUT_CSV,
            index=False
        )


        print(
            f"\nDataset saved:\n"
            f"{OUTPUT_CSV}"
        )


        print(
            f"\nRows: {len(df)}"
        )

        print(
            f"Columns: {len(df.columns)}"
        )


        print("\nColumns:")

        for column in df.columns:

            print(
                f"  - {column}"
            )


        print("\nFirst 10 rows:")

        print(
            df.head(10).to_string(
                index=False
            )
        )


    else:

        print(
            "\nNO RECORDS WERE EXTRACTED."
        )


    # ========================================================
    # SAVE LOG
    # ========================================================

    log_df = pd.DataFrame(
        log_records
    )


    log_df.to_csv(
        LOG_CSV,
        index=False
    )


    print(
        f"\nExtraction log saved:\n"
        f"{LOG_CSV}"
    )


    # ========================================================
    # SUMMARY
    # ========================================================

    print("\n" + "=" * 70)
    print("EXTRACTION SUMMARY")
    print("=" * 70)


    if not log_df.empty:

        print(
            "\nStatus counts:"
        )

        print(
            log_df["status"]
            .value_counts()
            .to_string()
        )


    print("\nDONE.")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()