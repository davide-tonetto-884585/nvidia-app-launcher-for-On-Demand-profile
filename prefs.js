const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {

}

function buildPrefsWidget() {
    let widget = new NvidiaLauncherPrefsWidget();
    widget.show_all();
    return widget;
}

const NvidiaLauncherPrefsWidget = new GObject.Class({

    Name: "NvidiaLauncher.Prefs.Widget",
    GTypeName: "NvidiaLauncherPrefsWidget",
    Extends: Gtk.Box,

    _init: function (params) {
        this.parent(params);
        this.margin = 24;
        this.row_spacing = 6;
        this.orientation = Gtk.Orientation.VERTICAL;

        let groupingLabel = '<b>%s</b>'.format('Open shortcut');
        this.add(new Gtk.Label({
            label: groupingLabel, use_markup: true,
            halign: Gtk.Align.START,
        }));

        let align = new Gtk.Alignment({ left_padding: 12 });
        this.add(align);

        let grid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 6,
            column_spacing: 6,
        });
        align.add(grid);

        //this._settings = ExtensionUtils.getSettings();
        //let currentMode = this._settings.get_as('nal-sc');

        let modeLabels = {
            "<![CDATA[['<Super>n']]]>": 'Super + n',
            "<![CDATA[['<Super>z']]]>": 'Super + z',
            "<![CDATA[['<Super>s']]]>": 'Super + s',
        };

        let radio = null;
        for (let i = 0; i < modeLabels.length; i++) {
            let mode = modeLabels[i];
            let label = modeLabels[mode];
            if (!label) {
                log('Unhandled option "%s" for grouping-mode'.format(mode));
                continue;
            }

            radio = new Gtk.RadioButton({
                active: 0 /*currentMode === mode*/,
                label,
                group: radio,
            });
            grid.add(radio);

            radio.connect('toggled', button => {
                if (button.active) {
                    //this._settings.set_as('nal-sc', mode);
                }
            });
        }
    }

});