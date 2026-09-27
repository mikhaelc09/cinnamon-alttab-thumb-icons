#!/usr/bin/env bash
# Links the extension into Cinnamon's extension folder and enables it.
# Because it's a symlink, edits in this repo take effect after a Cinnamon reload.
set -euo pipefail

UUID="alttab-thumb-icons@mikhaelc09"
SRC="$(cd "$(dirname "$0")" && pwd)/$UUID"
DEST="$HOME/.local/share/cinnamon/extensions/$UUID"

mkdir -p "$(dirname "$DEST")"
if [ -e "$DEST" ] && [ ! -L "$DEST" ]; then
    mv "$DEST" "$DEST.bak.$(date +%Y%m%d%H%M%S)"
fi
ln -sfn "$SRC" "$DEST"

# The switcher style must be "Thumbnails" for this extension to apply.
gsettings set org.cinnamon alttab-switcher-style 'thumbnails'

enabled="$(gsettings get org.cinnamon enabled-extensions)"
if [[ "$enabled" != *"'$UUID'"* ]]; then
    if [[ "$enabled" == "@as []" || "$enabled" == "[]" ]]; then
        gsettings set org.cinnamon enabled-extensions "['$UUID']"
    else
        gsettings set org.cinnamon enabled-extensions "${enabled%]}, '$UUID']"
    fi
fi

echo "Installed. Reload Cinnamon (Alt+F2, type r, Enter) if the change doesn't show."
