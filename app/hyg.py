import os
import logging
import requests
import gzip
import pandas as pd
import json
import math


class Hyg:
    DOWNLOAD_URL = "https://www.astronexus.com/downloads/catalogs/hygdata_v42.csv.gz"
    DOWNLOAD_DIR = "data"
    GZ_FILENAME = "hyg.gz"
    CSV_FILENAME = "hyg.csv"
    JSON_FILENAME = "hyg.json"

    def pull(self):
        self.download()
        self.extract()
        self.load()

    def download(self):
        gz_filepath = self.gz_filepath()

        if os.path.exists(gz_filepath):
            logging.info('file exists, skipping: ' + gz_filepath)
            return

        with requests.get(self.DOWNLOAD_URL, stream=True) as r:
            r.raise_for_status()
            with open(gz_filepath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        logging.info('file downloaded: ' + gz_filepath)

    def extract(self):
        csv_filepath = self.csv_filepath()

        if os.path.exists(csv_filepath):
            logging.info('file exists, skipping: ' + csv_filepath)
            return

        gz_filepath = self.gz_filepath()
        with gzip.open(gz_filepath, 'rb') as fin:
            with open(csv_filepath, 'wb') as fout:
                fout.write(fin.read())

        logging.info('file extracted: ' + csv_filepath)

    def load(self):
        json_filepath = self.json_filepath()

        # always regenerate
        # if os.path.exists(json_filepath):
        #     logging.info('file exists, skipping: ' + json_filepath)
        #     return

        df = pd.read_csv(self.csv_filepath())
        stars = df[(df['mag'] <= 6.5) & (df['mag'] > -10)].copy()
        star_list = []
        for _, row in stars.iterrows():
            star_list.append({
                "name": self.null(row['proper'] or row['bf']),
                "mag": self.null(round(row['mag'], 2)),
                "ra": self.null(round(row['ra'], 4)),
                "dec": self.null(round(row['dec'], 4)),
                "ci": self.null(round(row['ci'], 2)),
                "dist": self.null(round(row['dist'], 2)),
                "con": self.null(row['con']),
            })

        with open(json_filepath, 'w') as f:
            json.dump(star_list, f, indent=2)

        logging.info('file loaded: ' + json_filepath)

    def null(self, value):
        if pd.isna(value):
            return None
        return value

    def gz_filepath(self):
        return os.path.join(self.DOWNLOAD_DIR, self.GZ_FILENAME)

    def csv_filepath(self):
        return os.path.join(self.DOWNLOAD_DIR, self.CSV_FILENAME)

    def json_filepath(self):
        return os.path.join(self.DOWNLOAD_DIR, self.JSON_FILENAME)
