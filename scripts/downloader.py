import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import time


BASE_URL = "https://www.dmc.gov.lk"

REPORT_URL = (
    "https://www.dmc.gov.lk/index.php"
    "?option=com_dmcreports"
    "&view=reports"
    "&report_type_id=6"
    "&lang=en"
    "&limitstart={}"
)


MAIN_FOLDER = "Flood_Level"

START_YEAR = 2018


def create_folder(year, month):

    path = os.path.join(
        MAIN_FOLDER,
        str(year),
        month
    )

    os.makedirs(path, exist_ok=True)

    return path



def download_pdf(pdf_url, save_path):

    if os.path.exists(save_path):
        print("Already exists:", save_path)
        return


    response = requests.get(pdf_url)

    if response.status_code == 200:

        with open(save_path, "wb") as file:
            file.write(response.content)

        print("Downloaded:", save_path)

    else:
        print("Failed:", pdf_url)



def process_page(start):

    url = REPORT_URL.format(start)

    print("\nChecking page:", start)

    response = requests.get(url)

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )


    rows = soup.find_all("tr")


    found_old_data = False


    for row in rows[1:]:

        columns = row.find_all("td")

        if len(columns) < 4:
            continue


        title = columns[0].get_text(
            " ",
            strip=True
        )


        date_text = columns[1].get_text(
            strip=True
        )


        time_text = columns[2].get_text(
            strip=True
        )


        # Only Water Level reports
        if "Water Level" not in title:
            continue


        try:

            date = datetime.strptime(
                date_text,
                "%Y-%m-%d"
            )

        except:

            continue


        year = date.year


        # Stop before 2018
        if year < START_YEAR:

            found_old_data = True
            break


        month = date.strftime("%B")


        # Convert time
        clean_time = time_text.replace(":", "")


        filename = (
            f"{date_text}_"
            f"{clean_time}_"
            f"Water_Level.pdf"
        )


        folder = create_folder(
            year,
            month
        )


        filepath = os.path.join(
            folder,
            filename
        )


        link = row.find("a")


        if link:

            pdf_path = link.get("href")


            pdf_url = (
                BASE_URL +
                pdf_path
            )


            download_pdf(
                pdf_url,
                filepath
            )


        time.sleep(0.5)


    return found_old_data



# ================================
# MAIN LOOP
# ================================


page = 0

while True:

    stop = process_page(page)


    if stop:

        print(
            "\nReached data before 2018."
        )

        break


    page += 10


print("\nDataset collection completed.")