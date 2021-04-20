const { St, Clutter, Shell, Gio, Meta } = imports.gi;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GObject = imports.gi.GObject;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const ExtensionUtils = imports.misc.extensionUtils;
const appSys = Shell.AppSystem.get_default();

let nvidia_pop;

const Nvidia_pop = GObject.registerClass(
    class MyPopup extends PanelMenu.Button {

        constructor() {
            this.searchEntry = null;
            this.appList = null;
            this.pinnedApps = null;
            this.actionsBox = null;
            this.settings = null;
            this.stats = null;
            this.percentage = null;
            this.memoryUsage = null;
            this.boxProcesses = null;
            this.subItemStats = null;
        }

        _init() {
            super._init(0); //0 - dx, 1 - sx

            let icon = new St.Icon({
                gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/icon.ico'),
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

            //------------------------------ nvidia stats ------------------------------------------

            this.stats = this.getNvidiaStats();

            if (this.stats !== false) {
                this.subItemStats = new PopupMenu.PopupSubMenuMenuItem('Nvidia stats', true);
                this.subItemStats.icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/stat.ico');

                this.subItemStats.status = new St.Label({
                    text: this.stats.percentage,
                    y_expand: true,
                    y_align: Clutter.ActorAlign.CENTER
                });
                this.subItemStats.actor.insert_child_at_index(this.subItemStats.status, 4);

                //PERCENTAGE
                let usage = new PopupMenu.PopupBaseMenuItem({ reactive: false, style_class: 'stats' });
                usage.add(new St.Icon({
                    style_class: 'popup-menu-icon',
                    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/gpu.ico')
                }));
                usage.add(new St.Label({ text: 'GPU percentage:' }));
                this.percentage = new St.Label({
                    text: this.stats.percentage,
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    y_expand: true
                });
                usage.add(this.percentage);

                //MEMORY USAGE
                let memoryUsage = new PopupMenu.PopupBaseMenuItem({ reactive: false, style_class: 'stats' });
                memoryUsage.add(new St.Icon({
                    style_class: 'popup-menu-icon',
                    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/memory.ico')
                }));
                memoryUsage.add(new St.Label({ text: 'Total memory usage:' }));
                this.memoryUsage = new St.Label({
                    text: this.stats.memoryUsage,
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    y_expand: true
                });
                memoryUsage.add(this.memoryUsage);

                //PROCESSES
                let processes = new PopupMenu.PopupBaseMenuItem({ reactive: false, style_class: 'stats' });
                processes.add(new St.Icon({
                    style_class: 'popup-menu-icon',
                    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/processes.svg')
                }));
                processes.add(new St.Label({ text: 'Process name' }));
                processes.add(new St.Label({
                    text: 'Memory usage',
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    y_expand: true
                }));

                let processesMenuItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
                this.boxProcesses = new St.BoxLayout({
                    vertical: true,
                    x_expand: true,
                });
                processesMenuItem.add(this.boxProcesses);

                this.subItemStats.menu.addMenuItem(usage);
                this.subItemStats.menu.addMenuItem(memoryUsage);
                this.subItemStats.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                this.subItemStats.menu.addMenuItem(processes);
                this.subItemStats.menu.addMenuItem(processesMenuItem);

                this.menu.addMenuItem(this.subItemStats);
                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            } else {
                let popupImageMenuItem = new PopupMenu.PopupImageMenuItem(
                    'You must install nvidia-smi command for stats',
                    'security-high-symbolic',
                );
                this.menu.addMenuItem(popupImageMenuItem);
                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }

            //------------------------------ mvidia stats end --------------------------

            //------------------------------- app list -------------------------------------
            this.settings = getSettings();
            this.pinnedApps = this.settings.get_strv('pinned-apps');

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

            itemScroll.actor.add(scrollView, { expand: false });

            this.menu.addMenuItem(itemScroll);

            //----------------------- refresh app list on open ----------------------------
            let timeout;
            this.menu.connect('open-state-changed', (menu, open) => {
                if (open) {
                    timeout = Mainloop.timeout_add_seconds(1.0, () => { this.refreshStats(this.getNvidiaStats()); return true; });
                    this.listAllApps();
                    this.sortAppList(this.appList);
                    this.refreshActionsBox();
                } else {
                    Mainloop.source_remove(timeout);
                }
            });
        }

        getNvidiaStats() {
            try {
                let out = GLib.spawn_command_line_sync('nvidia-smi');
                out = out.toString();
                let ind = out.search('%');
                let percentage = out.slice(ind - 3, ind + 1).trim();

                ind = out.indexOf("MiB |");
                let memoryUsage = out.slice(ind - 18, ind + 3).trim();

                let processes = [];
                let processesMemory = [];
                while (ind + 5 < out.length && out.indexOf("MiB |", ind + 5) != -1) {
                    ind = out.indexOf("MiB |", ind + 5);
                    let temp = out.slice(ind - 40, ind + 3).trim();
                    processes.push(temp.slice(0, temp.indexOf('  ')).trim());
                    processesMemory.push(temp.slice(temp.length - 6, temp.length).trim());
                }

                return { percentage, memoryUsage, processes, processesMemory };
            } catch (error) {
                return false;
            }
        }

        refreshStats(newStats) {
            if (newStats === false) {
                return;
            }

            this.subItemStats.status.set_text(newStats.percentage);
            this.percentage.set_text(newStats.percentage);
            this.memoryUsage.set_text(newStats.memoryUsage);

            this.boxProcesses.destroy_all_children();
            for (let i = 0; i < newStats.processes.length; i++) {
                let process = new PopupMenu.PopupBaseMenuItem({ reactive: false, style_class: 'stats' });
                process.add(new St.Icon({
                    style_class: 'popup-menu-icon',
                    gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/icons/process.svg')
                }));
                process.add(new St.Label({ text: newStats.processes[i] }));
                process.add(new St.Label({
                    text: newStats.processesMemory[i],
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    y_expand: true
                }));

                this.boxProcesses.add(process);
            }
        }

        onSearchTextChanged() {
            let searchedText = this.searchEntry.get_text();
            //Main.notify('Nvidia app launcher', searchedText);

            if (searchedText === '') {
                this.refreshActionsBox();
            } else {
                this.actionsBox.destroy_all_children();

                this.fillActionsBox(
                    this.appList.filter(obj => obj.get_name().toLowerCase().indexOf(searchedText.toLowerCase()) >= 0)
                );
            }
        }

        fillActionsBox(appList) {
            appList.forEach(app => {
                app = Shell.AppSystem.get_default().lookup_app(app.get_id());

                let appIcon = app.create_icon_texture(100);
                let iconText = Me.dir.get_path() + '/icons/gear.ico';
                if (appIcon instanceof St.Icon && appIcon.gicon != null) {
                    iconText = appIcon.gicon.to_string();
                }

                let app_box = new St.BoxLayout({
                    vertical: false
                });

                let appItem = new PopupMenu.PopupImageMenuItem(
                    app.get_name(),
                    Gio.icon_new_for_string(iconText),
                    { style_class: "app_name" }
                );

                appItem.connect('activate', () => {
                    Main.notify('Nvidia app launcher', 'Launching ' + app.get_name() + '...');
                    GLib.spawn_command_line_async(Me.dir.get_path() + '/nvidia_launch.sh ' + app.get_id());
                    this.menu.close();
                });

                let pin_button = new St.Bin({
                    reactive: true,
                    can_focus: true,
                    track_hover: true,
                    height: 30,
                    width: 30
                });

                let pin_ico = new St.Icon({
                    gicon: Gio.icon_new_for_string(Me.dir.get_path() + (!this.pinnedApps.includes(app.get_id()) ? '/icons/pin.ico' : '/icons/unpin.ico')),
                });

                pin_button.set_child(pin_ico);

                pin_button.connect('button-press-event', () => {
                    if (!this.pinnedApps.includes(app.get_id())) {
                        this.pinApp(app.get_id());
                    } else {
                        this.unpinApp(app.get_id());
                    }

                    this.searchEntry.set_text('');
                    this.refreshActionsBox();
                });

                app_box.add(appItem);
                app_box.add(pin_button);

                this.actionsBox.add(app_box);
            });
        }

        pinApp(app_id) {
            this.pinnedApps.push(app_id);
            this.settings.set_strv('pinned-apps', this.pinnedApps);
        }

        unpinApp(app_id) {
            let index = this.pinnedApps.indexOf(app_id);
            if (index !== -1) {
                this.pinnedApps.splice(index, 1);
                this.settings.set_strv('pinned-apps', this.pinnedApps);
            }
        }

        refreshActionsBox() {
            this.actionsBox.destroy_all_children();

            let pinned = this.appList.filter(app => this.pinnedApps.includes(app.get_id()));
            let notPinned = this.appList.filter(app => !this.pinnedApps.includes(app.get_id()));

            if (pinned.length > 0) {
                this.sortAppList(pinned);
                this.fillActionsBox(pinned);
                this.actionsBox.add(new PopupMenu.PopupSeparatorMenuItem());
            }

            this.fillActionsBox(notPinned);
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

        sortAppList(appList) {
            appList.sort(function (a, b) {
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