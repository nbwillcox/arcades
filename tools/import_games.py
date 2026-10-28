"""Copy every game from its source folder into games/<slug>/, minus dev files.\n\nRun from anywhere:  python tools/import_games.py [slug ...]\nSources live next to this repo (the parent folder holds one folder per game).\nThe first game (Gala) is the parent folder's own root files.\n"""
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
    'bert': 'SpaceBert', 'jong': 'SpaceJong', 'fox': 'SpaceFox', 'drake': 'SpaceDrake', 'duck': 'SpaceDuckHunter',
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


FS_OLD_A = "const req = de.requestFullscreen || de.webkitRequestFullscreen, exit = D.exitFullscreen || D.webkitExitFullscreen;\n  const isFs = () => !!(D.fullscreenElement || D.webkitFullscreenElement);"
FS_NEW_A = ("// Arcade: when framed by Nic's Arcade the button drives the arcade page's full screen, not the frame's.\n"
            "  let AF = null; try { AF = window.parent !== window && window.parent.ARCADE_FS; } catch (e) { AF = null; }\n"
            "  const req = AF ? function () { return AF.request(); } : (de.requestFullscreen || de.webkitRequestFullscreen), exit = AF ? function () { return AF.exit(); } : (D.exitFullscreen || D.webkitExitFullscreen);\n"
            "  const isFs = AF ? () => AF.is() : () => !!(D.fullscreenElement || D.webkitFullscreenElement);")
FS_OLD_B = "D.addEventListener('fullscreenchange', sync);"
FS_NEW_B = "if (AF) AF.onchange(sync); D.addEventListener('fullscreenchange', sync);"


def sub(path, old, new):
    s = open(path, encoding='utf-8').read()
    if old not in s:
        raise SystemExit('patch target missing in ' + path)
    open(path, 'w', encoding='utf-8', newline='').write(s.replace(old, new, 1))


def patch(slug, dst):
    fs = os.path.join(dst, 'js', 'fs.js')
    if os.path.exists(fs):
        sub(fs, FS_OLD_A, FS_NEW_A); sub(fs, FS_OLD_B, FS_NEW_B)
        import re
        ix = os.path.join(dst, 'index.html')
        h = open(ix, encoding='utf-8').read()
        h2 = re.sub(r'js/fs\.js(\?v=[^"]*)?', 'js/fs.js?v=arc1', h)
        open(ix, 'w', encoding='utf-8', newline='').write(h2)
    # canvas / custom menus get their own Back to Arcade entry (DOM #title menus are handled by js/app.js)
    if slug == 'drake':
        sub(os.path.join(dst, 'js', 'menus.js'),
            "      UI.menu({ title: 'SPACEDRAKE', subtitle: 'Collect gems.",
            "      if (window.parent !== window && window.parent.ARCADE) items.push({ label: 'Back to Arcade', action: () => window.parent.ARCADE.exitGame() });\n      UI.menu({ title: 'SPACEDRAKE', subtitle: 'Collect gems.")
    if slug == 'troid':
        u = os.path.join(dst, 'js', 'ui.js')
        sub(u, "{ k: 'opt', t: 'OPTIONS' }],\n    pause:", "{ k: 'opt', t: 'OPTIONS' }].concat(window.parent !== window && window.parent.ARCADE ? [{ k: 'arcade', t: 'BACK TO ARCADE' }] : []),\n    pause:")
        sub(u, "      case 'quit': M.toTitle(); break;", "      case 'quit': M.toTitle(); break;\n      case 'arcade': window.parent.ARCADE.exitGame(); break;")


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
        patch(slug, dst)
        print(f'{slug:9s} <- {folder:18s} {n:4d} files {mb:6.1f} MB')


top_root = SRC
top_filter = None
if __name__ == '__main__':
    main()
