/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.5, _('GPU Screen Recorder'));

            this.add_child(new St.Icon({
                icon_name: 'face-smile-symbolic',
                style_class: 'system-status-icon',
            }));

            let item = new PopupMenu.PopupMenuItem(_('Save Replay'));
            let enable = new PopupMenu.PopupSwitchMenuItem(_('Enable'), false);
            enable.connect('toggled', (item) => {
                if (item.state) {
                    GLib.spawn_command_line_sync('killall gpu-screen-recorder');
                    const getSinkProc = Gio.Subprocess.new(['pactl', 'get-default-sink'], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
                    getSinkProc.communicate_utf8_async(null, null, (proc1, res1) => {
                        let [, stdout, stderr] = getSinkProc.communicate_utf8_finish(res1);
                        const getSourceProc = Gio.Subprocess.new(['pactl', 'get-default-source'], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
                        getSourceProc.communicate_utf8_async(null, null, (proc2, res2) => {
                            let [, stdout2, stderr2] = getSourceProc.communicate_utf8_finish(res2);
                            console.log(stdout.trim() + '|' + stdout2.trim());
                            const prog = Gio.Subprocess.new(
                                ['gpu-screen-recorder', '-w', 'focused', '-s', '2560x1440', '-f', '60', '-r', '60', '-c', 'mp4', '-a', stdout.trim() + '.monitor|' + stdout2.trim(), '-o', '/home/nwright/Videos/Replay', '-v', 'no'],
                                null);
                        });
                    });
                } else {
                    try {
                        GLib.spawn_command_line_sync('killall gpu-screen-recorder');
                    } catch (error) {
                    }

                }
            }
            );
            item.connect('activate', () => {
                Main.notify(_('Replay saved'));
                GLib.spawn_command_line_async('killall -SIGUSR1 gpu-screen-recorder');
            });
            this.menu.addMenuItem(item);
            this.menu.addMenuItem(enable);
        }
    });

export default class IndicatorExampleExtension extends Extension {
    _saveReplay() {
        Main.notify(_('Replay saved'));
        GLib.spawn_command_line_async('killall -SIGUSR1 gpu-screen-recorder');
    }

    enable() {
        this._settings = this.getSettings("org.gnome.shell.extensions.gpu-screen-recorder-gnome");

        Main.wm.addKeybinding("save-replay-hotkey", this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this._saveReplay.bind(this));
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        Main.wm.removeKeybinding("save-replay-hotkey");
        this._indicator.destroy();
        this._indicator = null;
    }
}
