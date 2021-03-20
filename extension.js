const { St, Clutter, Shell, Gio, Meta } = imports.gi;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GObject = imports.gi.GObject;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const appSys = Shell.AppSystem.get_default();

let nvidia_pop;

const Nvidia_pop = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {

        constructor() {
            this.searchEntry = null;
            this.appList = null;
            this.actionsBox = null;
        }

        _init() {
            super._init(0); //0 - dx, 1 - sx

            let icon = new St.Icon({
                gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icon.ico'),
                style_class: 'system-status-icon',
            });

            this.add_child(icon);

            // ----------------------------- search box --------------------------------------------
            let itemSB = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });

            this.searchEntry = new St.Entry({
                name: 'searchEntry',
                style_class: 'search-entry',
                can_focus: true,
                hint_text: _('Type here to search...'),
                track_hover: true
            });

            this.searchEntry.get_clutter_text().connect(
                'text-changed',
                () => {
                    this.onSearchTextChanged();
                }
            );

            itemSB.actor.add(this.searchEntry, { expand: true });

            this.menu.addMenuItem(itemSB);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            //focus search on open
            this.menu.connect('open-state-changed', (self, open) => {
                let a = Mainloop.timeout_add(50, () => {
                    if (open) {
                        this.searchEntry.set_text('');
                        global.stage.set_key_focus(this.searchEntry);
                    }

                    Mainloop.source_remove(a);
                });
            });
            //------------------------------ search box - end -----------------------------------------

            //------------------------------- app list -------------------------------------
            this.listAllApps();
            this.sortAppList();

            let itemScroll = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });

            let scrollView = new St.ScrollView({
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.END,
                hscrollbar_policy: St.PolicyType.AUTOMATIC,
                vscrollbar_policy: St.PolicyType.AUTOMATIC,
                clip_to_allocation: true,
                overlay_scrollbars: true,
                style_class: 'hfade',
            });

            scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);
            this.actionsBox = new St.BoxLayout({
                vertical: true
            });

            scrollView.add_actor(this.actionsBox);
            scrollView.clip_to_allocation = true;

            this.fillActionsBox(this.appList);

            itemScroll.actor.add(scrollView, { expand: false });

            this.menu.addMenuItem(itemScroll);
        }

        onSearchTextChanged() {
            let searchedText = this.searchEntry.get_text();
            this.actionsBox.destroy_all_children();

            if (searchedText === '') {
                this.fillActionsBox(this.appList);
            } else {
                this.fillActionsBox(
                    this.appList.filter(obj => obj.get_name().toLowerCase().indexOf(searchedText.toLowerCase()) >= 0)
                );
            }
        }

        fillActionsBox(appList) {
            appList.forEach(app => {
                app = Shell.AppSystem.get_default().lookup_app(app.get_id());

                let appIcon = app.create_icon_texture(100);
                let iconText;
                if (appIcon instanceof St.Icon) {
                    iconText = appIcon.gicon.to_string();
                }

                let appItem = new PopupMenu.PopupImageMenuItem(
                    app.get_name(),
                    Gio.icon_new_for_string(iconText),
                );

                appItem.connect('activate', () => {
                    GLib.spawn_command_line_async(Me.dir.get_path() + '/nvidia_launch.sh ' + app.get_id());
                });

                this.actionsBox.add(appItem);
            });
        }

        listAllApps() {
            this.appList = appSys.get_installed().filter(appInfo => {
                try {
                    appInfo.get_id(); // catch invalid file encodings
                } catch (e) {
                    return false;
                }
                return appInfo.should_show();
            });
        }

        sortAppList() {
            this.appList.sort(function (a, b) {
                if (a.get_name().toLowerCase() > b.get_name().toLowerCase()) {
                    return 1;
                }
                if (b.get_name().toLowerCase() > a.get_name().toLowerCase()) {
                    return -1;
                }
                return 0;
            });
        }
    }
);

function getSettings() {
    let GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child("schemas").get_path(),
        GioSSS.get_default(),
        false
    );
    let schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.nvidia-app-launcher',
        true
    );

    if (!schemaObj) {
        throw new Error('cannot find schemas');
    }

    return new Gio.Settings({ settings_schema: schemaObj });
}

function init() {

}

function enable() {
    let mode = Shell.ActionMode.ALL;
    let flag = Meta.KeyBindingFlags.NONE;
    let settings = getSettings();

    nvidia_pop = new Nvidia_pop();
    Main.panel.addToStatusArea('nvidia_pop', nvidia_pop, 0);

    Main.wm.addKeybinding("nal-sc", settings, flag, mode, () => {
        Main.panel._toggleMenu(nvidia_pop);
    });
}

function disable() {
    Main.wm.removeKeybinding("nal-sc");
    nvidia_pop.destroy();
}