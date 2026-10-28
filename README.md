# Nic's Arcade

One space-themed arcade cabinet that holds all 29 of the free neon games: pick a game from the main menu with a controller, keyboard, mouse or finger, and jump back to the menu without ever touching the address bar.

**Play it in your browser:** https://nbwillcox.github.io/arcades/

No build step, no dependencies, no accounts. Every game is plain HTML5 and runs inside the arcade in its own frame.

## Using it

| Input | Menu | Inside a game |
| --- | --- | --- |
| Controller | D-pad / left stick move, **A** or **Start** play, **LB / RB** change category, **Y** favorite, **X** random | Each game's own controls. **Home** button, or hold **Select + Start**, opens the Arcade menu |
| Keyboard | Arrows move, **Enter** / **Space** play, **Tab** or **Q / E** category, **F** favorite, **R** random, **M** sound, **G** full screen | **`** (backtick) opens the Arcade menu |
| Mouse | Hover to preview, click to play, right-click to favorite | Move to the top edge and click the glowing bar |
| Touch | Tap a cabinet | Tap the glowing bar at the top of the screen |

The Arcade menu (Resume, Restart game, Full screen, Sound, Back to arcade) freezes the controller away from the game while it is open, so button presses never leak into the game.

Add it to your phone's home screen (*Add to Home Screen* / *Install*) for a full-screen app. A direct link such as `.../arcades/#spacebert` is not needed, but `#<id>` (for example `#bert`, `#fzero`, `#drake`) launches that cabinet straight away.

## The cabinets

Shooters: Space Gala Shooter, Space Centi Shooter, Space Vader Shooter, Space Stroids, Space Command, Space Robo Shooter, Space Side Pews, Space Tube, Space Harrier, Space Fox, Space Duck Hunter.
Action: Space Troid, Space Drake, Space Contra, Space Bobble, Space Kong, Space Dug, Space Joust, Stick Brawl, Space Frogger.
Puzzle and maze: Space Pac, Space Qix, Space Bricks, Space Tris, Space Bert.
Racing and driving: F-Space Zero, Spy Space Hunter, Space Marble, Light Cycles.

Each game keeps its own scores, settings and saves in your browser. Space Drake is built for a controller and has no touch controls.

## Layout

```
index.html, css/, js/     the arcade shell (catalog.js lists the games)
games/<id>/               one folder per game, copied unmodified from its own repo
covers/                   menu art
tools/import_games.py     re-copy the games from their source folders
tools/shoot.mjs           headless smoke test + cover capture
tools/make_icons.py       app icons
```

To add a game: copy its folder to `games/<id>/`, add an entry to `js/catalog.js`, drop a 480x300 `covers/<id>.webp`.

## License

[Creative Commons Attribution-NonCommercial 4.0 International](LICENSE) (CC BY-NC 4.0), the same as every game in the series. Free to play, share and adapt for non-commercial use with credit and a link back to https://github.com/nbwillcox/arcades. Each game also lives in its own repository under https://github.com/nbwillcox.
