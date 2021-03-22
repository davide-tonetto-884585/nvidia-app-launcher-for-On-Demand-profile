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

        let groupingLabel = '<b>%s</b>'.format('Shortcut command to open the extension:');
        let labTit = new Gtk.Label({
            label: groupingLabel, use_markup: true,
            halign: Gtk.Align.START,
        });

        let align = new Gtk.Alignment({ left_padding: 12 });
        //this.add(align);

        let grid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 6,
            column_spacing: 6,
        });

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.nvidia-app-launcher');
        let currentMode = this._settings.get_strv('nal-sc')[0];

        let modeLabels = {
            '<Super>n': 'Super + n',
            '<Super>z': 'Super + z',
            '<Super>b': 'Super + b',
        };
        let keys = Object.keys(modeLabels);

        /* let radio = null;
        for (let i = 0; i < keys.length; i++) {
            let mode = keys[i];
            let label = modeLabels[mode];

            radio = new Gtk.RadioButton({
                label,
                group: radio,
            });
            grid.add(radio);

            radio.connect('toggled', button => {
                if (button.active) {
                    this._settings.set_strv('nal-sc', [mode]);
                }
            });
        }

        align.add(grid); */

        grid.attach(labTit, 0, 0, 1, 1);
        let log_combo = new Gtk.ComboBoxText();

        for (let i = 0; i < keys.length; i++) {
            let mode = keys[i];
            let label = modeLabels[mode];
            log_combo.append(mode, label);
        }

        log_combo.set_active_id(`${currentMode}`);

        log_combo.connect("changed", () => {
            this._settings.set_strv('nal-sc', [log_combo.get_active_id()]);
        });

        grid.attach(log_combo, 1, 0, 1, 1)

        this.add(grid);
    }
});