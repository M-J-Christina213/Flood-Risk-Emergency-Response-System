import os
import re
import pdfplumber
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

DATA_FOLDER = "../Flood_level"
OUTPUT_FOLDER = "../outputs"
OUTPUT_FILE = os.path.join(OUTPUT_FOLDER, "water_levels.csv")
FAILED_FILE = os.path.join(OUTPUT_FOLDER, "failed_pdfs.csv")


# Create output folder automatically
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


# ============================================================
# GET DATE AND TIME FROM FILENAME
# ============================================================

def get_datetime_from_filename(filename):
    """
    Extract date and time from filenames such as:

    2025-11-21_0600_Water_Level.pdf
    2026-05-31_2100_Water_Level.pdf

    Returns:
        date = YYYY-MM-DD
        time = HH:MM
    """

    pattern = r"(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})"

    match = re.search(pattern, filename)

    if match:

        date = match.group(1)

        hour = match.group(2)
        minute = match.group(3)

        time = f"{hour}:{minute}"

        return date, time

    return None, None


# ============================================================
# EXTRACT TEXT FROM PDF
# ============================================================

def extract_pdf_text(pdf_path):

    text = ""

    try:

        with pdfplumber.open(pdf_path) as pdf:

            for page in pdf.pages:

                page_text = page.extract_text()

                if page_text:

                    text += page_text + "\n"

        return text

    except Exception as e:

        return None


# ============================================================
# FIND WATER LEVEL SECTION
# ============================================================

def find_water_level_section(text):

    """
    Try to locate the section containing river
    water-level information.

    We deliberately don't parse every line in the PDF.
    """

    lines = text.splitlines()

    start = None

    for i, line in enumerate(lines):

        line_lower = line.lower()

        if (
            "water level" in line_lower
            or "water levels" in line_lower
            or "river" in line_lower and "station" in line_lower
        ):

            start = i

            break


    if start is None:

        return []


    # Take a reasonable section after the heading
    section = lines[start:start + 100]

    return section


# ============================================================
# PARSE WATER LEVEL ROW
# ============================================================

def parse_water_level_row(line):

    """
    Attempt to identify a water-level data row.

    We are intentionally conservative.

    If a line cannot be confidently interpreted,
    we return None rather than putting bad data
    into the dataset.
    """

    line = line.strip()

    if not line:
        return None


    # Ignore obvious headings
    ignored_words = [
        "river",
        "station",
        "water level",
        "alert level",
        "minor flood",
        "major flood",
        "rainfall",
        "date",
        "time",
    ]

    lower_line = line.lower()

    if any(
        lower_line.startswith(word)
        for word in ignored_words
    ):

        return None


    # Find numeric values
    numbers = re.findall(
        r"-?\d+(?:\.\d+)?",
        line
    )


    # A normal water-level row should contain
    # several numerical measurements.
    if len(numbers) < 5:

        return None


    # --------------------------------------------------------
    # Extract status
    # --------------------------------------------------------

    status = None

    status_patterns = [
        "Normal",
        "Alert",
        "Warning",
        "Minor Flood",
        "Major Flood",
    ]

    for possible_status in status_patterns:

        if possible_status.lower() in lower_line:

            status = possible_status

            break


    # --------------------------------------------------------
    # Remove numbers and status from line
    # to identify text fields.
    # --------------------------------------------------------

    cleaned = line

    if status:

        cleaned = re.sub(
            re.escape(status),
            "",
            cleaned,
            flags=re.IGNORECASE
        )


    cleaned = re.sub(
        r"-?\d+(?:\.\d+)?",
        " ",
        cleaned
    )

    cleaned = re.sub(
        r"\s+",
        " ",
        cleaned
    ).strip()


    # Remove unit
    cleaned = re.sub(
        r"\b(m|meter|metres|metre|ft|feet)\b",
        "",
        cleaned,
        flags=re.IGNORECASE
    ).strip()


    # --------------------------------------------------------
    # We cannot safely split every historical format yet.
    # Therefore preserve the textual portion.
    # --------------------------------------------------------

    text_parts = cleaned.split()


    if len(text_parts) < 2:

        return None


    # First part = river/station text.
    # This is intentionally kept together for now.
    river_station = " ".join(text_parts)


    # --------------------------------------------------------
    # Numeric fields
    # --------------------------------------------------------

    try:

        numeric_values = [
            float(x)
            for x in numbers
        ]

    except ValueError:

        return None


    # We expect at least:
    #
    # Alert
    # Minor
    # Major
    # Previous
    # Current
    #
    if len(numeric_values) < 5:

        return None


    return {
        "River_Station_Raw": river_station,

        "Alert_Level": numeric_values[-5],
        "Minor_Flood_Level": numeric_values[-4],
        "Major_Flood_Level": numeric_values[-3],
        "Previous_Level": numeric_values[-2],
        "Current_Level": numeric_values[-1],

        "Status": status,
    }


