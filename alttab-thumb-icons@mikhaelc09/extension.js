const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Pango = imports.gi.Pango;
const Cinnamon = imports.gi.Cinnamon;
const ClassicSwitcher = imports.ui.appSwitcher.classicSwitcher;
const WindowUtils = imports.misc.windowUtils;

// Size (px, before UI scaling) of the app icon overlaid on the thumbnail's bottom-right corner.
const OVERLAY_ICON_SIZE = 48;
// Thumbnail box width limits (px, before UI scaling). The actual width is the
// largest that fits all windows across the monitor, clamped to this range.
const MAX_THUMB_WIDTH = 380;
const MIN_THUMB_WIDTH = 160;
// Thumbnail box height as a fraction of its width.
const THUMB_HEIGHT_RATIO = 0.7;
// Never let the switcher grow taller than this fraction of the monitor height.
const MAX_SCREEN_HEIGHT_FRACTION = 0.85;
// Opacity (0-255) of the titles of windows that are not selected.
const DIMMED_TITLE_OPACITY = 110;

let origInit = null;
let origSetSize = null;
let origGetPreferredHeight = null;
let origListInit = null;
let origHighlight = null;

function patchedInit(window, showThumbnail) {
    if (!showThumbnail) {
        origInit.call(this, window, showThumbnail);
        return;
    }

    this.window = window;
    this.showThumbnail = showThumbnail;
    let tracker = Cinnamon.WindowTracker.get_default();
    this.app = tracker.get_window_app(window);
    this.actor = new St.BoxLayout({ style_class: 'alt-tab-app', vertical: true });
    this.icon = null;
    this._iconBin = new St.Bin();
    this.actor.add(this._iconBin, { x_fill: false, y_fill: false });

    if (window.minimized) {
        let contrast_effect = new Clutter.BrightnessContrastEffect();
        contrast_effect.set_brightness_full(-0.5, -0.5, -0.5);
        this.actor.add_effect(contrast_effect);
    }

    let title = window.get_title() || (this.app ? this.app.get_name() : '');
    this.label = new St.Label({ text: title });
    this.label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    this.label.opacity = DIMMED_TITLE_OPACITY;

    this._titleBin = new St.Bin({ x_align: St.Align.MIDDLE, style: 'padding-top: 10px;' });
    this._titleBin.add_actor(this.label);
    this.actor.add(this._titleBin);
}

function patchedSetSize(size) {
    if (!this.showThumbnail) {
        origSetSize.call(this, size);
        return;
    }

    let scale = global.ui_scale;
    let boxW = Math.round(size * scale);
    let boxH = Math.round(size * THUMB_HEIGHT_RATIO * scale);

    this.icon = new St.Widget();
    let clones = WindowUtils.createWindowClone(this.window, boxW, boxH, true, true);
    // Center the (aspect-preserving) window image inside the box.
    let cloneW = 0, cloneH = 0;
    for (let clone of clones) {
        cloneW = Math.max(cloneW, clone.x + clone.actor.width);
        cloneH = Math.max(cloneH, clone.y + clone.actor.height);
    }
    let offsetX = Math.round((boxW - cloneW) / 2);
    let offsetY = Math.round((boxH - cloneH) / 2);
    for (let clone of clones) {
        this.icon.add_actor(clone.actor);
        clone.actor.set_position(clone.x + offsetX, clone.y + offsetY);
    }

    // App icon overlapping the thumbnail's bottom-right corner, kept inside the box.
    let iconSize = Math.round(OVERLAY_ICON_SIZE * scale);
    let appIcon = this.app ?
        this.app.create_icon_texture_for_window(OVERLAY_ICON_SIZE, this.window) :
        new St.Icon({ icon_name: 'application-default-icon',
                      icon_type: St.IconType.FULLCOLOR,
                      icon_size: OVERLAY_ICON_SIZE });
    this.icon.add_actor(appIcon);
    let overhang = Math.round(iconSize * 0.3);
    appIcon.set_position(Math.min(offsetX + cloneW - iconSize + overhang, boxW - iconSize),
                         Math.min(offsetY + cloneH - iconSize + overhang, boxH - iconSize));

    this._iconBin.set_size(boxW, boxH);
    this._iconBin.child = this.icon;
    // Keep long titles from widening the item past the thumbnail.
    this._titleBin.set_width(boxW);
}

