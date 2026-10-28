"""Copy every game from its source folder into games/<slug>/, minus dev files.

Run from anywhere:  python tools/import_games.py [slug ...]
Sources live next to this repo (the parent folder holds one folder per game).
The first game (Gala) is the parent folder's own root files.
"""
import os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = os.path.dirname(REPO)

# slug -> source folder ('.' = the parent folder's own root files)
GAMES = {
    'gala': '.', 'centi': 'SpaceCentiShooter', 'vader': 'SpaceVaderShooter',
    'stroids': 'SpaceStroids', 'command': 'SpaceCommand', 'cycles': 'lightCycles',
    'robo': 'SpaceRoboShooter', 'bricks': 'SpaceBricks', 'pews': 'SpaceSidePews',
    'frogger': 'SpaceFrogger', 'dug': 'SpaceDug', 'contra': 'SpaceContra',
    'fzero': 'FSpaceZero', 'bobble': 'SpaceBobble', 'harrier': 'SpaceHarrier',
    'tris': 'SpaceTris', 'troid': 'SpaceTroid', 'spy': 'SpySpaceHunter',
    'pac': 'SpacePac', 'tube': 'SpaceTube', 'qix': 'SpaceQix', 'joust': 'SpaceJoust',
    'kong': 'SpaceKong', 'brawl': 'StickBrawl', 'marble': 'SpaceMarble',
    'bert': 'SpaceBert', 'fox': 'SpaceFox', 'drake': 'SpaceDrake', 'duck': 'SpaceDuckHunter',
}
# only these top-level entries of the root game are the game itself
ROOT_ONLY = {'index.html', 'js', 'css', 'icons', 'manifest.json'}
DROP_DIRS = {'.git', '.claude', 'tools', 'tests', 'docs', 'node_modules', 'assets_src'}
DROP_FILES = {'README.md', 'DESIGN.md', 'LICENSE', '.gitignore', '.nojekyll', 'package.json',
              'package-lock.json', 'sheet.html', 'tiles.html'}
DROP_EXT = {'.py', '.md', '.map', '.psd', '.blend', '.log'}


def keep(name, is_dir, top):
    if name.startswith('_') or name.startswith('.'):
        return False
    if is_dir:
        return name not in DROP_DIRS
    if name in DROP_FILES:
        return False
    return os.path.splitext(name)[1].lower() not in DROP_EXT


def copy_tree(src, dst, top):
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        p = os.path.join(src, name)
        d = os.path.isdir(p)
        if not keep(name, d, top):
            continue
        if top and src == top_root and top_filter and name not in top_filter:
            continue
        if d:
            copy_tree(p, os.path.join(dst, name), top)
        else:
            shutil.copy2(p, os.path.join(dst, name))


def main():
    global top_root, top_filter
    slugs = sys.argv[1:] or list(GAMES)
    for slug in slugs:
        folder = GAMES[slug]
        src = SRC if folder == '.' else os.path.join(SRC, folder)
        dst = os.path.join(REPO, 'games', slug)
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        top_root = src
        top_filter = ROOT_ONLY if folder == '.' else None
        copy_tree(src, dst, src)
        n = sum(len(f) for _, _, f in os.walk(dst))
        mb = sum(os.path.getsize(os.path.join(r, x)) for r, _, f in os.walk(dst) for x in f) / 1e6
        print(f'{slug:9s} <- {folder:18s} {n:4d} files {mb:6.1f} MB')


top_root = SRC
top_filter = None
if __name__ == '__main__':
    main()