# ============================================================
# PROCESS ONE PDF
# ============================================================

def process_pdf(pdf_path):

    filename = os.path.basename(pdf_path)

    report_date, report_time = get_datetime_from_filename(
        filename
    )


    # If filename doesn't contain date/time,
    # don't invent one.
    if report_date is None:

        return [], "Could not determine date/time"


    text = extract_pdf_text(pdf_path)


    if text is None:

        return [], "Could not extract PDF text"


    section = find_water_level_section(text)


    if not section:

        return [], "Water-level section not found"


    records = []


    for line in section:

        row = parse_water_level_row(line)


        if row is None:

            continue


        record = {

            "Report_Date": report_date,
            "Report_Time": report_time,

            "River_Station_Raw":
                row["River_Station_Raw"],

            "Alert_Level":
                row["Alert_Level"],

            "Minor_Flood_Level":
                row["Minor_Flood_Level"],

            "Major_Flood_Level":
                row["Major_Flood_Level"],

            "Previous_Level":
                row["Previous_Level"],

            "Current_Level":
                row["Current_Level"],

            "Status":
                row["Status"],

            "Source_File":
                filename,

        }


        records.append(record)


    return records, None


# ============================================================
# MAIN DATASET BUILD
# ============================================================

all_records = []
failed_files = []


pdf_count = 0


print("\n")
print("=" * 60)
print("BUILDING WATER LEVEL DATASET")
print("=" * 60)
print()


for root, dirs, files in os.walk(DATA_FOLDER):

    for file in files:

        if not file.lower().endswith(".pdf"):

            continue


        pdf_count += 1

        pdf_path = os.path.join(root, file)


        print(
            f"[{pdf_count}] Processing: {file}"
        )


        records, error = process_pdf(
            pdf_path
        )


        if records:

            all_records.extend(records)

        else:

            failed_files.append({

                "File": pdf_path,
                "Reason": error

            })


# ============================================================
# CREATE DATAFRAME
# ============================================================

df = pd.DataFrame(all_records)


# ============================================================
# CLEAN DATA TYPES
# ============================================================

if not df.empty:

    numeric_columns = [

        "Alert_Level",
        "Minor_Flood_Level",
        "Major_Flood_Level",
        "Previous_Level",
        "Current_Level",

    ]


    for column in numeric_columns:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )


    # Convert date to proper datetime
    df["Report_Date"] = pd.to_datetime(
        df["Report_Date"],
        errors="coerce"
    )


    # Sort chronologically
    df = df.sort_values(
        [
            "Report_Date",
            "Report_Time"
        ]
    )


    # Remove exact duplicate records
    df = df.drop_duplicates()


# ============================================================
# SAVE DATASET
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# Save failed PDFs separately
failed_df = pd.DataFrame(
    failed_files
)

failed_df.to_csv(
    FAILED_FILE,
    index=False
)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n")
print("=" * 60)
print("DATASET BUILD COMPLETE")
print("=" * 60)

print(
    f"PDFs processed : {pdf_count}"
)

print(
    f"Rows extracted : {len(df)}"
)

print(
    f"Failed PDFs    : {len(failed_df)}"
)

print(
    f"\nDataset saved to:\n{OUTPUT_FILE}"
)

print(
    f"\nFailed PDF list saved to:\n{FAILED_FILE}"
)


if not df.empty:

    print("\nFIRST 10 ROWS:")
    print(df.head(10).to_string(index=False))

else:

    print(
        "\nWARNING: No records were extracted."
    )