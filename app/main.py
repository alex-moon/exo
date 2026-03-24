import glob
import shutil

from app.hyg import Hyg

class Exo:
    hyg: Hyg

    def __init__(self, hyg: Hyg):
        self.hyg = hyg

    def pull(self):
        self.hyg.pull()

    # @todo fucking hate this
    def assets(self):
        for f in glob.glob('data/*.json'):
            shutil.copy(f, 'public')

if __name__ == '__main__':
    hyg = Hyg()
    exo = Exo(hyg)
    exo.pull()
    exo.assets()
