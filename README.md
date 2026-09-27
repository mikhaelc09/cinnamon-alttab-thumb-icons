# Cinnamon Alt-Tab Thumbnail Icons

A Cinnamon extension that restyles the **Thumbnails** Alt-Tab switcher to feel more like Ubuntu/GNOME:

- Window thumbnails sized to fit the screen (up to 380px wide), centered in a compact panel
- A large app icon on each thumbnail's bottom-right corner
- Every window's title shown, with only the selected one fully bright
- A soft rounded highlight on the selected window instead of the theme's color

Tested on Linux Mint with Cinnamon 6.6.

## Install

```bash
git clone <this repo> ~/Documents/cinnamon-alttab-thumb-icons
~/Documents/cinnamon-alttab-thumb-icons/install.sh
```

`install.sh` symlinks `alttab-thumb-icons@mikhaelc09/` into `~/.local/share/cinnamon/extensions/`,
sets the Alt-Tab style to "Thumbnails", and enables the extension.
You can also turn it on or off in **System Settings → Extensions**.

## Customize

Edit the settings at the top of `alttab-thumb-icons@mikhaelc09/extension.js`:

| Setting | What it does |
|---|---|
| `OVERLAY_ICON_SIZE` | Size of the app icon on the thumbnail |
| `MAX_THUMB_WIDTH` / `MIN_THUMB_WIDTH` | Thumbnail width limits |
| `THUMB_HEIGHT_RATIO` | Thumbnail box height as a fraction of its width |
| `DIMMED_TITLE_OPACITY` | Brightness of unselected titles (255 = all bright, 0 = selected only) |
| `ITEM_STYLE` / `ITEM_SELECTED_STYLE` | Item and selection highlight styles |

Then reload Cinnamon: Alt+F2, type `r`, Enter (or `cinnamon --replace &`).

## Troubleshooting

Errors appear in Looking Glass (Alt+F2 → `lg` → Log) or in `~/.xsession-errors`.
If a Cinnamon upgrade breaks it, disable the extension and Alt-Tab returns to the stock switcher.
If Cinnamon says the version isn't supported, add the new version to `cinnamon-version` in `metadata.json`.
