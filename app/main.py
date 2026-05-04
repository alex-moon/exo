import glob
import shutil

from app.hyg import Hyg
from app.ps import Ps


class Exo:
    hyg: Hyg
    ps: Ps

    def __init__(self, hyg: Hyg, ps: Ps):
        self.hyg = hyg
        self.ps = ps

    def pull(self):
        # self.hyg.pull()
        self.ps.pull()

    # @todo fucking hate this
    def assets(self):
        for f in glob.glob('data/*.json'):
            shutil.copy(f, 'public')

if __name__ == '__main__':
    exo = Exo(Hyg(), Ps())
    exo.pull()
    exo.assets()
