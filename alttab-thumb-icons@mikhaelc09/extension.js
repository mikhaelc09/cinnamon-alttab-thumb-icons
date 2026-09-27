const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Pango = imports.gi.Pango;
const Cinnamon = imports.gi.Cinnamon;
const ClassicSwitcher = imports.ui.appSwitcher.classicSwitcher;

let origInit = null;
let origSetSize = null;
let origGetPreferredHeight = null;

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

    this._titleBin = new St.Bin({ x_align: St.Align.MIDDLE, style: 'padding-top: 10px;' });
    this._titleBin.add_actor(this.label);
    this.actor.add(this._titleBin);
}

function patchedSetSize(size) {
    origSetSize.call(this, size);
    // Keep long titles from widening the item past the thumbnail.
    if (this._titleBin)
        this._titleBin.set_width(size * global.ui_scale);
}

function patchedGetPreferredHeight(actor, forWidth, alloc) {
    origGetPreferredHeight.call(this, actor, forWidth, alloc);
    // The original only reserves room for the bare label; account for the title's padding too.
    let first = this.icons && this.icons[0];
    if (first && first._titleBin) {
        let [, labelH] = first.label.get_preferred_height(-1);
        let [, rowH] = first._titleBin.get_preferred_height(-1);
        let extra = Math.max(0, rowH - labelH);
        alloc.min_size += extra;
        alloc.natural_size += extra;
    }
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
    }
    AppIcon._init = patchedInit;
    AppIcon.set_size = patchedSetSize;
    AppList._getPreferredHeight = patchedGetPreferredHeight;
}

function disable() {
    let AppIcon = ClassicSwitcher.AppIcon.prototype;
    let AppList = ClassicSwitcher.AppList.prototype;
    // Keep the saved originals: a switcher that is still open may call the patched functions.
    if (origInit) AppIcon._init = origInit;
    if (origSetSize) AppIcon.set_size = origSetSize;
    if (origGetPreferredHeight) AppList._getPreferredHeight = origGetPreferredHeight;
}