function patchedListInit(windows, showThumbnails, activeMonitor) {
    origListInit.call(this, windows, showThumbnails, activeMonitor);
    // Thumbnail items are wider than tall; don't force them into squares.
    if (showThumbnails)
        this._squareItems = false;
}

function patchedHighlight(index, justOutline) {
    origHighlight.call(this, index, justOutline);
    let first = this.icons && this.icons[0];
    if (!first || !first.showThumbnail)
        return;
    for (let i = 0; i < this._items.length; i++) {
        if (this.icons[i])
            this.icons[i].label.opacity = i == index ? 255 : DIMMED_TITLE_OPACITY;
    }
}

function patchedGetPreferredHeight(actor, forWidth, alloc) {
    let first = this.icons && this.icons[0];
    if (!first || !first.showThumbnail || this._items.length < 1) {
        origGetPreferredHeight.call(this, actor, forWidth, alloc);
        return;
    }

    let scale = global.ui_scale;
    let itemNode = this._items[0].get_theme_node();
    let itemHPad = itemNode.get_horizontal_padding() +
        itemNode.get_border_width(St.Side.LEFT) + itemNode.get_border_width(St.Side.RIGHT);
    let itemVPad = itemNode.get_vertical_padding() +
        itemNode.get_border_width(St.Side.TOP) + itemNode.get_border_width(St.Side.BOTTOM);
    let [, titleH] = first._titleBin.get_preferred_height(-1);

    if (!this._thumbWidth) {
        let n = this._items.length;
        let totalSpacing = Math.max(0, this._list.spacing) * (n - 1);
        let listNode = this.actor.get_theme_node();
        let parentPadding = this.actor.get_parent().get_theme_node().get_horizontal_padding();
        let availWidth = this._activeMonitor.width - parentPadding - listNode.get_horizontal_padding();
        let availHeight = this._activeMonitor.height * MAX_SCREEN_HEIGHT_FRACTION -
            listNode.get_vertical_padding() - itemVPad - titleH;

        let width = ((availWidth - totalSpacing) / n - itemHPad) / scale;
        width = Math.min(width, MAX_THUMB_WIDTH, availHeight / (THUMB_HEIGHT_RATIO * scale));
        this._thumbWidth = Math.floor(Math.max(width, MIN_THUMB_WIDTH));

        for (let icon of this.icons)
            icon.set_size(this._thumbWidth);
    }

    let height = Math.round(this._thumbWidth * THUMB_HEIGHT_RATIO * scale) + titleH + itemVPad;
    alloc.min_size = height;
    alloc.natural_size = height;
}

function init(metadata) {}

function enable() {
    let AppIcon = ClassicSwitcher.AppIcon.prototype;
    let AppList = ClassicSwitcher.AppList.prototype;
    // Save the originals only once, so re-enabling never captures our own patches.
    if (!origInit) {
        origInit = AppIcon._init;
        origSetSize = AppIcon.set_size;
        origGetPreferredHeight = AppList._getPreferredHeight;
        origListInit = AppList._init;
        origHighlight = AppList.highlight;
    }
    AppIcon._init = patchedInit;
    AppIcon.set_size = patchedSetSize;
    AppList._getPreferredHeight = patchedGetPreferredHeight;
    AppList._init = patchedListInit;
    AppList.highlight = patchedHighlight;
}

function disable() {
    let AppIcon = ClassicSwitcher.AppIcon.prototype;
    let AppList = ClassicSwitcher.AppList.prototype;
    // Keep the saved originals: a switcher that is still open may call the patched functions.
    if (origInit) AppIcon._init = origInit;
    if (origSetSize) AppIcon.set_size = origSetSize;
    if (origGetPreferredHeight) AppList._getPreferredHeight = origGetPreferredHeight;
    if (origListInit) AppList._init = origListInit;
    if (origHighlight) AppList.highlight = origHighlight;
}
