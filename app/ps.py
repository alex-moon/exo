import json
import logging
import os
from urllib.parse import quote_plus

import pandas as pd
import requests


class Ps:
    COLUMNS = [
        "hostname",
        "pl_name",
        "sy_vmag",
        "ra",
        "dec",
        "sy_dist",
        "st_teff",
        "discoverymethod",
        "disc_year",
        "disc_facility",
        "pl_orbper",
        "pl_rade",
        "pl_radj",
        "pl_bmasse",
        "pl_bmassj",
        "pl_dens",
    ]
    BASE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
    DOWNLOAD_DIR = "data"
    CSV_FILENAME = "ps.csv"
    JSON_FILENAME = "ps.json"

    def pull(self):
        self.download()
        self.load()

    def url(self):
        params = {
            "query": 'SELECT ' + ','.join(self.COLUMNS) + ' FROM ps WHERE default_flag = 1',
            "format": 'csv',
        }
        return '?'.join([self.BASE_URL, '&'.join([
            '='.join([key, quote_plus(value)])
            for key, value in params.items()
        ])])

    def download(self):
        csv_filepath = self.csv_filepath()

        if os.path.exists(csv_filepath):
            logging.info('file exists, skipping: ' + csv_filepath)
            return

        with requests.get(self.url(), stream=True) as r:
            r.raise_for_status()
            with open(csv_filepath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        logging.info('file downloaded: ' + csv_filepath)

    def load(self):
        json_filepath = self.json_filepath()

        # always regenerate
        # if os.path.exists(json_filepath):
        #     logging.info('file exists, skipping: ' + json_filepath)
        #     return

        planets = pd.read_csv(self.csv_filepath())
        planets['disc_year'] = planets['disc_year'].astype('Int64')
        planets['ci'] = (5822.22 / planets['st_teff'])**0.25 - 0.719  # from Gemini ...
        stars = {}
        for _, row in planets.iterrows():
            hostname = row['hostname']
            if hostname not in stars:
                stars[hostname] = {
                    "name": self.null(hostname),
                    "mag": self.null(row['sy_vmag']),
                    "ra": self.null(row['ra']),
                    "dec": self.null(row['dec']),
                    "ci": self.null(row['ci']),
                    "dist": self.null(row['sy_dist']),
                    "p": [],
                }
            star = stars[hostname]
            star["p"].append({
                "name": self.null(row['pl_name']),
                "meth": self.null(row['discoverymethod']),
                "year": self.null(row['disc_year']),
                "fac": self.null(row['disc_facility']),
                "orbper": self.null(row['pl_orbper']),
                "rade": self.null(row['pl_rade']),
                "radj": self.null(row['pl_radj']),
                "masse": self.null(row['pl_bmasse']),
                "massj": self.null(row['pl_bmassj']),
                "dens": self.null(row['pl_dens']),
            })

        for hostname, star in stars.items():
            if len(star["p"]) > 1:
                wiki_url = self.get_wiki_url(hostname)
                if wiki_url:
                    star["wiki"] = wiki_url

                for planet in star["p"]:
                    wiki_url = self.get_wiki_url(planet["name"])
                    if wiki_url:
                        planet["wiki"] = wiki_url

        with open(json_filepath, 'w') as f:
            json.dump(list(stars.values()), f, indent=2)

        logging.info('file loaded: ' + json_filepath)

    def get_wiki_url(self, title):
        try:
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title.replace(' ', '_')}"
            response = requests.get(url, timeout=5, headers={'User-Agent': 'Exo: https://github.com/alex-moon/exo'})
            if response.status_code == 200:
                data = response.json()
                wiki_url = data.get('content_urls', {}).get('desktop', {}).get('page')
                if wiki_url and 'List_of' not in wiki_url:
                    return wiki_url
        except Exception as e:
            logging.error(f"Error fetching Wikipedia for {title}: {e}")
        return None

    def null(self, value):
        if pd.isna(value):
            return None
        return value

    def csv_filepath(self):
        return os.path.join(self.DOWNLOAD_DIR, self.CSV_FILENAME)

    def json_filepath(self):
        return os.path.join(self.DOWNLOAD_DIR, self.JSON_FILENAME)
