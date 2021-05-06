'use strict';

var obsidian = require('obsidian');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var util = require('util');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            }
        });
    }
    n['default'] = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class TemplaterError extends Error {
    constructor(msg, console_msg) {
        super(msg);
        this.console_msg = console_msg;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

const DEFAULT_SETTINGS = {
    command_timeout: 5,
    template_folder: "",
    templates_pairs: [["", ""]],
    trigger_on_file_creation: false,
    enable_system_commands: false,
    shell_path: "",
    script_folder: undefined,
};
class TemplaterSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.app = app;
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        let desc;
        containerEl.empty();
        new obsidian.Setting(containerEl)
            .setName("Template folder location")
            .setDesc("Files in this folder will be available as templates.")
            .addText(text => {
            text.setPlaceholder("Example: folder 1/folder 2")
                .setValue(this.plugin.settings.template_folder)
                .onChange((new_folder) => {
                this.plugin.settings.template_folder = new_folder;
                this.plugin.saveSettings();
            });
        });
        new obsidian.Setting(containerEl)
            .setName("Timeout")
            .setDesc("Maximum timeout in seconds for a system command.")
            .addText(text => {
            text.setPlaceholder("Timeout")
                .setValue(this.plugin.settings.command_timeout.toString())
                .onChange((new_value) => {
                const new_timeout = Number(new_value);
                if (isNaN(new_timeout)) {
                    this.plugin.log_error(new TemplaterError("Timeout must be a number"));
                    return;
                }
                this.plugin.settings.command_timeout = new_timeout;
                this.plugin.saveSettings();
            });
        });
        desc = document.createDocumentFragment();
        desc.append("Templater provides multiples predefined variables / functions that you can use.", desc.createEl("br"), "Check the ", desc.createEl("a", {
            href: "https://silentvoid13.github.io/Templater/",
            text: "documentation"
        }), " to get a list of all the available internal variables / functions.");
        new obsidian.Setting(containerEl)
            .setName("Internal Variables and Functions")
            .setDesc(desc);
        desc = document.createDocumentFragment();
        desc.append("Templater will listen for the new file creation event, and replace every command it finds in the new file's content.", desc.createEl("br"), "This makes Templater compatible with other plugins like the Daily note core plugin, Calendar plugin, Review plugin, Note refactor plugin, ...", desc.createEl("br"), desc.createEl("b", {
            text: "Warning: ",
        }), "This can be dangerous if you create new files with unknown / unsafe content on creation. Make sure that every new file's content is safe on creation.");
        new obsidian.Setting(containerEl)
            .setName("Trigger Templater on new file creation")
            .setDesc(desc)
            .addToggle(toggle => {
            toggle
                .setValue(this.plugin.settings.trigger_on_file_creation)
                .onChange(trigger_on_file_creation => {
                this.plugin.settings.trigger_on_file_creation = trigger_on_file_creation;
                this.plugin.saveSettings();
                this.plugin.update_trigger_file_on_creation();
            });
        });
        desc = document.createDocumentFragment();
        desc.append("Allows you to create user functions linked to system commands.", desc.createEl("br"), desc.createEl("b", {
            text: "Warning: "
        }), "It can be dangerous to execute arbitrary system commands from untrusted sources. Only run system commands that you understand, from trusted sources.");
        desc = document.createDocumentFragment();
        desc.append("All JavaScript files in this folder will be loaded as CommonJS modules, to import custom user functions.", desc.createEl("br"), "The folder needs to be accessible from the vault.", desc.createEl("br"), "Check the ", desc.createEl("a", {
            href: "https://silentvoid13.github.io/Templater/",
            text: "documentation",
        }), " for more informations.");
        new obsidian.Setting(containerEl)
            .setName("Script files folder location")
            .setDesc(desc)
            .addText(text => {
            text.setPlaceholder("Example: folder 1/folder 2")
                .setValue(this.plugin.settings.script_folder)
                .onChange((new_folder) => {
                this.plugin.settings.script_folder = new_folder;
                this.plugin.saveSettings();
            });
        });
        new obsidian.Setting(containerEl)
            .setName("Enable System Commands")
            .setDesc(desc)
            .addToggle(toggle => {
            toggle
                .setValue(this.plugin.settings.enable_system_commands)
                .onChange(enable_system_commands => {
                this.plugin.settings.enable_system_commands = enable_system_commands;
                this.plugin.saveSettings();
                // Force refresh
                this.display();
            });
        });
        if (this.plugin.settings.enable_system_commands) {
            desc = document.createDocumentFragment();
            desc.append("Full path to the shell binary to execute the command with.", desc.createEl("br"), "This setting is optional and will default to the system's default shell if not specified.", desc.createEl("br"), "You can use forward slashes ('/') as path separators on all platforms if in doubt.");
            new obsidian.Setting(containerEl)
                .setName("Shell binary location")
                .setDesc(desc)
                .addText(text => {
                text.setPlaceholder("Example: /bin/bash, ...")
                    .setValue(this.plugin.settings.shell_path)
                    .onChange((shell_path) => {
                    this.plugin.settings.shell_path = shell_path;
                    this.plugin.saveSettings();
                });
            });
            let i = 1;
            this.plugin.settings.templates_pairs.forEach((template_pair) => {
                const div = containerEl.createEl('div');
                div.addClass("templater_div");
                const title = containerEl.createEl('h4', {
                    text: 'User Function n°' + i,
                });
                title.addClass("templater_title");
                const setting = new obsidian.Setting(containerEl)
                    .addExtraButton(extra => {
                    extra.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                        const index = this.plugin.settings.templates_pairs.indexOf(template_pair);
                        if (index > -1) {
                            this.plugin.settings.templates_pairs.splice(index, 1);
                            // Force refresh
                            this.plugin.saveSettings();
                            this.display();
                        }
                    });
                })
                    .addText(text => {
                    const t = text.setPlaceholder('Function name')
                        .setValue(template_pair[0])
                        .onChange((new_value) => {
                        const index = this.plugin.settings.templates_pairs.indexOf(template_pair);
                        if (index > -1) {
                            this.plugin.settings.templates_pairs[index][0] = new_value;
                            this.plugin.saveSettings();
                        }
                    });
                    t.inputEl.addClass("templater_template");
                    return t;
                })
                    .addTextArea(text => {
                    const t = text.setPlaceholder('System Command')
                        .setValue(template_pair[1])
                        .onChange((new_cmd) => {
                        const index = this.plugin.settings.templates_pairs.indexOf(template_pair);
                        if (index > -1) {
                            this.plugin.settings.templates_pairs[index][1] = new_cmd;
                            this.plugin.saveSettings();
                        }
                    });
                    t.inputEl.setAttr("rows", 4);
                    t.inputEl.addClass("templater_cmd");
                    return t;
                });
                setting.infoEl.remove();
                div.appendChild(title);
                div.appendChild(containerEl.lastChild);
                i += 1;
            });
            const div = containerEl.createEl('div');
            div.addClass("templater_div2");
            const setting = new obsidian.Setting(containerEl)
                .addButton(button => {
                const b = button.setButtonText("Add New User Function").onClick(() => {
                    this.plugin.settings.templates_pairs.push(["", ""]);
                    // Force refresh
                    this.display();
                });
                b.buttonEl.addClass("templater_button");
                return b;
            });
            setting.infoEl.remove();
            div.appendChild(containerEl.lastChild);
        }
    }
}

const obsidian_module = require("obsidian");
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function escapeRegExp$1(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function getTFilesFromFolder(app, folder_str) {
    folder_str = obsidian.normalizePath(folder_str);
    let folder = app.vault.getAbstractFileByPath(folder_str);
    if (!folder) {
        throw new TemplaterError(`${folder_str} folder doesn't exist`);
    }
    if (!(folder instanceof obsidian.TFolder)) {
        throw new TemplaterError(`${folder_str} is a file, not a folder`);
    }
    let files = [];
    obsidian.Vault.recurseChildren(folder, (file) => {
        if (file instanceof obsidian.TFile) {
            files.push(file);
        }
    });
    files.sort((a, b) => {
        return a.basename.localeCompare(b.basename);
    });
    return files;
}

var OpenMode;
(function (OpenMode) {
    OpenMode[OpenMode["InsertTemplate"] = 0] = "InsertTemplate";
    OpenMode[OpenMode["CreateNoteTemplate"] = 1] = "CreateNoteTemplate";
})(OpenMode || (OpenMode = {}));
class TemplaterFuzzySuggestModal extends obsidian.FuzzySuggestModal {
    constructor(app, plugin) {
        super(app);
        this.app = app;
        this.plugin = plugin;
    }
    getItems() {
        if (this.plugin.settings.template_folder === "") {
            return this.app.vault.getMarkdownFiles();
        }
        return getTFilesFromFolder(this.app, this.plugin.settings.template_folder);
    }
    getItemText(item) {
        return item.basename;
    }
    onChooseItem(item, _evt) {
        switch (this.open_mode) {
            case OpenMode.InsertTemplate:
                this.plugin.templater.append_template(item);
                break;
            case OpenMode.CreateNoteTemplate:
                this.plugin.templater.create_new_note_from_template(item, this.creation_folder);
                break;
        }
    }
    start() {
        try {
            this.open();
        }
        catch (e) {
            this.plugin.log_error(e);
        }
    }
    insert_template() {
        this.open_mode = OpenMode.InsertTemplate;
        this.start();
    }
    create_new_note_from_template(folder) {
        this.creation_folder = folder;
        this.open_mode = OpenMode.CreateNoteTemplate;
        this.start();
    }
}

const UNSUPPORTED_MOBILE_TEMPLATE = "Error_MobileUnsupportedTemplate";
const ICON_DATA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 51.1328 28.7"><path d="M0 15.14 0 10.15 18.67 1.51 18.67 6.03 4.72 12.33 4.72 12.76 18.67 19.22 18.67 23.74 0 15.14ZM33.6928 1.84C33.6928 1.84 33.9761 2.1467 34.5428 2.76C35.1094 3.38 35.3928 4.56 35.3928 6.3C35.3928 8.0466 34.8195 9.54 33.6728 10.78C32.5261 12.02 31.0995 12.64 29.3928 12.64C27.6862 12.64 26.2661 12.0267 25.1328 10.8C23.9928 9.5733 23.4228 8.0867 23.4228 6.34C23.4228 4.6 23.9995 3.1066 25.1528 1.86C26.2994.62 27.7261 0 29.4328 0C31.1395 0 32.5594.6133 33.6928 1.84M49.8228.67 29.5328 28.38 24.4128 28.38 44.7128.67 49.8228.67M31.0328 8.38C31.0328 8.38 31.1395 8.2467 31.3528 7.98C31.5662 7.7067 31.6728 7.1733 31.6728 6.38C31.6728 5.5867 31.4461 4.92 30.9928 4.38C30.5461 3.84 29.9995 3.57 29.3528 3.57C28.7061 3.57 28.1695 3.84 27.7428 4.38C27.3228 4.92 27.1128 5.5867 27.1128 6.38C27.1128 7.1733 27.3361 7.84 27.7828 8.38C28.2361 8.9267 28.7861 9.2 29.4328 9.2C30.0795 9.2 30.6128 8.9267 31.0328 8.38M49.4328 17.9C49.4328 17.9 49.7161 18.2067 50.2828 18.82C50.8495 19.4333 51.1328 20.6133 51.1328 22.36C51.1328 24.1 50.5594 25.59 49.4128 26.83C48.2595 28.0766 46.8295 28.7 45.1228 28.7C43.4228 28.7 42.0028 28.0833 40.8628 26.85C39.7295 25.6233 39.1628 24.1366 39.1628 22.39C39.1628 20.65 39.7361 19.16 40.8828 17.92C42.0361 16.6733 43.4628 16.05 45.1628 16.05C46.8694 16.05 48.2928 16.6667 49.4328 17.9M46.8528 24.52C46.8528 24.52 46.9595 24.3833 47.1728 24.11C47.3795 23.8367 47.4828 23.3033 47.4828 22.51C47.4828 21.7167 47.2595 21.05 46.8128 20.51C46.3661 19.97 45.8162 19.7 45.1628 19.7C44.5161 19.7 43.9828 19.97 43.5628 20.51C43.1428 21.05 42.9328 21.7167 42.9328 22.51C42.9328 23.3033 43.1561 23.9733 43.6028 24.52C44.0494 25.06 44.5961 25.33 45.2428 25.33C45.8895 25.33 46.4261 25.06 46.8528 24.52Z" fill="currentColor"/></svg>`;

class CursorJumper {
    constructor(app) {
        this.app = app;
        this.cursor_regex = new RegExp("<%\\s*tp.file.cursor\\((?<order>[0-9]{0,2})\\)\\s*%>", "g");
    }
    jump_to_next_cursor_location() {
        return __awaiter(this, void 0, void 0, function* () {
            const active_view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (!active_view) {
                return;
            }
            const active_file = active_view.file;
            yield active_view.save();
            const content = yield this.app.vault.read(active_file);
            const { new_content, positions } = this.replace_and_get_cursor_positions(content);
            if (positions) {
                yield this.app.vault.modify(active_file, new_content);
                this.set_cursor_location(positions);
            }
        });
    }
    get_editor_position_from_index(content, index) {
        const substr = content.substr(0, index);
        let l = 0;
        let offset = -1;
        let r = -1;
        for (; (r = substr.indexOf("\n", r + 1)) !== -1; l++, offset = r)
            ;
        offset += 1;
        const ch = content.substr(offset, index - offset).length;
        return { line: l, ch: ch };
    }
    replace_and_get_cursor_positions(content) {
        let cursor_matches = [];
        let match;
        while ((match = this.cursor_regex.exec(content)) != null) {
            cursor_matches.push(match);
        }
        if (cursor_matches.length === 0) {
            return {};
        }
        cursor_matches.sort((m1, m2) => {
            return Number(m1.groups["order"]) - Number(m2.groups["order"]);
        });
        const match_str = cursor_matches[0][0];
        cursor_matches = cursor_matches.filter(m => {
            return m[0] === match_str;
        });
        const positions = [];
        let index_offset = 0;
        for (let match of cursor_matches) {
            const index = match.index - index_offset;
            positions.push(this.get_editor_position_from_index(content, index));
            content = content.replace(new RegExp(escapeRegExp$1(match[0])), "");
            index_offset += match[0].length;
            // TODO: Remove this, breaking for now waiting for the new setSelections API
            break;
            /*
            // For tp.file.cursor(), we only find one
            if (match[1] === "") {
                break;
            }
            */
        }
        return { new_content: content, positions: positions };
    }
    set_cursor_location(positions) {
        const active_view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!active_view) {
            return;
        }
        // TODO: Remove this
        const editor = active_view.editor;
        editor.focus();
        editor.setCursor(positions[0]);
        /*
        let selections = [];
        for (let pos of positions) {
            selections.push({anchor: pos, head: pos});
        }
        editor.focus();
        editor.setSelections(selections);
        */
        /*
        // Check https://github.com/obsidianmd/obsidian-api/issues/14

        let editor = active_view.editor;
        editor.focus();

        for (let pos of positions) {
            let transaction: EditorTransaction = {
                selection: {
                    from: pos
                }
            };
            editor.transaction(transaction);
        }
        */
    }
}

function setPrototypeOf(obj, proto) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(obj, proto);
    }
    else {
        obj.__proto__ = proto;
    }
}
// This is pretty much the only way to get nice, extended Errors
// without using ES6
/**
 * This returns a new Error with a custom prototype. Note that it's _not_ a constructor
 *
 * @param message Error message
 *
 * **Example**
 *
 * ```js
 * throw EtaErr("template not found")
 * ```
 */
function EtaErr(message) {
    var err = new Error(message);
    setPrototypeOf(err, EtaErr.prototype);
    return err;
}
EtaErr.prototype = Object.create(Error.prototype, {
    name: { value: 'Eta Error', enumerable: false }
});
/**
 * Throws an EtaErr with a nicely formatted error and message showing where in the template the error occurred.
 */
function ParseErr(message, str, indx) {
    var whitespace = str.slice(0, indx).split(/\n/);
    var lineNo = whitespace.length;
    var colNo = whitespace[lineNo - 1].length + 1;
    message +=
        ' at line ' +
            lineNo +
            ' col ' +
            colNo +
            ':\n\n' +
            '  ' +
            str.split(/\n/)[lineNo - 1] +
            '\n' +
            '  ' +
            Array(colNo).join(' ') +
            '^';
    throw EtaErr(message);
}

/**
 * @returns The global Promise function
 */
var promiseImpl = new Function('return this')().Promise;
/**
 * @returns A new AsyncFunction constuctor
 */
function getAsyncFunctionConstructor() {
    try {
        return new Function('return (async function(){}).constructor')();
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            throw EtaErr("This environment doesn't support async/await");
        }
        else {
            throw e;
        }
    }
}
/**
 * str.trimLeft polyfill
 *
 * @param str - Input string
 * @returns The string with left whitespace removed
 *
 */
function trimLeft(str) {
    // eslint-disable-next-line no-extra-boolean-cast
    if (!!String.prototype.trimLeft) {
        return str.trimLeft();
    }
    else {
        return str.replace(/^\s+/, '');
    }
}
/**
 * str.trimRight polyfill
 *
 * @param str - Input string
 * @returns The string with right whitespace removed
 *
 */
function trimRight(str) {
    // eslint-disable-next-line no-extra-boolean-cast
    if (!!String.prototype.trimRight) {
        return str.trimRight();
    }
    else {
        return str.replace(/\s+$/, ''); // TODO: do we really need to replace BOM's?
    }
}

// TODO: allow '-' to trim up until newline. Use [^\S\n\r] instead of \s
/* END TYPES */
function hasOwnProp(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
function copyProps(toObj, fromObj) {
    for (var key in fromObj) {
        if (hasOwnProp(fromObj, key)) {
            toObj[key] = fromObj[key];
        }
    }
    return toObj;
}
/**
 * Takes a string within a template and trims it, based on the preceding tag's whitespace control and `config.autoTrim`
 */
function trimWS(str, config, wsLeft, wsRight) {
    var leftTrim;
    var rightTrim;
    if (Array.isArray(config.autoTrim)) {
        // kinda confusing
        // but _}} will trim the left side of the following string
        leftTrim = config.autoTrim[1];
        rightTrim = config.autoTrim[0];
    }
    else {
        leftTrim = rightTrim = config.autoTrim;
    }
    if (wsLeft || wsLeft === false) {
        leftTrim = wsLeft;
    }
    if (wsRight || wsRight === false) {
        rightTrim = wsRight;
    }
    if (!rightTrim && !leftTrim) {
        return str;
    }
    if (leftTrim === 'slurp' && rightTrim === 'slurp') {
        return str.trim();
    }
    if (leftTrim === '_' || leftTrim === 'slurp') {
        // console.log('trimming left' + leftTrim)
        // full slurp
        str = trimLeft(str);
    }
    else if (leftTrim === '-' || leftTrim === 'nl') {
        // nl trim
        str = str.replace(/^(?:\r\n|\n|\r)/, '');
    }
    if (rightTrim === '_' || rightTrim === 'slurp') {
        // full slurp
        str = trimRight(str);
    }
    else if (rightTrim === '-' || rightTrim === 'nl') {
        // nl trim
        str = str.replace(/(?:\r\n|\n|\r)$/, ''); // TODO: make sure this gets \r\n
    }
    return str;
}
/**
 * A map of special HTML characters to their XML-escaped equivalents
 */
var escMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
function replaceChar(s) {
    return escMap[s];
}
/**
 * XML-escapes an input value after converting it to a string
 *
 * @param str - Input value (usually a string)
 * @returns XML-escaped string
 */
function XMLEscape(str) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    // To deal with XSS. Based on Escape implementations of Mustache.JS and Marko, then customized.
    var newStr = String(str);
    if (/[&<>"']/.test(newStr)) {
        return newStr.replace(/[&<>"']/g, replaceChar);
    }
    else {
        return newStr;
    }
}

/* END TYPES */
var templateLitReg = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
var singleQuoteReg = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
var doubleQuoteReg = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;
/** Escape special regular expression characters inside a string */
function escapeRegExp(string) {
    // From MDN
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function parse(str, config) {
    var buffer = [];
    var trimLeftOfNextStr = false;
    var lastIndex = 0;
    var parseOptions = config.parse;
    if (config.plugins) {
        for (var i = 0; i < config.plugins.length; i++) {
            var plugin = config.plugins[i];
            if (plugin.processTemplate) {
                str = plugin.processTemplate(str, config);
            }
        }
    }
    /* Adding for EJS compatibility */
    if (config.rmWhitespace) {
        // Code taken directly from EJS
        // Have to use two separate replaces here as `^` and `$` operators don't
        // work well with `\r` and empty lines don't work well with the `m` flag.
        // Essentially, this replaces the whitespace at the beginning and end of
        // each line and removes multiple newlines.
        str = str.replace(/[\r\n]+/g, '\n').replace(/^\s+|\s+$/gm, '');
    }
    /* End rmWhitespace option */
    templateLitReg.lastIndex = 0;
    singleQuoteReg.lastIndex = 0;
    doubleQuoteReg.lastIndex = 0;
    function pushString(strng, shouldTrimRightOfString) {
        if (strng) {
            // if string is truthy it must be of type 'string'
            strng = trimWS(strng, config, trimLeftOfNextStr, // this will only be false on the first str, the next ones will be null or undefined
            shouldTrimRightOfString);
            if (strng) {
                // replace \ with \\, ' with \'
                // we're going to convert all CRLF to LF so it doesn't take more than one replace
                strng = strng.replace(/\\|'/g, '\\$&').replace(/\r\n|\n|\r/g, '\\n');
                buffer.push(strng);
            }
        }
    }
    var prefixes = [parseOptions.exec, parseOptions.interpolate, parseOptions.raw].reduce(function (accumulator, prefix) {
        if (accumulator && prefix) {
            return accumulator + '|' + escapeRegExp(prefix);
        }
        else if (prefix) {
            // accumulator is falsy
            return escapeRegExp(prefix);
        }
        else {
            // prefix and accumulator are both falsy
            return accumulator;
        }
    }, '');
    var parseOpenReg = new RegExp('([^]*?)' + escapeRegExp(config.tags[0]) + '(-|_)?\\s*(' + prefixes + ')?\\s*', 'g');
    var parseCloseReg = new RegExp('\'|"|`|\\/\\*|(\\s*(-|_)?' + escapeRegExp(config.tags[1]) + ')', 'g');
    // TODO: benchmark having the \s* on either side vs using str.trim()
    var m;
    while ((m = parseOpenReg.exec(str))) {
        lastIndex = m[0].length + m.index;
        var precedingString = m[1];
        var wsLeft = m[2];
        var prefix = m[3] || ''; // by default either ~, =, or empty
        pushString(precedingString, wsLeft);
        parseCloseReg.lastIndex = lastIndex;
        var closeTag = void 0;
        var currentObj = false;
        while ((closeTag = parseCloseReg.exec(str))) {
            if (closeTag[1]) {
                var content = str.slice(lastIndex, closeTag.index);
                parseOpenReg.lastIndex = lastIndex = parseCloseReg.lastIndex;
                trimLeftOfNextStr = closeTag[2];
                var currentType = prefix === parseOptions.exec
                    ? 'e'
                    : prefix === parseOptions.raw
                        ? 'r'
                        : prefix === parseOptions.interpolate
                            ? 'i'
                            : '';
                currentObj = { t: currentType, val: content };
                break;
            }
            else {
                var char = closeTag[0];
                if (char === '/*') {
                    var commentCloseInd = str.indexOf('*/', parseCloseReg.lastIndex);
                    if (commentCloseInd === -1) {
                        ParseErr('unclosed comment', str, closeTag.index);
                    }
                    parseCloseReg.lastIndex = commentCloseInd;
                }
                else if (char === "'") {
                    singleQuoteReg.lastIndex = closeTag.index;
                    var singleQuoteMatch = singleQuoteReg.exec(str);
                    if (singleQuoteMatch) {
                        parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
                    }
                    else {
                        ParseErr('unclosed string', str, closeTag.index);
                    }
                }
                else if (char === '"') {
                    doubleQuoteReg.lastIndex = closeTag.index;
                    var doubleQuoteMatch = doubleQuoteReg.exec(str);
                    if (doubleQuoteMatch) {
                        parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
                    }
                    else {
                        ParseErr('unclosed string', str, closeTag.index);
                    }
                }
                else if (char === '`') {
                    templateLitReg.lastIndex = closeTag.index;
                    var templateLitMatch = templateLitReg.exec(str);
                    if (templateLitMatch) {
                        parseCloseReg.lastIndex = templateLitReg.lastIndex;
                    }
                    else {
                        ParseErr('unclosed string', str, closeTag.index);
                    }
                }
            }
        }
        if (currentObj) {
            buffer.push(currentObj);
        }
        else {
            ParseErr('unclosed tag', str, m.index + precedingString.length);
        }
    }
    pushString(str.slice(lastIndex, str.length), false);
    if (config.plugins) {
        for (var i = 0; i < config.plugins.length; i++) {
            var plugin = config.plugins[i];
            if (plugin.processAST) {
                buffer = plugin.processAST(buffer, config);
            }
        }
    }
    return buffer;
}

/* END TYPES */
/**
 * Compiles a template string to a function string. Most often users just use `compile()`, which calls `compileToString` and creates a new function using the result
 *
 * **Example**
 *
 * ```js
 * compileToString("Hi <%= it.user %>", eta.config)
 * // "var tR='',include=E.include.bind(E),includeFile=E.includeFile.bind(E);tR+='Hi ';tR+=E.e(it.user);if(cb){cb(null,tR)} return tR"
 * ```
 */
function compileToString(str, config) {
    var buffer = parse(str, config);
    var res = "var tR='',__l,__lP" +
        (config.include ? ',include=E.include.bind(E)' : '') +
        (config.includeFile ? ',includeFile=E.includeFile.bind(E)' : '') +
        '\nfunction layout(p,d){__l=p;__lP=d}\n' +
        (config.globalAwait ? 'const _prs = [];\n' : '') +
        (config.useWith ? 'with(' + config.varName + '||{}){' : '') +
        compileScope(buffer, config) +
        (config.includeFile
            ? 'if(__l)tR=' +
                (config.async ? 'await ' : '') +
                ("includeFile(__l,Object.assign(" + config.varName + ",{body:tR},__lP))\n")
            : config.include
                ? 'if(__l)tR=' +
                    (config.async ? 'await ' : '') +
                    ("include(__l,Object.assign(" + config.varName + ",{body:tR},__lP))\n")
                : '') +
        'if(cb){cb(null,tR)} return tR' +
        (config.useWith ? '}' : '');
    if (config.plugins) {
        for (var i = 0; i < config.plugins.length; i++) {
            var plugin = config.plugins[i];
            if (plugin.processFnString) {
                res = plugin.processFnString(res, config);
            }
        }
    }
    return res;
}
/**
 * Loops through the AST generated by `parse` and transform each item into JS calls
 *
 * **Example**
 *
 * ```js
 * // AST version of 'Hi <%= it.user %>'
 * let templateAST = ['Hi ', { val: 'it.user', t: 'i' }]
 * compileScope(templateAST, eta.config)
 * // "tR+='Hi ';tR+=E.e(it.user);"
 * ```
 */
function compileScope(buff, config) {
    var i;
    var buffLength = buff.length;
    var returnStr = '';
    var REPLACEMENT_STR = "rJ2KqXzxQg";
    for (i = 0; i < buffLength; i++) {
        var currentBlock = buff[i];
        if (typeof currentBlock === 'string') {
            var str = currentBlock;
            // we know string exists
            returnStr += "tR+='" + str + "'\n";
        }
        else {
            var type = currentBlock.t; // ~, s, !, ?, r
            var content = currentBlock.val || '';
            if (type === 'r') {
                // raw
                if (config.globalAwait) {
                    returnStr += "_prs.push(" + content + ");\n";
                    returnStr += "tR+='" + REPLACEMENT_STR + "'\n";
                }
                else {
                    if (config.filter) {
                        content = 'E.filter(' + content + ')';
                    }
                    returnStr += 'tR+=' + content + '\n';
                }
            }
            else if (type === 'i') {
                // interpolate
                if (config.globalAwait) {
                    returnStr += "_prs.push(" + content + ");\n";
                    returnStr += "tR+='" + REPLACEMENT_STR + "'\n";
                }
                else {
                    if (config.filter) {
                        content = 'E.filter(' + content + ')';
                    }
                    returnStr += 'tR+=' + content + '\n';
                    if (config.autoEscape) {
                        content = 'E.e(' + content + ')';
                    }
                    returnStr += 'tR+=' + content + '\n';
                }
            }
            else if (type === 'e') {
                // execute
                returnStr += content + '\n'; // you need a \n in case you have <% } %>
            }
        }
    }
    if (config.globalAwait) {
        returnStr += "const _rst = await Promise.all(_prs);\ntR = tR.replace(/" + REPLACEMENT_STR + "/g, () => _rst.shift());\n";
    }
    return returnStr;
}

/**
 * Handles storage and accessing of values
 *
 * In this case, we use it to store compiled template functions
 * Indexed by their `name` or `filename`
 */
var Cacher = /** @class */ (function () {
    function Cacher(cache) {
        this.cache = cache;
    }
    Cacher.prototype.define = function (key, val) {
        this.cache[key] = val;
    };
    Cacher.prototype.get = function (key) {
        // string | array.
        // TODO: allow array of keys to look down
        // TODO: create plugin to allow referencing helpers, filters with dot notation
        return this.cache[key];
    };
    Cacher.prototype.remove = function (key) {
        delete this.cache[key];
    };
    Cacher.prototype.reset = function () {
        this.cache = {};
    };
    Cacher.prototype.load = function (cacheObj) {
        copyProps(this.cache, cacheObj);
    };
    return Cacher;
}());

/* END TYPES */
/**
 * Eta's template storage
 *
 * Stores partials and cached templates
 */
var templates = new Cacher({});

/* END TYPES */
/**
 * Include a template based on its name (or filepath, if it's already been cached).
 *
 * Called like `include(templateNameOrPath, data)`
 */
function includeHelper(templateNameOrPath, data) {
    var template = this.templates.get(templateNameOrPath);
    if (!template) {
        throw EtaErr('Could not fetch template "' + templateNameOrPath + '"');
    }
    return template(data, this);
}
/** Eta's base (global) configuration */
var config = {
    async: false,
    autoEscape: true,
    autoTrim: [false, 'nl'],
    cache: false,
    e: XMLEscape,
    include: includeHelper,
    parse: {
        exec: '',
        interpolate: '=',
        raw: '~'
    },
    plugins: [],
    rmWhitespace: false,
    tags: ['<%', '%>'],
    templates: templates,
    useWith: false,
    varName: 'it'
};
/**
 * Takes one or two partial (not necessarily complete) configuration objects, merges them 1 layer deep into eta.config, and returns the result
 *
 * @param override Partial configuration object
 * @param baseConfig Partial configuration object to merge before `override`
 *
 * **Example**
 *
 * ```js
 * let customConfig = getConfig({tags: ['!#', '#!']})
 * ```
 */
function getConfig(override, baseConfig) {
    // TODO: run more tests on this
    var res = {}; // Linked
    copyProps(res, config); // Creates deep clone of eta.config, 1 layer deep
    if (baseConfig) {
        copyProps(res, baseConfig);
    }
    if (override) {
        copyProps(res, override);
    }
    return res;
}

/* END TYPES */
/**
 * Takes a template string and returns a template function that can be called with (data, config, [cb])
 *
 * @param str - The template string
 * @param config - A custom configuration object (optional)
 *
 * **Example**
 *
 * ```js
 * let compiledFn = eta.compile("Hi <%= it.user %>")
 * // function anonymous()
 * let compiledFnStr = compiledFn.toString()
 * // "function anonymous(it,E,cb\n) {\nvar tR='',include=E.include.bind(E),includeFile=E.includeFile.bind(E);tR+='Hi ';tR+=E.e(it.user);if(cb){cb(null,tR)} return tR\n}"
 * ```
 */
function compile(str, config) {
    var options = getConfig(config || {});
    /* ASYNC HANDLING */
    // The below code is modified from mde/ejs. All credit should go to them.
    var ctor = options.async ? getAsyncFunctionConstructor() : Function;
    /* END ASYNC HANDLING */
    try {
        return new ctor(options.varName, 'E', // EtaConfig
        'cb', // optional callback
        compileToString(str, options)); // eslint-disable-line no-new-func
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            throw EtaErr('Bad template syntax\n\n' +
                e.message +
                '\n' +
                Array(e.message.length + 1).join('=') +
                '\n' +
                compileToString(str, options) +
                '\n' // This will put an extra newline before the callstack for extra readability
            );
        }
        else {
            throw e;
        }
    }
}

var _BOM = /^\uFEFF/;
/* END TYPES */
/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * If `name` does not have an extension, it will default to `.eta`
 *
 * @param name specified path
 * @param parentfile parent file path
 * @param isDirectory whether parentfile is a directory
 * @return absolute path to template
 */
function getWholeFilePath(name, parentfile, isDirectory) {
    var includePath = path__namespace.resolve(isDirectory ? parentfile : path__namespace.dirname(parentfile), // returns directory the parent file is in
    name // file
    ) + (path__namespace.extname(name) ? '' : '.eta');
    return includePath;
}
/**
 * Get the absolute path to an included template
 *
 * If this is called with an absolute path (for example, starting with '/' or 'C:\')
 * then Eta will attempt to resolve the absolute path within options.views. If it cannot,
 * Eta will fallback to options.root or '/'
 *
 * If this is called with a relative path, Eta will:
 * - Look relative to the current template (if the current template has the `filename` property)
 * - Look inside each directory in options.views
 *
 * Note: if Eta is unable to find a template using path and options, it will throw an error.
 *
 * @param path    specified path
 * @param options compilation options
 * @return absolute path to template
 */
function getPath(path, options) {
    var includePath = false;
    var views = options.views;
    var searchedPaths = [];
    // If these four values are the same,
    // getPath() will return the same result every time.
    // We can cache the result to avoid expensive
    // file operations.
    var pathOptions = JSON.stringify({
        filename: options.filename,
        path: path,
        root: options.root,
        views: options.views
    });
    if (options.cache && options.filepathCache && options.filepathCache[pathOptions]) {
        // Use the cached filepath
        return options.filepathCache[pathOptions];
    }
    /** Add a filepath to the list of paths we've checked for a template */
    function addPathToSearched(pathSearched) {
        if (!searchedPaths.includes(pathSearched)) {
            searchedPaths.push(pathSearched);
        }
    }
    /**
     * Take a filepath (like 'partials/mypartial.eta'). Attempt to find the template file inside `views`;
     * return the resulting template file path, or `false` to indicate that the template was not found.
     *
     * @param views the filepath that holds templates, or an array of filepaths that hold templates
     * @param path the path to the template
     */
    function searchViews(views, path) {
        var filePath;
        // If views is an array, then loop through each directory
        // And attempt to find the template
        if (Array.isArray(views) &&
            views.some(function (v) {
                filePath = getWholeFilePath(path, v, true);
                addPathToSearched(filePath);
                return fs.existsSync(filePath);
            })) {
            // If the above returned true, we know that the filePath was just set to a path
            // That exists (Array.some() returns as soon as it finds a valid element)
            return filePath;
        }
        else if (typeof views === 'string') {
            // Search for the file if views is a single directory
            filePath = getWholeFilePath(path, views, true);
            addPathToSearched(filePath);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        // Unable to find a file
        return false;
    }
    // Path starts with '/', 'C:\', etc.
    var match = /^[A-Za-z]+:\\|^\//.exec(path);
    // Absolute path, like /partials/partial.eta
    if (match && match.length) {
        // We have to trim the beginning '/' off the path, or else
        // path.resolve(dir, path) will always resolve to just path
        var formattedPath = path.replace(/^\/*/, '');
        // First, try to resolve the path within options.views
        includePath = searchViews(views, formattedPath);
        if (!includePath) {
            // If that fails, searchViews will return false. Try to find the path
            // inside options.root (by default '/', the base of the filesystem)
            var pathFromRoot = getWholeFilePath(formattedPath, options.root || '/', true);
            addPathToSearched(pathFromRoot);
            includePath = pathFromRoot;
        }
    }
    else {
        // Relative paths
        // Look relative to a passed filename first
        if (options.filename) {
            var filePath = getWholeFilePath(path, options.filename);
            addPathToSearched(filePath);
            if (fs.existsSync(filePath)) {
                includePath = filePath;
            }
        }
        // Then look for the template in options.views
        if (!includePath) {
            includePath = searchViews(views, path);
        }
        if (!includePath) {
            throw EtaErr('Could not find the template "' + path + '". Paths tried: ' + searchedPaths);
        }
    }
    // If caching and filepathCache are enabled,
    // cache the input & output of this function.
    if (options.cache && options.filepathCache) {
        options.filepathCache[pathOptions] = includePath;
    }
    return includePath;
}
/**
 * Reads a file synchronously
 */
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath).toString().replace(_BOM, ''); // TODO: is replacing BOM's necessary?
    }
    catch (_a) {
        throw EtaErr("Failed to read template at '" + filePath + "'");
    }
}

// express is set like: app.engine('html', require('eta').renderFile)
/* END TYPES */
/**
 * Reads a template, compiles it into a function, caches it if caching isn't disabled, returns the function
 *
 * @param filePath Absolute path to template file
 * @param options Eta configuration overrides
 * @param noCache Optionally, make Eta not cache the template
 */
function loadFile(filePath, options, noCache) {
    var config = getConfig(options);
    var template = readFile(filePath);
    try {
        var compiledTemplate = compile(template, config);
        if (!noCache) {
            config.templates.define(config.filename, compiledTemplate);
        }
        return compiledTemplate;
    }
    catch (e) {
        throw EtaErr('Loading file: ' + filePath + ' failed:\n\n' + e.message);
    }
}
/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @param options   compilation options
 * @return Eta template function
 */
function handleCache$1(options) {
    var filename = options.filename;
    if (options.cache) {
        var func = options.templates.get(filename);
        if (func) {
            return func;
        }
        return loadFile(filename, options);
    }
    // Caching is disabled, so pass noCache = true
    return loadFile(filename, options, true);
}
/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * This returns a template function and the config object with which that template function should be called.
 *
 * @remarks
 *
 * It's important that this returns a config object with `filename` set.
 * Otherwise, the included file would not be able to use relative paths
 *
 * @param path path for the specified file (if relative, specify `views` on `options`)
 * @param options compilation options
 * @return [Eta template function, new config object]
 */
function includeFile(path, options) {
    // the below creates a new options object, using the parent filepath of the old options object and the path
    var newFileOptions = getConfig({ filename: getPath(path, options) }, options);
    // TODO: make sure properties are currectly copied over
    return [handleCache$1(newFileOptions), newFileOptions];
}

/* END TYPES */
/**
 * Called with `includeFile(path, data)`
 */
function includeFileHelper(path, data) {
    var templateAndConfig = includeFile(path, this);
    return templateAndConfig[0](data, templateAndConfig[1]);
}

/* END TYPES */
function handleCache(template, options) {
    if (options.cache && options.name && options.templates.get(options.name)) {
        return options.templates.get(options.name);
    }
    var templateFunc = typeof template === 'function' ? template : compile(template, options);
    // Note that we don't have to check if it already exists in the cache;
    // it would have returned earlier if it had
    if (options.cache && options.name) {
        options.templates.define(options.name, templateFunc);
    }
    return templateFunc;
}
/**
 * Render a template
 *
 * If `template` is a string, Eta will compile it to a function and then call it with the provided data.
 * If `template` is a template function, Eta will call it with the provided data.
 *
 * If `config.async` is `false`, Eta will return the rendered template.
 *
 * If `config.async` is `true` and there's a callback function, Eta will call the callback with `(err, renderedTemplate)`.
 * If `config.async` is `true` and there's not a callback function, Eta will return a Promise that resolves to the rendered template.
 *
 * If `config.cache` is `true` and `config` has a `name` or `filename` property, Eta will cache the template on the first render and use the cached template for all subsequent renders.
 *
 * @param template Template string or template function
 * @param data Data to render the template with
 * @param config Optional config options
 * @param cb Callback function
 */
function render(template, data, config, cb) {
    var options = getConfig(config || {});
    if (options.async) {
        if (cb) {
            // If user passes callback
            try {
                // Note: if there is an error while rendering the template,
                // It will bubble up and be caught here
                var templateFn = handleCache(template, options);
                templateFn(data, options, cb);
            }
            catch (err) {
                return cb(err);
            }
        }
        else {
            // No callback, try returning a promise
            if (typeof promiseImpl === 'function') {
                return new promiseImpl(function (resolve, reject) {
                    try {
                        resolve(handleCache(template, options)(data, options));
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
            else {
                throw EtaErr("Please provide a callback function, this env doesn't support Promises");
            }
        }
    }
    else {
        return handleCache(template, options)(data, options);
    }
}
/**
 * Render a template asynchronously
 *
 * If `template` is a string, Eta will compile it to a function and call it with the provided data.
 * If `template` is a function, Eta will call it with the provided data.
 *
 * If there is a callback function, Eta will call it with `(err, renderedTemplate)`.
 * If there is not a callback function, Eta will return a Promise that resolves to the rendered template
 *
 * @param template Template string or template function
 * @param data Data to render the template with
 * @param config Optional config options
 * @param cb Callback function
 */
function renderAsync(template, data, config, cb) {
    // Using Object.assign to lower bundle size, using spread operator makes it larger because of typescript injected polyfills
    return render(template, data, Object.assign({}, config, { async: true }), cb);
}

// @denoify-ignore
config.includeFile = includeFileHelper;
config.filepathCache = {};

class InternalModule {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.static_templates = new Map();
        this.dynamic_templates = new Map();
    }
    getName() {
        return this.name;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createStaticTemplates();
            this.static_context = Object.fromEntries(this.static_templates);
        });
    }
    generateContext(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.config = config;
            yield this.updateTemplates();
            return Object.assign(Object.assign({}, this.static_context), Object.fromEntries(this.dynamic_templates));
        });
    }
}

class InternalModuleDate extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "date";
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.static_templates.set("now", this.generate_now());
            this.static_templates.set("tomorrow", this.generate_tomorrow());
            this.static_templates.set("weekday", this.generate_weekday());
            this.static_templates.set("yesterday", this.generate_yesterday());
        });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    generate_now() {
        return (format = "YYYY-MM-DD", offset, reference, reference_format) => {
            if (reference && !window.moment(reference, reference_format).isValid()) {
                throw new TemplaterError("Invalid reference date format, try specifying one with the argument 'reference_format'");
            }
            let duration;
            if (typeof offset === "string") {
                duration = window.moment.duration(offset);
            }
            else if (typeof offset === "number") {
                duration = window.moment.duration(offset, "days");
            }
            return window.moment(reference, reference_format).add(duration).format(format);
        };
    }
    generate_tomorrow() {
        return (format = "YYYY-MM-DD") => {
            return window.moment().add(1, 'days').format(format);
        };
    }
    generate_weekday() {
        return (format = "YYYY-MM-DD", weekday, reference, reference_format) => {
            if (reference && !window.moment(reference, reference_format).isValid()) {
                throw new TemplaterError("Invalid reference date format, try specifying one with the argument 'reference_format'");
            }
            return window.moment(reference, reference_format).weekday(weekday).format(format);
        };
    }
    generate_yesterday() {
        return (format = "YYYY-MM-DD") => {
            return window.moment().add(-1, 'days').format(format);
        };
    }
}

const DEPTH_LIMIT = 10;
class InternalModuleFile extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "file";
        this.include_depth = 0;
        this.linkpath_regex = new RegExp("^\\[\\[(.*)\\]\\]$");
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.static_templates.set("creation_date", this.generate_creation_date());
            this.static_templates.set("cursor", this.generate_cursor());
            this.static_templates.set("exists", this.generate_exists());
            this.static_templates.set("folder", this.generate_folder());
            this.static_templates.set("include", this.generate_include());
            this.static_templates.set("last_modified_date", this.generate_last_modified_date());
            this.static_templates.set("move", this.generate_move());
            this.static_templates.set("path", this.generate_path());
            this.static_templates.set("rename", this.generate_rename());
            this.static_templates.set("selection", this.generate_selection());
        });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.dynamic_templates.set("content", yield this.generate_content());
            this.dynamic_templates.set("tags", this.generate_tags());
            this.dynamic_templates.set("title", this.generate_title());
        });
    }
    generate_cursor() {
        return (order) => {
            // Hack to prevent empty output
            return `<% tp.file.cursor(${order !== null && order !== void 0 ? order : ''}) %>`;
        };
    }
    generate_content() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.app.vault.read(this.config.target_file);
        });
    }
    generate_creation_date() {
        return (format = "YYYY-MM-DD HH:mm") => {
            return window.moment(this.config.target_file.stat.ctime).format(format);
        };
    }
    generate_exists() {
        return (file_link) => {
            let match;
            if ((match = this.linkpath_regex.exec(file_link)) === null) {
                throw new TemplaterError("Invalid file format, provide an obsidian link between quotes.");
            }
            const file = this.app.metadataCache.getFirstLinkpathDest(match[1], "");
            return file != null;
        };
    }
    generate_folder() {
        return (relative = false) => {
            let parent = this.config.target_file.parent;
            let folder;
            if (relative) {
                folder = parent.path;
            }
            else {
                folder = parent.name;
            }
            return folder;
        };
    }
    generate_include() {
        return (include_link) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // TODO: Add mutex for this, this may currently lead to a race condition. 
            // While not very impactful, that could still be annoying.
            this.include_depth += 1;
            if (this.include_depth > DEPTH_LIMIT) {
                this.include_depth = 0;
                throw new TemplaterError("Reached inclusion depth limit (max = 10)");
            }
            let match;
            if ((match = this.linkpath_regex.exec(include_link)) === null) {
                throw new TemplaterError("Invalid file format, provide an obsidian link between quotes.");
            }
            const { path, subpath } = obsidian.parseLinktext(match[1]);
            const inc_file = this.app.metadataCache.getFirstLinkpathDest(path, "");
            if (!inc_file) {
                throw new TemplaterError(`File ${include_link} doesn't exist`);
            }
            let inc_file_content = yield this.app.vault.read(inc_file);
            if (subpath) {
                const cache = this.app.metadataCache.getFileCache(inc_file);
                if (cache) {
                    const result = obsidian.resolveSubpath(cache, subpath);
                    if (result) {
                        inc_file_content = inc_file_content.slice(result.start.offset, (_a = result.end) === null || _a === void 0 ? void 0 : _a.offset);
                    }
                }
            }
            const parsed_content = yield this.plugin.templater.parser.parseTemplates(inc_file_content);
            this.include_depth -= 1;
            return parsed_content;
        });
    }
    generate_last_modified_date() {
        return (format = "YYYY-MM-DD HH:mm") => {
            return window.moment(this.config.target_file.stat.mtime).format(format);
        };
    }
    generate_move() {
        return (path) => __awaiter(this, void 0, void 0, function* () {
            const new_path = obsidian.normalizePath(`${path}.${this.config.target_file.extension}`);
            yield this.app.fileManager.renameFile(this.config.target_file, new_path);
            return "";
        });
    }
    generate_path() {
        return (relative = false) => {
            // TODO: Add mobile support
            // @ts-ignore
            if (this.app.isMobile) {
                return UNSUPPORTED_MOBILE_TEMPLATE;
            }
            if (!(this.app.vault.adapter instanceof obsidian.FileSystemAdapter)) {
                throw new TemplaterError("app.vault is not a FileSystemAdapter instance");
            }
            const vault_path = this.app.vault.adapter.getBasePath();
            if (relative) {
                return this.config.target_file.path;
            }
            else {
                return `${vault_path}/${this.config.target_file.path}`;
            }
        };
    }
    generate_rename() {
        return (new_title) => __awaiter(this, void 0, void 0, function* () {
            if (new_title.match(/[\\\/:]+/g)) {
                throw new TemplaterError("File name cannot contain any of these characters: \\ / :");
            }
            const new_path = obsidian.normalizePath(`${this.config.target_file.parent.path}/${new_title}.${this.config.target_file.extension}`);
            yield this.app.fileManager.renameFile(this.config.target_file, new_path);
            return "";
        });
    }
    generate_selection() {
        return () => {
            const active_view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (active_view == null) {
                throw new TemplaterError("Active view is null, can't read selection.");
            }
            const editor = active_view.editor;
            return editor.getSelection();
        };
    }
    // TODO: Turn this into a function
    generate_tags() {
        const cache = this.app.metadataCache.getFileCache(this.config.target_file);
        return obsidian.getAllTags(cache);
    }
    // TODO: Turn this into a function
    generate_title() {
        return this.config.target_file.basename;
    }
}

class InternalModuleWeb extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "web";
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.static_templates.set("daily_quote", this.generate_daily_quote());
            this.static_templates.set("random_picture", this.generate_random_picture());
            //this.static_templates.set("get_request", this.generate_get_request());
        });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    getRequest(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield fetch(url);
            if (!response.ok) {
                throw new TemplaterError("Error performing GET request");
            }
            return response;
        });
    }
    generate_daily_quote() {
        return () => __awaiter(this, void 0, void 0, function* () {
            let response = yield this.getRequest("https://quotes.rest/qod");
            let json = yield response.json();
            let author = json.contents.quotes[0].author;
            let quote = json.contents.quotes[0].quote;
            let new_content = `> ${quote}\n> &mdash; <cite>${author}</cite>`;
            return new_content;
        });
    }
    generate_random_picture() {
        return (size, query) => __awaiter(this, void 0, void 0, function* () {
            let response = yield this.getRequest(`https://source.unsplash.com/random/${size !== null && size !== void 0 ? size : ''}?${query !== null && query !== void 0 ? query : ''}`);
            let url = response.url;
            return `![tp.web.random_picture](${url})`;
        });
    }
    generate_get_request() {
        return (url) => __awaiter(this, void 0, void 0, function* () {
            let response = yield this.getRequest(url);
            let json = yield response.json();
            return json;
        });
    }
}

class InternalModuleFrontmatter extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "frontmatter";
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = this.app.metadataCache.getFileCache(this.config.target_file);
            this.dynamic_templates = new Map(Object.entries((cache === null || cache === void 0 ? void 0 : cache.frontmatter) || {}));
        });
    }
}

class PromptModal extends obsidian.Modal {
    constructor(app, prompt_text, default_value) {
        super(app);
        this.prompt_text = prompt_text;
        this.default_value = default_value;
        this.submitted = false;
    }
    onOpen() {
        this.titleEl.setText(this.prompt_text);
        this.createForm();
    }
    onClose() {
        this.contentEl.empty();
        if (!this.submitted) {
            this.reject(new TemplaterError("Cancelled prompt"));
        }
    }
    createForm() {
        var _a;
        const div = this.contentEl.createDiv();
        div.addClass("templater-prompt-div");
        const form = div.createEl("form");
        form.addClass("templater-prompt-form");
        form.type = "submit";
        form.onsubmit = (e) => {
            this.submitted = true;
            e.preventDefault();
            this.resolve(this.promptEl.value);
            this.close();
        };
        this.promptEl = form.createEl("input");
        this.promptEl.type = "text";
        this.promptEl.placeholder = "Type text here...";
        this.promptEl.value = (_a = this.default_value) !== null && _a !== void 0 ? _a : "";
        this.promptEl.addClass("templater-prompt-input");
        this.promptEl.select();
    }
    openAndGetValue(resolve, reject) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resolve = resolve;
            this.reject = reject;
            this.open();
        });
    }
}

class SuggesterModal extends obsidian.FuzzySuggestModal {
    constructor(app, text_items, items) {
        super(app);
        this.text_items = text_items;
        this.items = items;
        this.submitted = false;
    }
    getItems() {
        return this.items;
    }
    onClose() {
        if (!this.submitted) {
            this.reject(new TemplaterError("Cancelled prompt"));
        }
    }
    selectSuggestion(value, evt) {
        this.submitted = true;
        this.close();
        this.onChooseSuggestion(value, evt);
    }
    getItemText(item) {
        if (this.text_items instanceof Function) {
            return this.text_items(item);
        }
        return this.text_items[this.items.indexOf(item)] || "Undefined Text Item";
    }
    onChooseItem(item, _evt) {
        this.resolve(item);
    }
    openAndGetValue(resolve, reject) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resolve = resolve;
            this.reject = reject;
            this.open();
        });
    }
}

class InternalModuleSystem extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "system";
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.static_templates.set("clipboard", this.generate_clipboard());
            this.static_templates.set("prompt", this.generate_prompt());
            this.static_templates.set("suggester", this.generate_suggester());
        });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    generate_clipboard() {
        return () => __awaiter(this, void 0, void 0, function* () {
            // TODO: Add mobile support
            // @ts-ignore
            if (this.app.isMobile) {
                return UNSUPPORTED_MOBILE_TEMPLATE;
            }
            return yield navigator.clipboard.readText();
        });
    }
    generate_prompt() {
        return (prompt_text, default_value, throw_on_cancel = false) => __awaiter(this, void 0, void 0, function* () {
            const prompt = new PromptModal(this.app, prompt_text, default_value);
            const promise = new Promise((resolve, reject) => prompt.openAndGetValue(resolve, reject));
            try {
                return yield promise;
            }
            catch (error) {
                if (throw_on_cancel) {
                    throw error;
                }
                return null;
            }
        });
    }
    generate_suggester() {
        return (text_items, items, throw_on_cancel = false) => __awaiter(this, void 0, void 0, function* () {
            const suggester = new SuggesterModal(this.app, text_items, items);
            const promise = new Promise((resolve, reject) => suggester.openAndGetValue(resolve, reject));
            try {
                return yield promise;
            }
            catch (error) {
                if (throw_on_cancel) {
                    throw error;
                }
                return null;
            }
        });
    }
}

class InternalModuleConfig extends InternalModule {
    constructor() {
        super(...arguments);
        this.name = "config";
    }
    createStaticTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    updateTemplates() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    generateContext(config) {
        return __awaiter(this, void 0, void 0, function* () {
            return config;
        });
    }
}

class InternalTemplateParser {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.modules_array = new Array();
        this.modules_array.push(new InternalModuleDate(this.app, this.plugin));
        this.modules_array.push(new InternalModuleFile(this.app, this.plugin));
        this.modules_array.push(new InternalModuleWeb(this.app, this.plugin));
        this.modules_array.push(new InternalModuleFrontmatter(this.app, this.plugin));
        this.modules_array.push(new InternalModuleSystem(this.app, this.plugin));
        this.modules_array.push(new InternalModuleConfig(this.app, this.plugin));
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const mod of this.modules_array) {
                yield mod.init();
            }
        });
    }
    generateContext(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const modules_context = {};
            for (const mod of this.modules_array) {
                modules_context[mod.getName()] = yield mod.generateContext(config);
            }
            return modules_context;
        });
    }
}

class UserTemplateParser {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.user_system_command_functions = new Map();
        this.user_script_functions = new Map();
        this.setup();
    }
    setup() {
        // @ts-ignore
        if (this.app.isMobile || !(this.app.vault.adapter instanceof obsidian.FileSystemAdapter)) {
            this.cwd = "";
        }
        else {
            this.cwd = this.app.vault.adapter.getBasePath();
            this.exec_promise = util.promisify(child_process.exec);
        }
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    generate_user_script_functions(config) {
        return __awaiter(this, void 0, void 0, function* () {
            let files = getTFilesFromFolder(this.app, this.plugin.settings.script_folder);
            for (let file of files) {
                if (file.extension.toLowerCase() === "js") {
                    yield this.load_user_script_function(config, file);
                }
            }
        });
    }
    load_user_script_function(config, file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.app.vault.adapter instanceof obsidian.FileSystemAdapter)) {
                throw new TemplaterError("app.vault is not a FileSystemAdapter instance");
            }
            let vault_path = this.app.vault.adapter.getBasePath();
            let file_path = `${vault_path}/${file.path}`;
            // https://stackoverflow.com/questions/26633901/reload-module-at-runtime
            // https://stackoverflow.com/questions/1972242/how-to-auto-reload-files-in-node-js
            if (Object.keys(window.require.cache).contains(file_path)) {
                delete window.require.cache[window.require.resolve(file_path)];
            }
            const user_function = yield Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(file_path)); });
            if (!user_function.default) {
                throw new TemplaterError(`Failed to load user script ${file_path}. No exports detected.`);
            }
            if (!(user_function.default instanceof Function)) {
                throw new TemplaterError(`Failed to load user script ${file_path}. Default export is not a function.`);
            }
            this.user_script_functions.set(`${file.basename}`, user_function.default);
        });
    }
    // TODO: Add mobile support
    generate_system_command_user_functions(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield this.plugin.templater.parser.generateContext(config, ContextMode.INTERNAL);
            for (let [template, cmd] of this.plugin.settings.templates_pairs) {
                if (template === "" || cmd === "") {
                    continue;
                }
                // @ts-ignore
                if (this.app.isMobile) {
                    this.user_system_command_functions.set(template, (user_args) => {
                        return UNSUPPORTED_MOBILE_TEMPLATE;
                    });
                }
                else {
                    cmd = yield this.plugin.templater.parser.parseTemplates(cmd, context);
                    this.user_system_command_functions.set(template, (user_args) => __awaiter(this, void 0, void 0, function* () {
                        const process_env = Object.assign(Object.assign({}, process.env), user_args);
                        const cmd_options = Object.assign({ timeout: this.plugin.settings.command_timeout * 1000, cwd: this.cwd, env: process_env }, (this.plugin.settings.shell_path !== "" && { shell: this.plugin.settings.shell_path }));
                        try {
                            const { stdout } = yield this.exec_promise(cmd, cmd_options);
                            return stdout.trimRight();
                        }
                        catch (error) {
                            throw new TemplaterError(`Error with User Template ${template}`, error);
                        }
                    }));
                }
            }
        });
    }
    generateContext(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.user_system_command_functions.clear();
            this.user_script_functions.clear();
            if (this.plugin.settings.enable_system_commands) {
                yield this.generate_system_command_user_functions(config);
            }
            // TODO: Add mobile support
            // @ts-ignore
            if (!this.app.isMobile && this.plugin.settings.script_folder) {
                yield this.generate_user_script_functions(config);
            }
            return Object.assign(Object.assign({}, Object.fromEntries(this.user_system_command_functions)), Object.fromEntries(this.user_script_functions));
        });
    }
}

var ContextMode;
(function (ContextMode) {
    ContextMode[ContextMode["INTERNAL"] = 0] = "INTERNAL";
    ContextMode[ContextMode["USER_INTERNAL"] = 1] = "USER_INTERNAL";
})(ContextMode || (ContextMode = {}));
class TemplateParser {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.internalTemplateParser = new InternalTemplateParser(this.app, this.plugin);
        this.userTemplateParser = new UserTemplateParser(this.app, this.plugin);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.internalTemplateParser.init();
            yield this.userTemplateParser.init();
        });
    }
    setCurrentContext(config, context_mode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.current_context = yield this.generateContext(config, context_mode);
        });
    }
    additionalContext() {
        return {
            obsidian: obsidian_module,
        };
    }
    generateContext(config, context_mode = ContextMode.USER_INTERNAL) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = {};
            const additional_context = this.additionalContext();
            const internal_context = yield this.internalTemplateParser.generateContext(config);
            let user_context = {};
            if (!this.current_context) {
                // If a user system command is using tp.file.include, we need the context to be set.
                this.current_context = internal_context;
            }
            Object.assign(context, additional_context);
            switch (context_mode) {
                case ContextMode.INTERNAL:
                    Object.assign(context, internal_context);
                    break;
                case ContextMode.USER_INTERNAL:
                    user_context = yield this.userTemplateParser.generateContext(config);
                    Object.assign(context, Object.assign(Object.assign({}, internal_context), { user: user_context }));
                    break;
            }
            return context;
        });
    }
    parseTemplates(content, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!context) {
                context = this.current_context;
            }
            content = (yield renderAsync(content, context, {
                varName: "tp",
                parse: {
                    exec: "*",
                    interpolate: "~",
                    raw: "",
                },
                autoTrim: false,
                globalAwait: true,
            }));
            return content;
        });
    }
}

var RunMode;
(function (RunMode) {
    RunMode[RunMode["CreateNewFromTemplate"] = 0] = "CreateNewFromTemplate";
    RunMode[RunMode["AppendActiveFile"] = 1] = "AppendActiveFile";
    RunMode[RunMode["OverwriteFile"] = 2] = "OverwriteFile";
    RunMode[RunMode["OverwriteActiveFile"] = 3] = "OverwriteActiveFile";
    RunMode[RunMode["DynamicProcessor"] = 4] = "DynamicProcessor";
})(RunMode || (RunMode = {}));
class Templater {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.cursor_jumper = new CursorJumper(this.app);
        this.parser = new TemplateParser(this.app, this.plugin);
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.parser.init();
        });
    }
    errorWrapper(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield fn();
            }
            catch (e) {
                if (!(e instanceof TemplaterError)) {
                    this.plugin.log_error(new TemplaterError(`Template parsing error, aborting.`, e.message));
                }
                else {
                    this.plugin.log_error(e);
                }
                return null;
            }
        });
    }
    create_running_config(template_file, target_file, run_mode) {
        return {
            template_file: template_file,
            target_file: target_file,
            run_mode: run_mode,
        };
    }
    read_and_parse_template(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const template_content = yield this.app.vault.read(config.template_file);
            yield this.parser.setCurrentContext(config, ContextMode.USER_INTERNAL);
            const content = yield this.parser.parseTemplates(template_content);
            return content;
        });
    }
    create_new_note_from_template(template_file, folder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!folder) {
                folder = this.app.fileManager.getNewFileParent("");
            }
            // TODO: Change that, not stable atm
            // @ts-ignore
            const created_note = yield this.app.fileManager.createNewMarkdownFile(folder, "Untitled");
            const running_config = this.create_running_config(template_file, created_note, RunMode.CreateNewFromTemplate);
            const output_content = yield this.errorWrapper(() => __awaiter(this, void 0, void 0, function* () { return this.read_and_parse_template(running_config); }));
            if (!output_content) {
                yield this.app.vault.delete(created_note);
                return;
            }
            yield this.app.vault.modify(created_note, output_content);
            const active_leaf = this.app.workspace.activeLeaf;
            if (!active_leaf) {
                this.plugin.log_error(new TemplaterError("No active leaf"));
                return;
            }
            yield active_leaf.openFile(created_note, { state: { mode: 'source' }, eState: { rename: 'all' } });
            yield this.cursor_jumper.jump_to_next_cursor_location();
        });
    }
    append_template(template_file) {
        return __awaiter(this, void 0, void 0, function* () {
            const active_view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (active_view === null) {
                this.plugin.log_error(new TemplaterError("No active view, can't append templates."));
                return;
            }
            const running_config = this.create_running_config(template_file, active_view.file, RunMode.AppendActiveFile);
            const output_content = yield this.errorWrapper(() => __awaiter(this, void 0, void 0, function* () { return this.read_and_parse_template(running_config); }));
            if (!output_content) {
                return;
            }
            const editor = active_view.editor;
            const doc = editor.getDoc();
            doc.replaceSelection(output_content);
            yield this.cursor_jumper.jump_to_next_cursor_location();
        });
    }
    overwrite_active_file_templates() {
        const active_view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (active_view === null) {
            this.plugin.log_error(new TemplaterError("Active view is null, can't overwrite content"));
            return;
        }
        this.overwrite_file_templates(active_view.file, true);
    }
    overwrite_file_templates(file, active_file = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const running_config = this.create_running_config(file, file, active_file ? RunMode.OverwriteActiveFile : RunMode.OverwriteFile);
            const output_content = yield this.errorWrapper(() => __awaiter(this, void 0, void 0, function* () { return this.read_and_parse_template(running_config); }));
            if (!output_content) {
                return;
            }
            yield this.app.vault.modify(file, output_content);
            if (this.app.workspace.getActiveFile() === file) {
                yield this.cursor_jumper.jump_to_next_cursor_location();
            }
        });
    }
    process_dynamic_templates(el, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const dynamic_command_regex = /(<%[*~]{0,1})\+(.*%>)/g;
            let content = el.innerText;
            let match;
            if ((match = dynamic_command_regex.exec(content)) != null) {
                const file = this.app.metadataCache.getFirstLinkpathDest("", ctx.sourcePath);
                if (!file || !(file instanceof obsidian.TFile)) {
                    return;
                }
                const running_config = this.create_running_config(file, file, RunMode.DynamicProcessor);
                yield this.parser.setCurrentContext(running_config, ContextMode.USER_INTERNAL);
                while (match != null) {
                    // Not the most efficient way to exclude the '+' from the command but I couldn't find something better
                    const complete_command = match[1] + match[2];
                    const command_output = yield this.errorWrapper(() => __awaiter(this, void 0, void 0, function* () {
                        return yield this.parser.parseTemplates(complete_command);
                    }));
                    if (!command_output) {
                        return;
                    }
                    let start = dynamic_command_regex.lastIndex - match[0].length;
                    let end = dynamic_command_regex.lastIndex;
                    content = content.substring(0, start) + command_output + content.substring(end);
                    dynamic_command_regex.lastIndex += (command_output.length - match[0].length);
                    match = dynamic_command_regex.exec(content);
                }
                el.innerText = content;
            }
        });
    }
}

class TemplaterPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.templater = new Templater(this.app, this);
            yield this.templater.setup();
            this.fuzzySuggest = new TemplaterFuzzySuggestModal(this.app, this);
            this.registerMarkdownPostProcessor((el, ctx) => this.templater.process_dynamic_templates(el, ctx));
            obsidian.addIcon("templater-icon", ICON_DATA);
            this.addRibbonIcon('templater-icon', 'Templater', () => __awaiter(this, void 0, void 0, function* () {
                this.fuzzySuggest.insert_template();
            }));
            this.addCommand({
                id: "insert-templater",
                name: "Insert Template",
                hotkeys: [
                    {
                        modifiers: ["Alt"],
                        key: 'e',
                    },
                ],
                callback: () => {
                    this.fuzzySuggest.insert_template();
                },
            });
            this.addCommand({
                id: "replace-in-file-templater",
                name: "Replace templates in the active file",
                hotkeys: [
                    {
                        modifiers: ["Alt"],
                        key: 'r',
                    },
                ],
                callback: () => {
                    this.templater.overwrite_active_file_templates();
                },
            });
            this.addCommand({
                id: "jump-to-next-cursor-location",
                name: "Jump to next cursor location",
                hotkeys: [
                    {
                        modifiers: ["Alt"],
                        key: "Tab",
                    },
                ],
                callback: () => {
                    this.templater.cursor_jumper.jump_to_next_cursor_location();
                }
            });
            this.addCommand({
                id: "create-new-note-from-template",
                name: "Create new note from template",
                hotkeys: [
                    {
                        modifiers: ["Alt"],
                        key: "n",
                    },
                ],
                callback: () => {
                    this.fuzzySuggest.create_new_note_from_template();
                }
            });
            this.app.workspace.onLayoutReady(() => {
                // TODO
                //this.registerCodeMirrorMode();
                this.update_trigger_file_on_creation();
            });
            this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof obsidian.TFolder) {
                    menu.addItem((item) => {
                        item.setTitle("Create new note from template")
                            .setIcon("templater-icon")
                            .onClick(evt => {
                            this.fuzzySuggest.create_new_note_from_template(file);
                        });
                    });
                }
            }));
            this.addSettingTab(new TemplaterSettingTab(this.app, this));
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    update_trigger_file_on_creation() {
        if (this.settings.trigger_on_file_creation) {
            this.trigger_on_file_creation_event = this.app.vault.on("create", (file) => __awaiter(this, void 0, void 0, function* () {
                console.log("TRIGGERED TRIGGERED");
                // TODO: find a better way to do this
                // Currently, I have to wait for the daily note plugin to add the file content before replacing
                // Not a problem with Calendar however since it creates the file with the existing content
                yield delay(300);
                if (!(file instanceof obsidian.TFile) || file.extension !== "md") {
                    return;
                }
                this.templater.overwrite_file_templates(file);
            }));
            this.registerEvent(this.trigger_on_file_creation_event);
        }
        else {
            if (this.trigger_on_file_creation_event) {
                this.app.vault.offref(this.trigger_on_file_creation_event);
                this.trigger_on_file_creation_event = undefined;
            }
        }
    }
    log_update(msg) {
        const notice = new obsidian.Notice("", 15000);
        // TODO: Find better way for this
        // @ts-ignore
        notice.noticeEl.innerHTML = `<b>Templater update</b>:<br/>${msg}`;
    }
    log_error(e) {
        const notice = new obsidian.Notice("", 8000);
        if (e instanceof TemplaterError && e.console_msg) {
            // TODO: Find a better way for this
            // @ts-ignore
            notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}<br/>Check console for more informations`;
            console.error(e.message, e.console_msg);
        }
        else {
            // @ts-ignore
            notice.noticeEl.innerHTML = `<b>Templater Error</b>:<br/>${e.message}`;
        }
    }
}

module.exports = TemplaterPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy9FcnJvci50cyIsInNyYy9TZXR0aW5ncy50cyIsInNyYy9VdGlscy50cyIsInNyYy9UZW1wbGF0ZXJGdXp6eVN1Z2dlc3QudHMiLCJzcmMvQ29uc3RhbnRzLnRzIiwic3JjL0N1cnNvckp1bXBlci50cyIsIm5vZGVfbW9kdWxlcy9ldGEvZGlzdC9ldGEuZXMuanMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvSW50ZXJuYWxNb2R1bGUudHMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvZGF0ZS9JbnRlcm5hbE1vZHVsZURhdGUudHMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvZmlsZS9JbnRlcm5hbE1vZHVsZUZpbGUudHMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvd2ViL0ludGVybmFsTW9kdWxlV2ViLnRzIiwic3JjL0ludGVybmFsVGVtcGxhdGVzL2Zyb250bWF0dGVyL0ludGVybmFsTW9kdWxlRnJvbnRtYXR0ZXIudHMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvc3lzdGVtL1Byb21wdE1vZGFsLnRzIiwic3JjL0ludGVybmFsVGVtcGxhdGVzL3N5c3RlbS9TdWdnZXN0ZXJNb2RhbC50cyIsInNyYy9JbnRlcm5hbFRlbXBsYXRlcy9zeXN0ZW0vSW50ZXJuYWxNb2R1bGVTeXN0ZW0udHMiLCJzcmMvSW50ZXJuYWxUZW1wbGF0ZXMvY29uZmlnL0ludGVybmFsTW9kdWxlQ29uZmlnLnRzIiwic3JjL0ludGVybmFsVGVtcGxhdGVzL0ludGVybmFsVGVtcGxhdGVQYXJzZXIudHMiLCJzcmMvVXNlclRlbXBsYXRlcy9Vc2VyVGVtcGxhdGVQYXJzZXIudHMiLCJzcmMvVGVtcGxhdGVQYXJzZXIudHMiLCJzcmMvVGVtcGxhdGVyLnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcbiIsImV4cG9ydCBjbGFzcyBUZW1wbGF0ZXJFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgICBjb25zdHJ1Y3Rvcihtc2c6IHN0cmluZywgcHVibGljIGNvbnNvbGVfbXNnPzogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKG1zZyk7XG4gICAgICAgIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgfVxufSIsImltcG9ydCB7IFRlbXBsYXRlckVycm9yIH0gZnJvbSBcIkVycm9yXCI7XG5pbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuaW1wb3J0IFRlbXBsYXRlclBsdWdpbiBmcm9tICcuL21haW4nO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogVGVtcGxhdGVyU2V0dGluZ3MgPSB7XG5cdGNvbW1hbmRfdGltZW91dDogNSxcblx0dGVtcGxhdGVfZm9sZGVyOiBcIlwiLFxuXHR0ZW1wbGF0ZXNfcGFpcnM6IFtbXCJcIiwgXCJcIl1dLFxuXHR0cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb246IGZhbHNlLFxuXHRlbmFibGVfc3lzdGVtX2NvbW1hbmRzOiBmYWxzZSxcblx0c2hlbGxfcGF0aDogXCJcIixcblx0c2NyaXB0X2ZvbGRlcjogdW5kZWZpbmVkLFxufTtcblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZXJTZXR0aW5ncyB7XG5cdGNvbW1hbmRfdGltZW91dDogbnVtYmVyO1xuXHR0ZW1wbGF0ZV9mb2xkZXI6IHN0cmluZztcblx0dGVtcGxhdGVzX3BhaXJzOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPjtcblx0dHJpZ2dlcl9vbl9maWxlX2NyZWF0aW9uOiBib29sZWFuO1xuXHRlbmFibGVfc3lzdGVtX2NvbW1hbmRzOiBib29sZWFuO1xuXHRzaGVsbF9wYXRoOiBzdHJpbmcsXG5cdHNjcmlwdF9mb2xkZXI6IHN0cmluZyxcbn07XG5cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZXJTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG5cdGNvbnN0cnVjdG9yKHB1YmxpYyBhcHA6IEFwcCwgcHJpdmF0ZSBwbHVnaW46IFRlbXBsYXRlclBsdWdpbikge1xuXHRcdHN1cGVyKGFwcCwgcGx1Z2luKTtcblx0fVxuXG5cdGRpc3BsYXkoKTogdm9pZCB7XG5cdFx0Y29uc3Qge2NvbnRhaW5lckVsfSA9IHRoaXM7XG5cdFx0bGV0IGRlc2M6IERvY3VtZW50RnJhZ21lbnQ7XG5cdFx0Y29udGFpbmVyRWwuZW1wdHkoKTtcblxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuXHRcdFx0LnNldE5hbWUoXCJUZW1wbGF0ZSBmb2xkZXIgbG9jYXRpb25cIilcblx0XHRcdC5zZXREZXNjKFwiRmlsZXMgaW4gdGhpcyBmb2xkZXIgd2lsbCBiZSBhdmFpbGFibGUgYXMgdGVtcGxhdGVzLlwiKVxuXHRcdFx0LmFkZFRleHQodGV4dCA9PiB7XG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJFeGFtcGxlOiBmb2xkZXIgMS9mb2xkZXIgMlwiKVxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZW1wbGF0ZV9mb2xkZXIpXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKChuZXdfZm9sZGVyKSA9PiB7XG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZW1wbGF0ZV9mb2xkZXIgPSBuZXdfZm9sZGVyO1xuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdH0pO1xuXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG5cdFx0XHQuc2V0TmFtZShcIlRpbWVvdXRcIilcblx0XHRcdC5zZXREZXNjKFwiTWF4aW11bSB0aW1lb3V0IGluIHNlY29uZHMgZm9yIGEgc3lzdGVtIGNvbW1hbmQuXCIpXG5cdFx0XHQuYWRkVGV4dCh0ZXh0ID0+IHtcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIlRpbWVvdXRcIilcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWFuZF90aW1lb3V0LnRvU3RyaW5nKCkpXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKChuZXdfdmFsdWUpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IG5ld190aW1lb3V0ID0gTnVtYmVyKG5ld192YWx1ZSk7XG5cdFx0XHRcdFx0XHRpZiAoaXNOYU4obmV3X3RpbWVvdXQpKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLmxvZ19lcnJvcihuZXcgVGVtcGxhdGVyRXJyb3IoXCJUaW1lb3V0IG11c3QgYmUgYSBudW1iZXJcIikpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21tYW5kX3RpbWVvdXQgPSBuZXdfdGltZW91dDtcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHR9KTtcblxuXHRcdGRlc2MgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0ZGVzYy5hcHBlbmQoXG5cdFx0XHRcIlRlbXBsYXRlciBwcm92aWRlcyBtdWx0aXBsZXMgcHJlZGVmaW5lZCB2YXJpYWJsZXMgLyBmdW5jdGlvbnMgdGhhdCB5b3UgY2FuIHVzZS5cIixcblx0XHRcdGRlc2MuY3JlYXRlRWwoXCJiclwiKSxcblx0XHRcdFwiQ2hlY2sgdGhlIFwiLFxuXHRcdFx0ZGVzYy5jcmVhdGVFbChcImFcIiwge1xuXHRcdFx0XHRocmVmOiBcImh0dHBzOi8vc2lsZW50dm9pZDEzLmdpdGh1Yi5pby9UZW1wbGF0ZXIvXCIsXG5cdFx0XHRcdHRleHQ6IFwiZG9jdW1lbnRhdGlvblwiXG5cdFx0XHR9KSxcblx0XHRcdFwiIHRvIGdldCBhIGxpc3Qgb2YgYWxsIHRoZSBhdmFpbGFibGUgaW50ZXJuYWwgdmFyaWFibGVzIC8gZnVuY3Rpb25zLlwiLFxuXHRcdCk7XG5cblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcblx0XHRcdC5zZXROYW1lKFwiSW50ZXJuYWwgVmFyaWFibGVzIGFuZCBGdW5jdGlvbnNcIilcblx0XHRcdC5zZXREZXNjKGRlc2MpO1xuXG5cdFx0ZGVzYyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRkZXNjLmFwcGVuZChcblx0XHRcdFwiVGVtcGxhdGVyIHdpbGwgbGlzdGVuIGZvciB0aGUgbmV3IGZpbGUgY3JlYXRpb24gZXZlbnQsIGFuZCByZXBsYWNlIGV2ZXJ5IGNvbW1hbmQgaXQgZmluZHMgaW4gdGhlIG5ldyBmaWxlJ3MgY29udGVudC5cIixcblx0XHRcdGRlc2MuY3JlYXRlRWwoXCJiclwiKSxcblx0XHRcdFwiVGhpcyBtYWtlcyBUZW1wbGF0ZXIgY29tcGF0aWJsZSB3aXRoIG90aGVyIHBsdWdpbnMgbGlrZSB0aGUgRGFpbHkgbm90ZSBjb3JlIHBsdWdpbiwgQ2FsZW5kYXIgcGx1Z2luLCBSZXZpZXcgcGx1Z2luLCBOb3RlIHJlZmFjdG9yIHBsdWdpbiwgLi4uXCIsXG5cdFx0XHRkZXNjLmNyZWF0ZUVsKFwiYnJcIiksXG5cdFx0XHRkZXNjLmNyZWF0ZUVsKFwiYlwiLCB7XG5cdFx0XHRcdHRleHQ6IFwiV2FybmluZzogXCIsXG5cdFx0XHR9KSxcblx0XHRcdFwiVGhpcyBjYW4gYmUgZGFuZ2Vyb3VzIGlmIHlvdSBjcmVhdGUgbmV3IGZpbGVzIHdpdGggdW5rbm93biAvIHVuc2FmZSBjb250ZW50IG9uIGNyZWF0aW9uLiBNYWtlIHN1cmUgdGhhdCBldmVyeSBuZXcgZmlsZSdzIGNvbnRlbnQgaXMgc2FmZSBvbiBjcmVhdGlvbi5cIlxuXHRcdCk7XHRcblxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuXHRcdFx0LnNldE5hbWUoXCJUcmlnZ2VyIFRlbXBsYXRlciBvbiBuZXcgZmlsZSBjcmVhdGlvblwiKVxuXHRcdFx0LnNldERlc2MoZGVzYylcblx0XHRcdC5hZGRUb2dnbGUodG9nZ2xlID0+IHtcblx0XHRcdFx0dG9nZ2xlXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJfb25fZmlsZV9jcmVhdGlvbilcblx0XHRcdFx0XHQub25DaGFuZ2UodHJpZ2dlcl9vbl9maWxlX2NyZWF0aW9uID0+IHtcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJfb25fZmlsZV9jcmVhdGlvbiA9IHRyaWdnZXJfb25fZmlsZV9jcmVhdGlvbjtcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4udXBkYXRlX3RyaWdnZXJfZmlsZV9vbl9jcmVhdGlvbigpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRkZXNjID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHRcdGRlc2MuYXBwZW5kKFxuXHRcdFx0XCJBbGxvd3MgeW91IHRvIGNyZWF0ZSB1c2VyIGZ1bmN0aW9ucyBsaW5rZWQgdG8gc3lzdGVtIGNvbW1hbmRzLlwiLFxuXHRcdFx0ZGVzYy5jcmVhdGVFbChcImJyXCIpLFxuXHRcdFx0ZGVzYy5jcmVhdGVFbChcImJcIiwge1xuXHRcdFx0XHR0ZXh0OiBcIldhcm5pbmc6IFwiXG5cdFx0XHR9KSxcblx0XHRcdFwiSXQgY2FuIGJlIGRhbmdlcm91cyB0byBleGVjdXRlIGFyYml0cmFyeSBzeXN0ZW0gY29tbWFuZHMgZnJvbSB1bnRydXN0ZWQgc291cmNlcy4gT25seSBydW4gc3lzdGVtIGNvbW1hbmRzIHRoYXQgeW91IHVuZGVyc3RhbmQsIGZyb20gdHJ1c3RlZCBzb3VyY2VzLlwiLFxuXHRcdCk7XG5cblx0XHRkZXNjID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHRcdGRlc2MuYXBwZW5kKFxuXHRcdFx0XCJBbGwgSmF2YVNjcmlwdCBmaWxlcyBpbiB0aGlzIGZvbGRlciB3aWxsIGJlIGxvYWRlZCBhcyBDb21tb25KUyBtb2R1bGVzLCB0byBpbXBvcnQgY3VzdG9tIHVzZXIgZnVuY3Rpb25zLlwiLCBcblx0XHRcdGRlc2MuY3JlYXRlRWwoXCJiclwiKSxcblx0XHRcdFwiVGhlIGZvbGRlciBuZWVkcyB0byBiZSBhY2Nlc3NpYmxlIGZyb20gdGhlIHZhdWx0LlwiLFxuXHRcdFx0ZGVzYy5jcmVhdGVFbChcImJyXCIpLFxuXHRcdFx0XCJDaGVjayB0aGUgXCIsXG5cdFx0XHRkZXNjLmNyZWF0ZUVsKFwiYVwiLCB7XG5cdFx0XHRcdGhyZWY6IFwiaHR0cHM6Ly9zaWxlbnR2b2lkMTMuZ2l0aHViLmlvL1RlbXBsYXRlci9cIixcblx0XHRcdFx0dGV4dDogXCJkb2N1bWVudGF0aW9uXCIsXG5cdFx0XHR9KSxcblx0XHRcdFwiIGZvciBtb3JlIGluZm9ybWF0aW9ucy5cIixcblx0XHQpO1xuXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG5cdFx0XHQuc2V0TmFtZShcIlNjcmlwdCBmaWxlcyBmb2xkZXIgbG9jYXRpb25cIilcblx0XHRcdC5zZXREZXNjKGRlc2MpXG5cdFx0XHQuYWRkVGV4dCh0ZXh0ID0+IHtcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIkV4YW1wbGU6IGZvbGRlciAxL2ZvbGRlciAyXCIpXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNjcmlwdF9mb2xkZXIpXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKChuZXdfZm9sZGVyKSA9PiB7XG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY3JpcHRfZm9sZGVyID0gbmV3X2ZvbGRlcjtcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHR9KTtcblxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuXHRcdFx0LnNldE5hbWUoXCJFbmFibGUgU3lzdGVtIENvbW1hbmRzXCIpXG5cdFx0XHQuc2V0RGVzYyhkZXNjKVxuXHRcdFx0LmFkZFRvZ2dsZSh0b2dnbGUgPT4ge1xuXHRcdFx0XHR0b2dnbGVcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlX3N5c3RlbV9jb21tYW5kcylcblx0XHRcdFx0XHQub25DaGFuZ2UoZW5hYmxlX3N5c3RlbV9jb21tYW5kcyA9PiB7XG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVfc3lzdGVtX2NvbW1hbmRzID0gZW5hYmxlX3N5c3RlbV9jb21tYW5kcztcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXHRcdFx0XHRcdFx0Ly8gRm9yY2UgcmVmcmVzaFxuXHRcdFx0XHRcdFx0dGhpcy5kaXNwbGF5KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVfc3lzdGVtX2NvbW1hbmRzKSB7XG5cdFx0XHRkZXNjID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHRcdFx0ZGVzYy5hcHBlbmQoXG5cdFx0XHRcdFwiRnVsbCBwYXRoIHRvIHRoZSBzaGVsbCBiaW5hcnkgdG8gZXhlY3V0ZSB0aGUgY29tbWFuZCB3aXRoLlwiLFxuXHRcdFx0XHRkZXNjLmNyZWF0ZUVsKFwiYnJcIiksXG5cdFx0XHRcdFwiVGhpcyBzZXR0aW5nIGlzIG9wdGlvbmFsIGFuZCB3aWxsIGRlZmF1bHQgdG8gdGhlIHN5c3RlbSdzIGRlZmF1bHQgc2hlbGwgaWYgbm90IHNwZWNpZmllZC5cIixcblx0XHRcdFx0ZGVzYy5jcmVhdGVFbChcImJyXCIpLFxuXHRcdFx0XHRcIllvdSBjYW4gdXNlIGZvcndhcmQgc2xhc2hlcyAoJy8nKSBhcyBwYXRoIHNlcGFyYXRvcnMgb24gYWxsIHBsYXRmb3JtcyBpZiBpbiBkb3VidC5cIlxuXHRcdFx0KTtcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuXHRcdFx0XHQuc2V0TmFtZShcIlNoZWxsIGJpbmFyeSBsb2NhdGlvblwiKVxuXHRcdFx0XHQuc2V0RGVzYyhkZXNjKVxuXHRcdFx0XHQuYWRkVGV4dCh0ZXh0ID0+IHtcblx0XHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiRXhhbXBsZTogL2Jpbi9iYXNoLCAuLi5cIilcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaGVsbF9wYXRoKVxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKChzaGVsbF9wYXRoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnNoZWxsX3BhdGggPSBzaGVsbF9wYXRoO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRsZXQgaSA9IDE7XG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZW1wbGF0ZXNfcGFpcnMuZm9yRWFjaCgodGVtcGxhdGVfcGFpcikgPT4ge1xuXHRcdFx0XHRjb25zdCBkaXYgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2Jyk7XG5cdFx0XHRcdGRpdi5hZGRDbGFzcyhcInRlbXBsYXRlcl9kaXZcIik7XG5cblx0XHRcdFx0Y29uc3QgdGl0bGUgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7XG5cdFx0XHRcdFx0dGV4dDogJ1VzZXIgRnVuY3Rpb24gbsKwJyArIGksXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aXRsZS5hZGRDbGFzcyhcInRlbXBsYXRlcl90aXRsZVwiKTtcblxuXHRcdFx0XHRjb25zdCBzZXR0aW5nID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG5cdFx0XHRcdFx0LmFkZEV4dHJhQnV0dG9uKGV4dHJhID0+IHtcblx0XHRcdFx0XHRcdGV4dHJhLnNldEljb24oXCJjcm9zc1wiKVxuXHRcdFx0XHRcdFx0XHQuc2V0VG9vbHRpcChcIkRlbGV0ZVwiKVxuXHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgaW5kZXggPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZW1wbGF0ZXNfcGFpcnMuaW5kZXhPZih0ZW1wbGF0ZV9wYWlyKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGVtcGxhdGVzX3BhaXJzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBGb3JjZSByZWZyZXNoXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZGlzcGxheSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5hZGRUZXh0KHRleHQgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB0ID0gdGV4dC5zZXRQbGFjZWhvbGRlcignRnVuY3Rpb24gbmFtZScpXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZSh0ZW1wbGF0ZV9wYWlyWzBdKVxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKG5ld192YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGluZGV4ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGVtcGxhdGVzX3BhaXJzLmluZGV4T2YodGVtcGxhdGVfcGFpcik7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRlbXBsYXRlc19wYWlyc1tpbmRleF1bMF0gPSBuZXdfdmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR0LmlucHV0RWwuYWRkQ2xhc3MoXCJ0ZW1wbGF0ZXJfdGVtcGxhdGVcIik7XG5cblx0XHRcdFx0XHRcdFx0cmV0dXJuIHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0KVxuXHRcdFx0XHRcdC5hZGRUZXh0QXJlYSh0ZXh0ID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IHQgPSB0ZXh0LnNldFBsYWNlaG9sZGVyKCdTeXN0ZW0gQ29tbWFuZCcpXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUodGVtcGxhdGVfcGFpclsxXSlcblx0XHRcdFx0XHRcdC5vbkNoYW5nZSgobmV3X2NtZCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBpbmRleCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRlbXBsYXRlc19wYWlycy5pbmRleE9mKHRlbXBsYXRlX3BhaXIpO1xuXHRcdFx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRlbXBsYXRlc19wYWlyc1tpbmRleF1bMV0gPSBuZXdfY21kO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0dC5pbnB1dEVsLnNldEF0dHIoXCJyb3dzXCIsIDQpO1xuXHRcdFx0XHRcdFx0dC5pbnB1dEVsLmFkZENsYXNzKFwidGVtcGxhdGVyX2NtZFwiKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHQ7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2V0dGluZy5pbmZvRWwucmVtb3ZlKCk7XG5cblx0XHRcdFx0ZGl2LmFwcGVuZENoaWxkKHRpdGxlKTtcblx0XHRcdFx0ZGl2LmFwcGVuZENoaWxkKGNvbnRhaW5lckVsLmxhc3RDaGlsZCk7XG5cblx0XHRcdFx0aSs9MTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCBkaXYgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2Jyk7XG5cdFx0XHRkaXYuYWRkQ2xhc3MoXCJ0ZW1wbGF0ZXJfZGl2MlwiKTtcblxuXHRcdFx0Y29uc3Qgc2V0dGluZyA9IG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuXHRcdFx0XHQuYWRkQnV0dG9uKGJ1dHRvbiA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgYiA9IGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQWRkIE5ldyBVc2VyIEZ1bmN0aW9uXCIpLm9uQ2xpY2soKCkgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGVtcGxhdGVzX3BhaXJzLnB1c2goW1wiXCIsIFwiXCJdKTtcblx0XHRcdFx0XHRcdC8vIEZvcmNlIHJlZnJlc2hcblx0XHRcdFx0XHRcdHRoaXMuZGlzcGxheSgpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGIuYnV0dG9uRWwuYWRkQ2xhc3MoXCJ0ZW1wbGF0ZXJfYnV0dG9uXCIpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIGI7XG5cdFx0XHRcdH0pO1xuXHRcdFx0c2V0dGluZy5pbmZvRWwucmVtb3ZlKCk7XG5cblx0XHRcdGRpdi5hcHBlbmRDaGlsZChjb250YWluZXJFbC5sYXN0Q2hpbGQpO1xuXHRcdH1cdFxuXHR9XG59IiwiaW1wb3J0IHsgVGVtcGxhdGVyRXJyb3IgfSBmcm9tIFwiRXJyb3JcIjtcbmltcG9ydCB7IEFwcCwgbm9ybWFsaXplUGF0aCwgVEFic3RyYWN0RmlsZSwgVEZpbGUsIFRGb2xkZXIsIFZhdWx0IH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbmV4cG9ydCBjb25zdCBvYnNpZGlhbl9tb2R1bGUgPSByZXF1aXJlKFwib2JzaWRpYW5cIik7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCByZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpICk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJyk7IC8vICQmIG1lYW5zIHRoZSB3aG9sZSBtYXRjaGVkIHN0cmluZ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VEZpbGVzRnJvbUZvbGRlcihhcHA6IEFwcCwgZm9sZGVyX3N0cjogc3RyaW5nKTogQXJyYXk8VEZpbGU+IHtcbiAgICBmb2xkZXJfc3RyID0gbm9ybWFsaXplUGF0aChmb2xkZXJfc3RyKTtcblxuICAgIGxldCBmb2xkZXIgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcl9zdHIpO1xuICAgIGlmICghZm9sZGVyKSB7XG4gICAgICAgIHRocm93IG5ldyBUZW1wbGF0ZXJFcnJvcihgJHtmb2xkZXJfc3RyfSBmb2xkZXIgZG9lc24ndCBleGlzdGApO1xuICAgIH1cbiAgICBpZiAoIShmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoYCR7Zm9sZGVyX3N0cn0gaXMgYSBmaWxlLCBub3QgYSBmb2xkZXJgKTtcbiAgICB9XG5cbiAgICBsZXQgZmlsZXM6IEFycmF5PFRGaWxlPiA9IFtdO1xuICAgIFZhdWx0LnJlY3Vyc2VDaGlsZHJlbihmb2xkZXIsIChmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XG4gICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgIGZpbGVzLnB1c2goZmlsZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgcmV0dXJuIGEuYmFzZW5hbWUubG9jYWxlQ29tcGFyZShiLmJhc2VuYW1lKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmaWxlcztcbn0iLCJpbXBvcnQgeyBBcHAsIEZ1enp5U3VnZ2VzdE1vZGFsLCBURmlsZSwgVEZvbGRlciwgbm9ybWFsaXplUGF0aCwgVmF1bHQsIFRBYnN0cmFjdEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGdldFRGaWxlc0Zyb21Gb2xkZXIgfSBmcm9tIFwiVXRpbHNcIjtcbmltcG9ydCBUZW1wbGF0ZXJQbHVnaW4gZnJvbSAnLi9tYWluJztcblxuZXhwb3J0IGVudW0gT3Blbk1vZGUge1xuICAgIEluc2VydFRlbXBsYXRlLFxuICAgIENyZWF0ZU5vdGVUZW1wbGF0ZSxcbn07XG5cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZXJGdXp6eVN1Z2dlc3RNb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPFRGaWxlPiB7XG4gICAgcHVibGljIGFwcDogQXBwO1xuICAgIHByaXZhdGUgcGx1Z2luOiBUZW1wbGF0ZXJQbHVnaW47XG4gICAgcHJpdmF0ZSBvcGVuX21vZGU6IE9wZW5Nb2RlO1xuICAgIHByaXZhdGUgY3JlYXRpb25fZm9sZGVyOiBURm9sZGVyO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogVGVtcGxhdGVyUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBnZXRJdGVtcygpOiBURmlsZVtdIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnRlbXBsYXRlX2ZvbGRlciA9PT0gXCJcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ2V0VEZpbGVzRnJvbUZvbGRlcih0aGlzLmFwcCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGVtcGxhdGVfZm9sZGVyKTtcbiAgICB9XG5cbiAgICBnZXRJdGVtVGV4dChpdGVtOiBURmlsZSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBpdGVtLmJhc2VuYW1lO1xuICAgIH1cblxuICAgIG9uQ2hvb3NlSXRlbShpdGVtOiBURmlsZSwgX2V2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgc3dpdGNoKHRoaXMub3Blbl9tb2RlKSB7XG4gICAgICAgICAgICBjYXNlIE9wZW5Nb2RlLkluc2VydFRlbXBsYXRlOlxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnRlbXBsYXRlci5hcHBlbmRfdGVtcGxhdGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIE9wZW5Nb2RlLkNyZWF0ZU5vdGVUZW1wbGF0ZTpcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi50ZW1wbGF0ZXIuY3JlYXRlX25ld19ub3RlX2Zyb21fdGVtcGxhdGUoaXRlbSwgdGhpcy5jcmVhdGlvbl9mb2xkZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnQoKTogdm9pZCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5sb2dfZXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnNlcnRfdGVtcGxhdGUoKTogdm9pZCB7XG4gICAgICAgIHRoaXMub3Blbl9tb2RlID0gT3Blbk1vZGUuSW5zZXJ0VGVtcGxhdGU7XG4gICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICB9XG5cbiAgICBjcmVhdGVfbmV3X25vdGVfZnJvbV90ZW1wbGF0ZShmb2xkZXI/OiBURm9sZGVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3JlYXRpb25fZm9sZGVyID0gZm9sZGVyO1xuICAgICAgICB0aGlzLm9wZW5fbW9kZSA9IE9wZW5Nb2RlLkNyZWF0ZU5vdGVUZW1wbGF0ZTtcbiAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgIH1cbn1cbiIsImV4cG9ydCBjb25zdCBVTlNVUFBPUlRFRF9NT0JJTEVfVEVNUExBVEU6IHN0cmluZyA9IFwiRXJyb3JfTW9iaWxlVW5zdXBwb3J0ZWRUZW1wbGF0ZVwiO1xuZXhwb3J0IGNvbnN0IElDT05fREFUQTogc3RyaW5nID0gYDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgNTEuMTMyOCAyOC43XCI+PHBhdGggZD1cIk0wIDE1LjE0IDAgMTAuMTUgMTguNjcgMS41MSAxOC42NyA2LjAzIDQuNzIgMTIuMzMgNC43MiAxMi43NiAxOC42NyAxOS4yMiAxOC42NyAyMy43NCAwIDE1LjE0Wk0zMy42OTI4IDEuODRDMzMuNjkyOCAxLjg0IDMzLjk3NjEgMi4xNDY3IDM0LjU0MjggMi43NkMzNS4xMDk0IDMuMzggMzUuMzkyOCA0LjU2IDM1LjM5MjggNi4zQzM1LjM5MjggOC4wNDY2IDM0LjgxOTUgOS41NCAzMy42NzI4IDEwLjc4QzMyLjUyNjEgMTIuMDIgMzEuMDk5NSAxMi42NCAyOS4zOTI4IDEyLjY0QzI3LjY4NjIgMTIuNjQgMjYuMjY2MSAxMi4wMjY3IDI1LjEzMjggMTAuOEMyMy45OTI4IDkuNTczMyAyMy40MjI4IDguMDg2NyAyMy40MjI4IDYuMzRDMjMuNDIyOCA0LjYgMjMuOTk5NSAzLjEwNjYgMjUuMTUyOCAxLjg2QzI2LjI5OTQuNjIgMjcuNzI2MSAwIDI5LjQzMjggMEMzMS4xMzk1IDAgMzIuNTU5NC42MTMzIDMzLjY5MjggMS44NE00OS44MjI4LjY3IDI5LjUzMjggMjguMzggMjQuNDEyOCAyOC4zOCA0NC43MTI4LjY3IDQ5LjgyMjguNjdNMzEuMDMyOCA4LjM4QzMxLjAzMjggOC4zOCAzMS4xMzk1IDguMjQ2NyAzMS4zNTI4IDcuOThDMzEuNTY2MiA3LjcwNjcgMzEuNjcyOCA3LjE3MzMgMzEuNjcyOCA2LjM4QzMxLjY3MjggNS41ODY3IDMxLjQ0NjEgNC45MiAzMC45OTI4IDQuMzhDMzAuNTQ2MSAzLjg0IDI5Ljk5OTUgMy41NyAyOS4zNTI4IDMuNTdDMjguNzA2MSAzLjU3IDI4LjE2OTUgMy44NCAyNy43NDI4IDQuMzhDMjcuMzIyOCA0LjkyIDI3LjExMjggNS41ODY3IDI3LjExMjggNi4zOEMyNy4xMTI4IDcuMTczMyAyNy4zMzYxIDcuODQgMjcuNzgyOCA4LjM4QzI4LjIzNjEgOC45MjY3IDI4Ljc4NjEgOS4yIDI5LjQzMjggOS4yQzMwLjA3OTUgOS4yIDMwLjYxMjggOC45MjY3IDMxLjAzMjggOC4zOE00OS40MzI4IDE3LjlDNDkuNDMyOCAxNy45IDQ5LjcxNjEgMTguMjA2NyA1MC4yODI4IDE4LjgyQzUwLjg0OTUgMTkuNDMzMyA1MS4xMzI4IDIwLjYxMzMgNTEuMTMyOCAyMi4zNkM1MS4xMzI4IDI0LjEgNTAuNTU5NCAyNS41OSA0OS40MTI4IDI2LjgzQzQ4LjI1OTUgMjguMDc2NiA0Ni44Mjk1IDI4LjcgNDUuMTIyOCAyOC43QzQzLjQyMjggMjguNyA0Mi4wMDI4IDI4LjA4MzMgNDAuODYyOCAyNi44NUMzOS43Mjk1IDI1LjYyMzMgMzkuMTYyOCAyNC4xMzY2IDM5LjE2MjggMjIuMzlDMzkuMTYyOCAyMC42NSAzOS43MzYxIDE5LjE2IDQwLjg4MjggMTcuOTJDNDIuMDM2MSAxNi42NzMzIDQzLjQ2MjggMTYuMDUgNDUuMTYyOCAxNi4wNUM0Ni44Njk0IDE2LjA1IDQ4LjI5MjggMTYuNjY2NyA0OS40MzI4IDE3LjlNNDYuODUyOCAyNC41MkM0Ni44NTI4IDI0LjUyIDQ2Ljk1OTUgMjQuMzgzMyA0Ny4xNzI4IDI0LjExQzQ3LjM3OTUgMjMuODM2NyA0Ny40ODI4IDIzLjMwMzMgNDcuNDgyOCAyMi41MUM0Ny40ODI4IDIxLjcxNjcgNDcuMjU5NSAyMS4wNSA0Ni44MTI4IDIwLjUxQzQ2LjM2NjEgMTkuOTcgNDUuODE2MiAxOS43IDQ1LjE2MjggMTkuN0M0NC41MTYxIDE5LjcgNDMuOTgyOCAxOS45NyA0My41NjI4IDIwLjUxQzQzLjE0MjggMjEuMDUgNDIuOTMyOCAyMS43MTY3IDQyLjkzMjggMjIuNTFDNDIuOTMyOCAyMy4zMDMzIDQzLjE1NjEgMjMuOTczMyA0My42MDI4IDI0LjUyQzQ0LjA0OTQgMjUuMDYgNDQuNTk2MSAyNS4zMyA0NS4yNDI4IDI1LjMzQzQ1Ljg4OTUgMjUuMzMgNDYuNDI2MSAyNS4wNiA0Ni44NTI4IDI0LjUyWlwiIGZpbGw9XCJjdXJyZW50Q29sb3JcIi8+PC9zdmc+YDsiLCJpbXBvcnQgeyBBcHAsIEVkaXRvclBvc2l0aW9uLCBFZGl0b3JSYW5nZU9yQ2FyZXQsIEVkaXRvclRyYW5zYWN0aW9uLCBNYXJrZG93blZpZXcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGVzY2FwZVJlZ0V4cCB9IGZyb20gXCJVdGlsc1wiO1xuXG5leHBvcnQgY2xhc3MgQ3Vyc29ySnVtcGVyIHtcbiAgICBwcml2YXRlIGN1cnNvcl9yZWdleDogUmVnRXhwID0gbmV3IFJlZ0V4cChcIjwlXFxcXHMqdHAuZmlsZS5jdXJzb3JcXFxcKCg/PG9yZGVyPlswLTldezAsMn0pXFxcXClcXFxccyolPlwiLCBcImdcIik7XHRcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHApIHt9XG5cbiAgICBhc3luYyBqdW1wX3RvX25leHRfY3Vyc29yX2xvY2F0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBhY3RpdmVfdmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG4gICAgICAgIGlmICghYWN0aXZlX3ZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3RpdmVfZmlsZSA9IGFjdGl2ZV92aWV3LmZpbGU7XG4gICAgICAgIGF3YWl0IGFjdGl2ZV92aWV3LnNhdmUoKTtcblxuICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChhY3RpdmVfZmlsZSk7XG5cbiAgICAgICAgY29uc3Qge25ld19jb250ZW50LCBwb3NpdGlvbnN9ID0gdGhpcy5yZXBsYWNlX2FuZF9nZXRfY3Vyc29yX3Bvc2l0aW9ucyhjb250ZW50KTtcbiAgICAgICAgaWYgKHBvc2l0aW9ucykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGFjdGl2ZV9maWxlLCBuZXdfY29udGVudCk7XG4gICAgICAgICAgICB0aGlzLnNldF9jdXJzb3JfbG9jYXRpb24ocG9zaXRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldF9lZGl0b3JfcG9zaXRpb25fZnJvbV9pbmRleChjb250ZW50OiBzdHJpbmcsIGluZGV4OiBudW1iZXIpOiBFZGl0b3JQb3NpdGlvbiB7XG4gICAgICAgIGNvbnN0IHN1YnN0ciA9IGNvbnRlbnQuc3Vic3RyKDAsIGluZGV4KTtcblxuICAgICAgICBsZXQgbCA9IDA7XG4gICAgICAgIGxldCBvZmZzZXQgPSAtMTtcbiAgICAgICAgbGV0IHIgPSAtMTtcbiAgICAgICAgZm9yICg7IChyID0gc3Vic3RyLmluZGV4T2YoXCJcXG5cIiwgcisxKSkgIT09IC0xIDsgbCsrLCBvZmZzZXQ9cik7XG4gICAgICAgIG9mZnNldCArPSAxO1xuXG4gICAgICAgIGNvbnN0IGNoID0gY29udGVudC5zdWJzdHIob2Zmc2V0LCBpbmRleC1vZmZzZXQpLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4ge2xpbmU6IGwsIGNoOiBjaH07XG4gICAgfVxuXG4gICAgcmVwbGFjZV9hbmRfZ2V0X2N1cnNvcl9wb3NpdGlvbnMoY29udGVudDogc3RyaW5nKToge25ld19jb250ZW50Pzogc3RyaW5nLCBwb3NpdGlvbnM/OiBFZGl0b3JQb3NpdGlvbltdfSB7XG4gICAgICAgIGxldCBjdXJzb3JfbWF0Y2hlcyA9IFtdO1xuICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgIHdoaWxlKChtYXRjaCA9IHRoaXMuY3Vyc29yX3JlZ2V4LmV4ZWMoY29udGVudCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIGN1cnNvcl9tYXRjaGVzLnB1c2gobWF0Y2gpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3JfbWF0Y2hlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnNvcl9tYXRjaGVzLnNvcnQoKG0xLCBtMikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihtMS5ncm91cHNbXCJvcmRlclwiXSkgLSBOdW1iZXIobTIuZ3JvdXBzW1wib3JkZXJcIl0pO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgbWF0Y2hfc3RyID0gY3Vyc29yX21hdGNoZXNbMF1bMF07XG5cbiAgICAgICAgY3Vyc29yX21hdGNoZXMgPSBjdXJzb3JfbWF0Y2hlcy5maWx0ZXIobSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbVswXSA9PT0gbWF0Y2hfc3RyO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBwb3NpdGlvbnMgPSBbXTtcbiAgICAgICAgbGV0IGluZGV4X29mZnNldCA9IDA7XG4gICAgICAgIGZvciAobGV0IG1hdGNoIG9mIGN1cnNvcl9tYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG1hdGNoLmluZGV4IC0gaW5kZXhfb2Zmc2V0O1xuICAgICAgICAgICAgcG9zaXRpb25zLnB1c2godGhpcy5nZXRfZWRpdG9yX3Bvc2l0aW9uX2Zyb21faW5kZXgoY29udGVudCwgaW5kZXgpKTtcblxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKGVzY2FwZVJlZ0V4cChtYXRjaFswXSkpLCBcIlwiKTtcbiAgICAgICAgICAgIGluZGV4X29mZnNldCArPSBtYXRjaFswXS5sZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IFJlbW92ZSB0aGlzLCBicmVha2luZyBmb3Igbm93IHdhaXRpbmcgZm9yIHRoZSBuZXcgc2V0U2VsZWN0aW9ucyBBUElcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgLy8gRm9yIHRwLmZpbGUuY3Vyc29yKCksIHdlIG9ubHkgZmluZCBvbmVcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7bmV3X2NvbnRlbnQ6IGNvbnRlbnQsIHBvc2l0aW9uczogcG9zaXRpb25zfTtcbiAgICB9XG5cbiAgICBzZXRfY3Vyc29yX2xvY2F0aW9uKHBvc2l0aW9uczogRWRpdG9yUG9zaXRpb25bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBhY3RpdmVfdmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG4gICAgICAgIGlmICghYWN0aXZlX3ZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IFJlbW92ZSB0aGlzXG4gICAgICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZV92aWV3LmVkaXRvcjtcbiAgICAgICAgZWRpdG9yLmZvY3VzKCk7XG4gICAgICAgIGVkaXRvci5zZXRDdXJzb3IocG9zaXRpb25zWzBdKTtcblxuICAgICAgICAvKlxuICAgICAgICBsZXQgc2VsZWN0aW9ucyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBwb3Mgb2YgcG9zaXRpb25zKSB7XG4gICAgICAgICAgICBzZWxlY3Rpb25zLnB1c2goe2FuY2hvcjogcG9zLCBoZWFkOiBwb3N9KTtcbiAgICAgICAgfVxuICAgICAgICBlZGl0b3IuZm9jdXMoKTtcbiAgICAgICAgZWRpdG9yLnNldFNlbGVjdGlvbnMoc2VsZWN0aW9ucyk7XG4gICAgICAgICovXG5cbiAgICAgICAgLypcbiAgICAgICAgLy8gQ2hlY2sgaHR0cHM6Ly9naXRodWIuY29tL29ic2lkaWFubWQvb2JzaWRpYW4tYXBpL2lzc3Vlcy8xNFxuXG4gICAgICAgIGxldCBlZGl0b3IgPSBhY3RpdmVfdmlldy5lZGl0b3I7XG4gICAgICAgIGVkaXRvci5mb2N1cygpO1xuXG4gICAgICAgIGZvciAobGV0IHBvcyBvZiBwb3NpdGlvbnMpIHtcbiAgICAgICAgICAgIGxldCB0cmFuc2FjdGlvbjogRWRpdG9yVHJhbnNhY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIGZyb206IHBvc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBlZGl0b3IudHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgICovXG4gICAgfVxufSIsImltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcblxyXG52YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfTtcclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xuXG5mdW5jdGlvbiBzZXRQcm90b3R5cGVPZihvYmosIHByb3RvKSB7XHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuICAgIGlmIChPYmplY3Quc2V0UHJvdG90eXBlT2YpIHtcclxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2Yob2JqLCBwcm90byk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBvYmouX19wcm90b19fID0gcHJvdG87XHJcbiAgICB9XHJcbn1cclxuLy8gVGhpcyBpcyBwcmV0dHkgbXVjaCB0aGUgb25seSB3YXkgdG8gZ2V0IG5pY2UsIGV4dGVuZGVkIEVycm9yc1xyXG4vLyB3aXRob3V0IHVzaW5nIEVTNlxyXG4vKipcclxuICogVGhpcyByZXR1cm5zIGEgbmV3IEVycm9yIHdpdGggYSBjdXN0b20gcHJvdG90eXBlLiBOb3RlIHRoYXQgaXQncyBfbm90XyBhIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcclxuICpcclxuICogKipFeGFtcGxlKipcclxuICpcclxuICogYGBganNcclxuICogdGhyb3cgRXRhRXJyKFwidGVtcGxhdGUgbm90IGZvdW5kXCIpXHJcbiAqIGBgYFxyXG4gKi9cclxuZnVuY3Rpb24gRXRhRXJyKG1lc3NhZ2UpIHtcclxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICBzZXRQcm90b3R5cGVPZihlcnIsIEV0YUVyci5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGVycjtcclxufVxyXG5FdGFFcnIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUsIHtcclxuICAgIG5hbWU6IHsgdmFsdWU6ICdFdGEgRXJyb3InLCBlbnVtZXJhYmxlOiBmYWxzZSB9XHJcbn0pO1xyXG4vKipcclxuICogVGhyb3dzIGFuIEV0YUVyciB3aXRoIGEgbmljZWx5IGZvcm1hdHRlZCBlcnJvciBhbmQgbWVzc2FnZSBzaG93aW5nIHdoZXJlIGluIHRoZSB0ZW1wbGF0ZSB0aGUgZXJyb3Igb2NjdXJyZWQuXHJcbiAqL1xyXG5mdW5jdGlvbiBQYXJzZUVycihtZXNzYWdlLCBzdHIsIGluZHgpIHtcclxuICAgIHZhciB3aGl0ZXNwYWNlID0gc3RyLnNsaWNlKDAsIGluZHgpLnNwbGl0KC9cXG4vKTtcclxuICAgIHZhciBsaW5lTm8gPSB3aGl0ZXNwYWNlLmxlbmd0aDtcclxuICAgIHZhciBjb2xObyA9IHdoaXRlc3BhY2VbbGluZU5vIC0gMV0ubGVuZ3RoICsgMTtcclxuICAgIG1lc3NhZ2UgKz1cclxuICAgICAgICAnIGF0IGxpbmUgJyArXHJcbiAgICAgICAgICAgIGxpbmVObyArXHJcbiAgICAgICAgICAgICcgY29sICcgK1xyXG4gICAgICAgICAgICBjb2xObyArXHJcbiAgICAgICAgICAgICc6XFxuXFxuJyArXHJcbiAgICAgICAgICAgICcgICcgK1xyXG4gICAgICAgICAgICBzdHIuc3BsaXQoL1xcbi8pW2xpbmVObyAtIDFdICtcclxuICAgICAgICAgICAgJ1xcbicgK1xyXG4gICAgICAgICAgICAnICAnICtcclxuICAgICAgICAgICAgQXJyYXkoY29sTm8pLmpvaW4oJyAnKSArXHJcbiAgICAgICAgICAgICdeJztcclxuICAgIHRocm93IEV0YUVycihtZXNzYWdlKTtcclxufVxuXG4vKipcclxuICogQHJldHVybnMgVGhlIGdsb2JhbCBQcm9taXNlIGZ1bmN0aW9uXHJcbiAqL1xyXG52YXIgcHJvbWlzZUltcGwgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKS5Qcm9taXNlO1xyXG4vKipcclxuICogQHJldHVybnMgQSBuZXcgQXN5bmNGdW5jdGlvbiBjb25zdHVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRBc3luY0Z1bmN0aW9uQ29uc3RydWN0b3IoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oJ3JldHVybiAoYXN5bmMgZnVuY3Rpb24oKXt9KS5jb25zdHJ1Y3RvcicpKCk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXRhRXJyKFwiVGhpcyBlbnZpcm9ubWVudCBkb2Vzbid0IHN1cHBvcnQgYXN5bmMvYXdhaXRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4vKipcclxuICogc3RyLnRyaW1MZWZ0IHBvbHlmaWxsXHJcbiAqXHJcbiAqIEBwYXJhbSBzdHIgLSBJbnB1dCBzdHJpbmdcclxuICogQHJldHVybnMgVGhlIHN0cmluZyB3aXRoIGxlZnQgd2hpdGVzcGFjZSByZW1vdmVkXHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiB0cmltTGVmdChzdHIpIHtcclxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1leHRyYS1ib29sZWFuLWNhc3RcclxuICAgIGlmICghIVN0cmluZy5wcm90b3R5cGUudHJpbUxlZnQpIHtcclxuICAgICAgICByZXR1cm4gc3RyLnRyaW1MZWZ0KCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrLywgJycpO1xyXG4gICAgfVxyXG59XHJcbi8qKlxyXG4gKiBzdHIudHJpbVJpZ2h0IHBvbHlmaWxsXHJcbiAqXHJcbiAqIEBwYXJhbSBzdHIgLSBJbnB1dCBzdHJpbmdcclxuICogQHJldHVybnMgVGhlIHN0cmluZyB3aXRoIHJpZ2h0IHdoaXRlc3BhY2UgcmVtb3ZlZFxyXG4gKlxyXG4gKi9cclxuZnVuY3Rpb24gdHJpbVJpZ2h0KHN0cikge1xyXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWV4dHJhLWJvb2xlYW4tY2FzdFxyXG4gICAgaWYgKCEhU3RyaW5nLnByb3RvdHlwZS50cmltUmlnaHQpIHtcclxuICAgICAgICByZXR1cm4gc3RyLnRyaW1SaWdodCgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXHMrJC8sICcnKTsgLy8gVE9ETzogZG8gd2UgcmVhbGx5IG5lZWQgdG8gcmVwbGFjZSBCT00ncz9cclxuICAgIH1cclxufVxuXG4vLyBUT0RPOiBhbGxvdyAnLScgdG8gdHJpbSB1cCB1bnRpbCBuZXdsaW5lLiBVc2UgW15cXFNcXG5cXHJdIGluc3RlYWQgb2YgXFxzXHJcbi8qIEVORCBUWVBFUyAqL1xyXG5mdW5jdGlvbiBoYXNPd25Qcm9wKG9iaiwgcHJvcCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xyXG59XHJcbmZ1bmN0aW9uIGNvcHlQcm9wcyh0b09iaiwgZnJvbU9iaikge1xyXG4gICAgZm9yICh2YXIga2V5IGluIGZyb21PYmopIHtcclxuICAgICAgICBpZiAoaGFzT3duUHJvcChmcm9tT2JqLCBrZXkpKSB7XHJcbiAgICAgICAgICAgIHRvT2JqW2tleV0gPSBmcm9tT2JqW2tleV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvT2JqO1xyXG59XHJcbi8qKlxyXG4gKiBUYWtlcyBhIHN0cmluZyB3aXRoaW4gYSB0ZW1wbGF0ZSBhbmQgdHJpbXMgaXQsIGJhc2VkIG9uIHRoZSBwcmVjZWRpbmcgdGFnJ3Mgd2hpdGVzcGFjZSBjb250cm9sIGFuZCBgY29uZmlnLmF1dG9UcmltYFxyXG4gKi9cclxuZnVuY3Rpb24gdHJpbVdTKHN0ciwgY29uZmlnLCB3c0xlZnQsIHdzUmlnaHQpIHtcclxuICAgIHZhciBsZWZ0VHJpbTtcclxuICAgIHZhciByaWdodFRyaW07XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcuYXV0b1RyaW0pKSB7XHJcbiAgICAgICAgLy8ga2luZGEgY29uZnVzaW5nXHJcbiAgICAgICAgLy8gYnV0IF99fSB3aWxsIHRyaW0gdGhlIGxlZnQgc2lkZSBvZiB0aGUgZm9sbG93aW5nIHN0cmluZ1xyXG4gICAgICAgIGxlZnRUcmltID0gY29uZmlnLmF1dG9UcmltWzFdO1xyXG4gICAgICAgIHJpZ2h0VHJpbSA9IGNvbmZpZy5hdXRvVHJpbVswXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGxlZnRUcmltID0gcmlnaHRUcmltID0gY29uZmlnLmF1dG9UcmltO1xyXG4gICAgfVxyXG4gICAgaWYgKHdzTGVmdCB8fCB3c0xlZnQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgbGVmdFRyaW0gPSB3c0xlZnQ7XHJcbiAgICB9XHJcbiAgICBpZiAod3NSaWdodCB8fCB3c1JpZ2h0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHJpZ2h0VHJpbSA9IHdzUmlnaHQ7XHJcbiAgICB9XHJcbiAgICBpZiAoIXJpZ2h0VHJpbSAmJiAhbGVmdFRyaW0pIHtcclxuICAgICAgICByZXR1cm4gc3RyO1xyXG4gICAgfVxyXG4gICAgaWYgKGxlZnRUcmltID09PSAnc2x1cnAnICYmIHJpZ2h0VHJpbSA9PT0gJ3NsdXJwJykge1xyXG4gICAgICAgIHJldHVybiBzdHIudHJpbSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGxlZnRUcmltID09PSAnXycgfHwgbGVmdFRyaW0gPT09ICdzbHVycCcpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygndHJpbW1pbmcgbGVmdCcgKyBsZWZ0VHJpbSlcclxuICAgICAgICAvLyBmdWxsIHNsdXJwXHJcbiAgICAgICAgc3RyID0gdHJpbUxlZnQoc3RyKTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGxlZnRUcmltID09PSAnLScgfHwgbGVmdFRyaW0gPT09ICdubCcpIHtcclxuICAgICAgICAvLyBubCB0cmltXHJcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoL14oPzpcXHJcXG58XFxufFxccikvLCAnJyk7XHJcbiAgICB9XHJcbiAgICBpZiAocmlnaHRUcmltID09PSAnXycgfHwgcmlnaHRUcmltID09PSAnc2x1cnAnKSB7XHJcbiAgICAgICAgLy8gZnVsbCBzbHVycFxyXG4gICAgICAgIHN0ciA9IHRyaW1SaWdodChzdHIpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAocmlnaHRUcmltID09PSAnLScgfHwgcmlnaHRUcmltID09PSAnbmwnKSB7XHJcbiAgICAgICAgLy8gbmwgdHJpbVxyXG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8oPzpcXHJcXG58XFxufFxccikkLywgJycpOyAvLyBUT0RPOiBtYWtlIHN1cmUgdGhpcyBnZXRzIFxcclxcblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHN0cjtcclxufVxyXG4vKipcclxuICogQSBtYXAgb2Ygc3BlY2lhbCBIVE1MIGNoYXJhY3RlcnMgdG8gdGhlaXIgWE1MLWVzY2FwZWQgZXF1aXZhbGVudHNcclxuICovXHJcbnZhciBlc2NNYXAgPSB7XHJcbiAgICAnJic6ICcmYW1wOycsXHJcbiAgICAnPCc6ICcmbHQ7JyxcclxuICAgICc+JzogJyZndDsnLFxyXG4gICAgJ1wiJzogJyZxdW90OycsXHJcbiAgICBcIidcIjogJyYjMzk7J1xyXG59O1xyXG5mdW5jdGlvbiByZXBsYWNlQ2hhcihzKSB7XHJcbiAgICByZXR1cm4gZXNjTWFwW3NdO1xyXG59XHJcbi8qKlxyXG4gKiBYTUwtZXNjYXBlcyBhbiBpbnB1dCB2YWx1ZSBhZnRlciBjb252ZXJ0aW5nIGl0IHRvIGEgc3RyaW5nXHJcbiAqXHJcbiAqIEBwYXJhbSBzdHIgLSBJbnB1dCB2YWx1ZSAodXN1YWxseSBhIHN0cmluZylcclxuICogQHJldHVybnMgWE1MLWVzY2FwZWQgc3RyaW5nXHJcbiAqL1xyXG5mdW5jdGlvbiBYTUxFc2NhcGUoc3RyKSB7XHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuICAgIC8vIFRvIGRlYWwgd2l0aCBYU1MuIEJhc2VkIG9uIEVzY2FwZSBpbXBsZW1lbnRhdGlvbnMgb2YgTXVzdGFjaGUuSlMgYW5kIE1hcmtvLCB0aGVuIGN1c3RvbWl6ZWQuXHJcbiAgICB2YXIgbmV3U3RyID0gU3RyaW5nKHN0cik7XHJcbiAgICBpZiAoL1smPD5cIiddLy50ZXN0KG5ld1N0cikpIHtcclxuICAgICAgICByZXR1cm4gbmV3U3RyLnJlcGxhY2UoL1smPD5cIiddL2csIHJlcGxhY2VDaGFyKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBuZXdTdHI7XHJcbiAgICB9XHJcbn1cblxuLyogRU5EIFRZUEVTICovXHJcbnZhciB0ZW1wbGF0ZUxpdFJlZyA9IC9gKD86XFxcXFtcXHNcXFNdfFxcJHsoPzpbXnt9XXx7KD86W157fV18e1tefV0qfSkqfSkqfXwoPyFcXCR7KVteXFxcXGBdKSpgL2c7XHJcbnZhciBzaW5nbGVRdW90ZVJlZyA9IC8nKD86XFxcXFtcXHNcXHdcIidcXFxcYF18W15cXG5cXHInXFxcXF0pKj8nL2c7XHJcbnZhciBkb3VibGVRdW90ZVJlZyA9IC9cIig/OlxcXFxbXFxzXFx3XCInXFxcXGBdfFteXFxuXFxyXCJcXFxcXSkqP1wiL2c7XHJcbi8qKiBFc2NhcGUgc3BlY2lhbCByZWd1bGFyIGV4cHJlc3Npb24gY2hhcmFjdGVycyBpbnNpZGUgYSBzdHJpbmcgKi9cclxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHN0cmluZykge1xyXG4gICAgLy8gRnJvbSBNRE5cclxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qK1xcLT9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKTsgLy8gJCYgbWVhbnMgdGhlIHdob2xlIG1hdGNoZWQgc3RyaW5nXHJcbn1cclxuZnVuY3Rpb24gcGFyc2Uoc3RyLCBjb25maWcpIHtcclxuICAgIHZhciBidWZmZXIgPSBbXTtcclxuICAgIHZhciB0cmltTGVmdE9mTmV4dFN0ciA9IGZhbHNlO1xyXG4gICAgdmFyIGxhc3RJbmRleCA9IDA7XHJcbiAgICB2YXIgcGFyc2VPcHRpb25zID0gY29uZmlnLnBhcnNlO1xyXG4gICAgaWYgKGNvbmZpZy5wbHVnaW5zKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25maWcucGx1Z2lucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgcGx1Z2luID0gY29uZmlnLnBsdWdpbnNbaV07XHJcbiAgICAgICAgICAgIGlmIChwbHVnaW4ucHJvY2Vzc1RlbXBsYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBzdHIgPSBwbHVnaW4ucHJvY2Vzc1RlbXBsYXRlKHN0ciwgY29uZmlnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qIEFkZGluZyBmb3IgRUpTIGNvbXBhdGliaWxpdHkgKi9cclxuICAgIGlmIChjb25maWcucm1XaGl0ZXNwYWNlKSB7XHJcbiAgICAgICAgLy8gQ29kZSB0YWtlbiBkaXJlY3RseSBmcm9tIEVKU1xyXG4gICAgICAgIC8vIEhhdmUgdG8gdXNlIHR3byBzZXBhcmF0ZSByZXBsYWNlcyBoZXJlIGFzIGBeYCBhbmQgYCRgIG9wZXJhdG9ycyBkb24ndFxyXG4gICAgICAgIC8vIHdvcmsgd2VsbCB3aXRoIGBcXHJgIGFuZCBlbXB0eSBsaW5lcyBkb24ndCB3b3JrIHdlbGwgd2l0aCB0aGUgYG1gIGZsYWcuXHJcbiAgICAgICAgLy8gRXNzZW50aWFsbHksIHRoaXMgcmVwbGFjZXMgdGhlIHdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mXHJcbiAgICAgICAgLy8gZWFjaCBsaW5lIGFuZCByZW1vdmVzIG11bHRpcGxlIG5ld2xpbmVzLlxyXG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXFxyXFxuXSsvZywgJ1xcbicpLnJlcGxhY2UoL15cXHMrfFxccyskL2dtLCAnJyk7XHJcbiAgICB9XHJcbiAgICAvKiBFbmQgcm1XaGl0ZXNwYWNlIG9wdGlvbiAqL1xyXG4gICAgdGVtcGxhdGVMaXRSZWcubGFzdEluZGV4ID0gMDtcclxuICAgIHNpbmdsZVF1b3RlUmVnLmxhc3RJbmRleCA9IDA7XHJcbiAgICBkb3VibGVRdW90ZVJlZy5sYXN0SW5kZXggPSAwO1xyXG4gICAgZnVuY3Rpb24gcHVzaFN0cmluZyhzdHJuZywgc2hvdWxkVHJpbVJpZ2h0T2ZTdHJpbmcpIHtcclxuICAgICAgICBpZiAoc3RybmcpIHtcclxuICAgICAgICAgICAgLy8gaWYgc3RyaW5nIGlzIHRydXRoeSBpdCBtdXN0IGJlIG9mIHR5cGUgJ3N0cmluZydcclxuICAgICAgICAgICAgc3RybmcgPSB0cmltV1Moc3RybmcsIGNvbmZpZywgdHJpbUxlZnRPZk5leHRTdHIsIC8vIHRoaXMgd2lsbCBvbmx5IGJlIGZhbHNlIG9uIHRoZSBmaXJzdCBzdHIsIHRoZSBuZXh0IG9uZXMgd2lsbCBiZSBudWxsIG9yIHVuZGVmaW5lZFxyXG4gICAgICAgICAgICBzaG91bGRUcmltUmlnaHRPZlN0cmluZyk7XHJcbiAgICAgICAgICAgIGlmIChzdHJuZykge1xyXG4gICAgICAgICAgICAgICAgLy8gcmVwbGFjZSBcXCB3aXRoIFxcXFwsICcgd2l0aCBcXCdcclxuICAgICAgICAgICAgICAgIC8vIHdlJ3JlIGdvaW5nIHRvIGNvbnZlcnQgYWxsIENSTEYgdG8gTEYgc28gaXQgZG9lc24ndCB0YWtlIG1vcmUgdGhhbiBvbmUgcmVwbGFjZVxyXG4gICAgICAgICAgICAgICAgc3RybmcgPSBzdHJuZy5yZXBsYWNlKC9cXFxcfCcvZywgJ1xcXFwkJicpLnJlcGxhY2UoL1xcclxcbnxcXG58XFxyL2csICdcXFxcbicpO1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyLnB1c2goc3RybmcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdmFyIHByZWZpeGVzID0gW3BhcnNlT3B0aW9ucy5leGVjLCBwYXJzZU9wdGlvbnMuaW50ZXJwb2xhdGUsIHBhcnNlT3B0aW9ucy5yYXddLnJlZHVjZShmdW5jdGlvbiAoYWNjdW11bGF0b3IsIHByZWZpeCkge1xyXG4gICAgICAgIGlmIChhY2N1bXVsYXRvciAmJiBwcmVmaXgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yICsgJ3wnICsgZXNjYXBlUmVnRXhwKHByZWZpeCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHByZWZpeCkge1xyXG4gICAgICAgICAgICAvLyBhY2N1bXVsYXRvciBpcyBmYWxzeVxyXG4gICAgICAgICAgICByZXR1cm4gZXNjYXBlUmVnRXhwKHByZWZpeCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBwcmVmaXggYW5kIGFjY3VtdWxhdG9yIGFyZSBib3RoIGZhbHN5XHJcbiAgICAgICAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcclxuICAgICAgICB9XHJcbiAgICB9LCAnJyk7XHJcbiAgICB2YXIgcGFyc2VPcGVuUmVnID0gbmV3IFJlZ0V4cCgnKFteXSo/KScgKyBlc2NhcGVSZWdFeHAoY29uZmlnLnRhZ3NbMF0pICsgJygtfF8pP1xcXFxzKignICsgcHJlZml4ZXMgKyAnKT9cXFxccyonLCAnZycpO1xyXG4gICAgdmFyIHBhcnNlQ2xvc2VSZWcgPSBuZXcgUmVnRXhwKCdcXCd8XCJ8YHxcXFxcL1xcXFwqfChcXFxccyooLXxfKT8nICsgZXNjYXBlUmVnRXhwKGNvbmZpZy50YWdzWzFdKSArICcpJywgJ2cnKTtcclxuICAgIC8vIFRPRE86IGJlbmNobWFyayBoYXZpbmcgdGhlIFxccyogb24gZWl0aGVyIHNpZGUgdnMgdXNpbmcgc3RyLnRyaW0oKVxyXG4gICAgdmFyIG07XHJcbiAgICB3aGlsZSAoKG0gPSBwYXJzZU9wZW5SZWcuZXhlYyhzdHIpKSkge1xyXG4gICAgICAgIGxhc3RJbmRleCA9IG1bMF0ubGVuZ3RoICsgbS5pbmRleDtcclxuICAgICAgICB2YXIgcHJlY2VkaW5nU3RyaW5nID0gbVsxXTtcclxuICAgICAgICB2YXIgd3NMZWZ0ID0gbVsyXTtcclxuICAgICAgICB2YXIgcHJlZml4ID0gbVszXSB8fCAnJzsgLy8gYnkgZGVmYXVsdCBlaXRoZXIgfiwgPSwgb3IgZW1wdHlcclxuICAgICAgICBwdXNoU3RyaW5nKHByZWNlZGluZ1N0cmluZywgd3NMZWZ0KTtcclxuICAgICAgICBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCA9IGxhc3RJbmRleDtcclxuICAgICAgICB2YXIgY2xvc2VUYWcgPSB2b2lkIDA7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRPYmogPSBmYWxzZTtcclxuICAgICAgICB3aGlsZSAoKGNsb3NlVGFnID0gcGFyc2VDbG9zZVJlZy5leGVjKHN0cikpKSB7XHJcbiAgICAgICAgICAgIGlmIChjbG9zZVRhZ1sxXSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBzdHIuc2xpY2UobGFzdEluZGV4LCBjbG9zZVRhZy5pbmRleCk7XHJcbiAgICAgICAgICAgICAgICBwYXJzZU9wZW5SZWcubGFzdEluZGV4ID0gbGFzdEluZGV4ID0gcGFyc2VDbG9zZVJlZy5sYXN0SW5kZXg7XHJcbiAgICAgICAgICAgICAgICB0cmltTGVmdE9mTmV4dFN0ciA9IGNsb3NlVGFnWzJdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRUeXBlID0gcHJlZml4ID09PSBwYXJzZU9wdGlvbnMuZXhlY1xyXG4gICAgICAgICAgICAgICAgICAgID8gJ2UnXHJcbiAgICAgICAgICAgICAgICAgICAgOiBwcmVmaXggPT09IHBhcnNlT3B0aW9ucy5yYXdcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyAncidcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiBwcmVmaXggPT09IHBhcnNlT3B0aW9ucy5pbnRlcnBvbGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyAnaSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50T2JqID0geyB0OiBjdXJyZW50VHlwZSwgdmFsOiBjb250ZW50IH07XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBjaGFyID0gY2xvc2VUYWdbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hhciA9PT0gJy8qJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb21tZW50Q2xvc2VJbmQgPSBzdHIuaW5kZXhPZignKi8nLCBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbW1lbnRDbG9zZUluZCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgUGFyc2VFcnIoJ3VuY2xvc2VkIGNvbW1lbnQnLCBzdHIsIGNsb3NlVGFnLmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VDbG9zZVJlZy5sYXN0SW5kZXggPSBjb21tZW50Q2xvc2VJbmQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChjaGFyID09PSBcIidcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHNpbmdsZVF1b3RlUmVnLmxhc3RJbmRleCA9IGNsb3NlVGFnLmluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzaW5nbGVRdW90ZU1hdGNoID0gc2luZ2xlUXVvdGVSZWcuZXhlYyhzdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzaW5nbGVRdW90ZU1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlQ2xvc2VSZWcubGFzdEluZGV4ID0gc2luZ2xlUXVvdGVSZWcubGFzdEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgUGFyc2VFcnIoJ3VuY2xvc2VkIHN0cmluZycsIHN0ciwgY2xvc2VUYWcuaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNoYXIgPT09ICdcIicpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb3VibGVRdW90ZVJlZy5sYXN0SW5kZXggPSBjbG9zZVRhZy5pbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZG91YmxlUXVvdGVNYXRjaCA9IGRvdWJsZVF1b3RlUmVnLmV4ZWMoc3RyKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG91YmxlUXVvdGVNYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCA9IGRvdWJsZVF1b3RlUmVnLmxhc3RJbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFBhcnNlRXJyKCd1bmNsb3NlZCBzdHJpbmcnLCBzdHIsIGNsb3NlVGFnLmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChjaGFyID09PSAnYCcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUxpdFJlZy5sYXN0SW5kZXggPSBjbG9zZVRhZy5pbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVMaXRNYXRjaCA9IHRlbXBsYXRlTGl0UmVnLmV4ZWMoc3RyKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGVMaXRNYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCA9IHRlbXBsYXRlTGl0UmVnLmxhc3RJbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFBhcnNlRXJyKCd1bmNsb3NlZCBzdHJpbmcnLCBzdHIsIGNsb3NlVGFnLmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGN1cnJlbnRPYmopIHtcclxuICAgICAgICAgICAgYnVmZmVyLnB1c2goY3VycmVudE9iaik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBQYXJzZUVycigndW5jbG9zZWQgdGFnJywgc3RyLCBtLmluZGV4ICsgcHJlY2VkaW5nU3RyaW5nLmxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHVzaFN0cmluZyhzdHIuc2xpY2UobGFzdEluZGV4LCBzdHIubGVuZ3RoKSwgZmFsc2UpO1xyXG4gICAgaWYgKGNvbmZpZy5wbHVnaW5zKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25maWcucGx1Z2lucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgcGx1Z2luID0gY29uZmlnLnBsdWdpbnNbaV07XHJcbiAgICAgICAgICAgIGlmIChwbHVnaW4ucHJvY2Vzc0FTVCkge1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyID0gcGx1Z2luLnByb2Nlc3NBU1QoYnVmZmVyLCBjb25maWcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGJ1ZmZlcjtcclxufVxuXG4vKiBFTkQgVFlQRVMgKi9cclxuLyoqXHJcbiAqIENvbXBpbGVzIGEgdGVtcGxhdGUgc3RyaW5nIHRvIGEgZnVuY3Rpb24gc3RyaW5nLiBNb3N0IG9mdGVuIHVzZXJzIGp1c3QgdXNlIGBjb21waWxlKClgLCB3aGljaCBjYWxscyBgY29tcGlsZVRvU3RyaW5nYCBhbmQgY3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB1c2luZyB0aGUgcmVzdWx0XHJcbiAqXHJcbiAqICoqRXhhbXBsZSoqXHJcbiAqXHJcbiAqIGBgYGpzXHJcbiAqIGNvbXBpbGVUb1N0cmluZyhcIkhpIDwlPSBpdC51c2VyICU+XCIsIGV0YS5jb25maWcpXHJcbiAqIC8vIFwidmFyIHRSPScnLGluY2x1ZGU9RS5pbmNsdWRlLmJpbmQoRSksaW5jbHVkZUZpbGU9RS5pbmNsdWRlRmlsZS5iaW5kKEUpO3RSKz0nSGkgJzt0Uis9RS5lKGl0LnVzZXIpO2lmKGNiKXtjYihudWxsLHRSKX0gcmV0dXJuIHRSXCJcclxuICogYGBgXHJcbiAqL1xyXG5mdW5jdGlvbiBjb21waWxlVG9TdHJpbmcoc3RyLCBjb25maWcpIHtcclxuICAgIHZhciBidWZmZXIgPSBwYXJzZShzdHIsIGNvbmZpZyk7XHJcbiAgICB2YXIgcmVzID0gXCJ2YXIgdFI9JycsX19sLF9fbFBcIiArXHJcbiAgICAgICAgKGNvbmZpZy5pbmNsdWRlID8gJyxpbmNsdWRlPUUuaW5jbHVkZS5iaW5kKEUpJyA6ICcnKSArXHJcbiAgICAgICAgKGNvbmZpZy5pbmNsdWRlRmlsZSA/ICcsaW5jbHVkZUZpbGU9RS5pbmNsdWRlRmlsZS5iaW5kKEUpJyA6ICcnKSArXHJcbiAgICAgICAgJ1xcbmZ1bmN0aW9uIGxheW91dChwLGQpe19fbD1wO19fbFA9ZH1cXG4nICtcclxuICAgICAgICAoY29uZmlnLmdsb2JhbEF3YWl0ID8gJ2NvbnN0IF9wcnMgPSBbXTtcXG4nIDogJycpICtcclxuICAgICAgICAoY29uZmlnLnVzZVdpdGggPyAnd2l0aCgnICsgY29uZmlnLnZhck5hbWUgKyAnfHx7fSl7JyA6ICcnKSArXHJcbiAgICAgICAgY29tcGlsZVNjb3BlKGJ1ZmZlciwgY29uZmlnKSArXHJcbiAgICAgICAgKGNvbmZpZy5pbmNsdWRlRmlsZVxyXG4gICAgICAgICAgICA/ICdpZihfX2wpdFI9JyArXHJcbiAgICAgICAgICAgICAgICAoY29uZmlnLmFzeW5jID8gJ2F3YWl0ICcgOiAnJykgK1xyXG4gICAgICAgICAgICAgICAgKFwiaW5jbHVkZUZpbGUoX19sLE9iamVjdC5hc3NpZ24oXCIgKyBjb25maWcudmFyTmFtZSArIFwiLHtib2R5OnRSfSxfX2xQKSlcXG5cIilcclxuICAgICAgICAgICAgOiBjb25maWcuaW5jbHVkZVxyXG4gICAgICAgICAgICAgICAgPyAnaWYoX19sKXRSPScgK1xyXG4gICAgICAgICAgICAgICAgICAgIChjb25maWcuYXN5bmMgPyAnYXdhaXQgJyA6ICcnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgKFwiaW5jbHVkZShfX2wsT2JqZWN0LmFzc2lnbihcIiArIGNvbmZpZy52YXJOYW1lICsgXCIse2JvZHk6dFJ9LF9fbFApKVxcblwiKVxyXG4gICAgICAgICAgICAgICAgOiAnJykgK1xyXG4gICAgICAgICdpZihjYil7Y2IobnVsbCx0Uil9IHJldHVybiB0UicgK1xyXG4gICAgICAgIChjb25maWcudXNlV2l0aCA/ICd9JyA6ICcnKTtcclxuICAgIGlmIChjb25maWcucGx1Z2lucykge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29uZmlnLnBsdWdpbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIHBsdWdpbiA9IGNvbmZpZy5wbHVnaW5zW2ldO1xyXG4gICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NGblN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgcmVzID0gcGx1Z2luLnByb2Nlc3NGblN0cmluZyhyZXMsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKiBMb29wcyB0aHJvdWdoIHRoZSBBU1QgZ2VuZXJhdGVkIGJ5IGBwYXJzZWAgYW5kIHRyYW5zZm9ybSBlYWNoIGl0ZW0gaW50byBKUyBjYWxsc1xyXG4gKlxyXG4gKiAqKkV4YW1wbGUqKlxyXG4gKlxyXG4gKiBgYGBqc1xyXG4gKiAvLyBBU1QgdmVyc2lvbiBvZiAnSGkgPCU9IGl0LnVzZXIgJT4nXHJcbiAqIGxldCB0ZW1wbGF0ZUFTVCA9IFsnSGkgJywgeyB2YWw6ICdpdC51c2VyJywgdDogJ2knIH1dXHJcbiAqIGNvbXBpbGVTY29wZSh0ZW1wbGF0ZUFTVCwgZXRhLmNvbmZpZylcclxuICogLy8gXCJ0Uis9J0hpICc7dFIrPUUuZShpdC51c2VyKTtcIlxyXG4gKiBgYGBcclxuICovXHJcbmZ1bmN0aW9uIGNvbXBpbGVTY29wZShidWZmLCBjb25maWcpIHtcclxuICAgIHZhciBpO1xyXG4gICAgdmFyIGJ1ZmZMZW5ndGggPSBidWZmLmxlbmd0aDtcclxuICAgIHZhciByZXR1cm5TdHIgPSAnJztcclxuICAgIHZhciBSRVBMQUNFTUVOVF9TVFIgPSBcInJKMktxWHp4UWdcIjtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBidWZmTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY3VycmVudEJsb2NrID0gYnVmZltpXTtcclxuICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRCbG9jayA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdmFyIHN0ciA9IGN1cnJlbnRCbG9jaztcclxuICAgICAgICAgICAgLy8gd2Uga25vdyBzdHJpbmcgZXhpc3RzXHJcbiAgICAgICAgICAgIHJldHVyblN0ciArPSBcInRSKz0nXCIgKyBzdHIgKyBcIidcXG5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gY3VycmVudEJsb2NrLnQ7IC8vIH4sIHMsICEsID8sIHJcclxuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBjdXJyZW50QmxvY2sudmFsIHx8ICcnO1xyXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ3InKSB7XHJcbiAgICAgICAgICAgICAgICAvLyByYXdcclxuICAgICAgICAgICAgICAgIGlmIChjb25maWcuZ2xvYmFsQXdhaXQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5TdHIgKz0gXCJfcHJzLnB1c2goXCIgKyBjb250ZW50ICsgXCIpO1xcblwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblN0ciArPSBcInRSKz0nXCIgKyBSRVBMQUNFTUVOVF9TVFIgKyBcIidcXG5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcuZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSAnRS5maWx0ZXIoJyArIGNvbnRlbnQgKyAnKSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblN0ciArPSAndFIrPScgKyBjb250ZW50ICsgJ1xcbic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ2knKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpbnRlcnBvbGF0ZVxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5nbG9iYWxBd2FpdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblN0ciArPSBcIl9wcnMucHVzaChcIiArIGNvbnRlbnQgKyBcIik7XFxuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuU3RyICs9IFwidFIrPSdcIiArIFJFUExBQ0VNRU5UX1NUUiArIFwiJ1xcblwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5maWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9ICdFLmZpbHRlcignICsgY29udGVudCArICcpJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuU3RyICs9ICd0Uis9JyArIGNvbnRlbnQgKyAnXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmF1dG9Fc2NhcGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9ICdFLmUoJyArIGNvbnRlbnQgKyAnKSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblN0ciArPSAndFIrPScgKyBjb250ZW50ICsgJ1xcbic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ2UnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBleGVjdXRlXHJcbiAgICAgICAgICAgICAgICByZXR1cm5TdHIgKz0gY29udGVudCArICdcXG4nOyAvLyB5b3UgbmVlZCBhIFxcbiBpbiBjYXNlIHlvdSBoYXZlIDwlIH0gJT5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChjb25maWcuZ2xvYmFsQXdhaXQpIHtcclxuICAgICAgICByZXR1cm5TdHIgKz0gXCJjb25zdCBfcnN0ID0gYXdhaXQgUHJvbWlzZS5hbGwoX3Bycyk7XFxudFIgPSB0Ui5yZXBsYWNlKC9cIiArIFJFUExBQ0VNRU5UX1NUUiArIFwiL2csICgpID0+IF9yc3Quc2hpZnQoKSk7XFxuXCI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0dXJuU3RyO1xyXG59XG5cbi8qKlxyXG4gKiBIYW5kbGVzIHN0b3JhZ2UgYW5kIGFjY2Vzc2luZyBvZiB2YWx1ZXNcclxuICpcclxuICogSW4gdGhpcyBjYXNlLCB3ZSB1c2UgaXQgdG8gc3RvcmUgY29tcGlsZWQgdGVtcGxhdGUgZnVuY3Rpb25zXHJcbiAqIEluZGV4ZWQgYnkgdGhlaXIgYG5hbWVgIG9yIGBmaWxlbmFtZWBcclxuICovXHJcbnZhciBDYWNoZXIgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBDYWNoZXIoY2FjaGUpIHtcclxuICAgICAgICB0aGlzLmNhY2hlID0gY2FjaGU7XHJcbiAgICB9XHJcbiAgICBDYWNoZXIucHJvdG90eXBlLmRlZmluZSA9IGZ1bmN0aW9uIChrZXksIHZhbCkge1xyXG4gICAgICAgIHRoaXMuY2FjaGVba2V5XSA9IHZhbDtcclxuICAgIH07XHJcbiAgICBDYWNoZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAvLyBzdHJpbmcgfCBhcnJheS5cclxuICAgICAgICAvLyBUT0RPOiBhbGxvdyBhcnJheSBvZiBrZXlzIHRvIGxvb2sgZG93blxyXG4gICAgICAgIC8vIFRPRE86IGNyZWF0ZSBwbHVnaW4gdG8gYWxsb3cgcmVmZXJlbmNpbmcgaGVscGVycywgZmlsdGVycyB3aXRoIGRvdCBub3RhdGlvblxyXG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlW2tleV07XHJcbiAgICB9O1xyXG4gICAgQ2FjaGVyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2FjaGVba2V5XTtcclxuICAgIH07XHJcbiAgICBDYWNoZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2FjaGUgPSB7fTtcclxuICAgIH07XHJcbiAgICBDYWNoZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoY2FjaGVPYmopIHtcclxuICAgICAgICBjb3B5UHJvcHModGhpcy5jYWNoZSwgY2FjaGVPYmopO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBDYWNoZXI7XHJcbn0oKSk7XG5cbi8qIEVORCBUWVBFUyAqL1xyXG4vKipcclxuICogRXRhJ3MgdGVtcGxhdGUgc3RvcmFnZVxyXG4gKlxyXG4gKiBTdG9yZXMgcGFydGlhbHMgYW5kIGNhY2hlZCB0ZW1wbGF0ZXNcclxuICovXHJcbnZhciB0ZW1wbGF0ZXMgPSBuZXcgQ2FjaGVyKHt9KTtcblxuLyogRU5EIFRZUEVTICovXHJcbi8qKlxyXG4gKiBJbmNsdWRlIGEgdGVtcGxhdGUgYmFzZWQgb24gaXRzIG5hbWUgKG9yIGZpbGVwYXRoLCBpZiBpdCdzIGFscmVhZHkgYmVlbiBjYWNoZWQpLlxyXG4gKlxyXG4gKiBDYWxsZWQgbGlrZSBgaW5jbHVkZSh0ZW1wbGF0ZU5hbWVPclBhdGgsIGRhdGEpYFxyXG4gKi9cclxuZnVuY3Rpb24gaW5jbHVkZUhlbHBlcih0ZW1wbGF0ZU5hbWVPclBhdGgsIGRhdGEpIHtcclxuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZU5hbWVPclBhdGgpO1xyXG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xyXG4gICAgICAgIHRocm93IEV0YUVycignQ291bGQgbm90IGZldGNoIHRlbXBsYXRlIFwiJyArIHRlbXBsYXRlTmFtZU9yUGF0aCArICdcIicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRlbXBsYXRlKGRhdGEsIHRoaXMpO1xyXG59XHJcbi8qKiBFdGEncyBiYXNlIChnbG9iYWwpIGNvbmZpZ3VyYXRpb24gKi9cclxudmFyIGNvbmZpZyA9IHtcclxuICAgIGFzeW5jOiBmYWxzZSxcclxuICAgIGF1dG9Fc2NhcGU6IHRydWUsXHJcbiAgICBhdXRvVHJpbTogW2ZhbHNlLCAnbmwnXSxcclxuICAgIGNhY2hlOiBmYWxzZSxcclxuICAgIGU6IFhNTEVzY2FwZSxcclxuICAgIGluY2x1ZGU6IGluY2x1ZGVIZWxwZXIsXHJcbiAgICBwYXJzZToge1xyXG4gICAgICAgIGV4ZWM6ICcnLFxyXG4gICAgICAgIGludGVycG9sYXRlOiAnPScsXHJcbiAgICAgICAgcmF3OiAnfidcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXSxcclxuICAgIHJtV2hpdGVzcGFjZTogZmFsc2UsXHJcbiAgICB0YWdzOiBbJzwlJywgJyU+J10sXHJcbiAgICB0ZW1wbGF0ZXM6IHRlbXBsYXRlcyxcclxuICAgIHVzZVdpdGg6IGZhbHNlLFxyXG4gICAgdmFyTmFtZTogJ2l0J1xyXG59O1xyXG4vKipcclxuICogVGFrZXMgb25lIG9yIHR3byBwYXJ0aWFsIChub3QgbmVjZXNzYXJpbHkgY29tcGxldGUpIGNvbmZpZ3VyYXRpb24gb2JqZWN0cywgbWVyZ2VzIHRoZW0gMSBsYXllciBkZWVwIGludG8gZXRhLmNvbmZpZywgYW5kIHJldHVybnMgdGhlIHJlc3VsdFxyXG4gKlxyXG4gKiBAcGFyYW0gb3ZlcnJpZGUgUGFydGlhbCBjb25maWd1cmF0aW9uIG9iamVjdFxyXG4gKiBAcGFyYW0gYmFzZUNvbmZpZyBQYXJ0aWFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRvIG1lcmdlIGJlZm9yZSBgb3ZlcnJpZGVgXHJcbiAqXHJcbiAqICoqRXhhbXBsZSoqXHJcbiAqXHJcbiAqIGBgYGpzXHJcbiAqIGxldCBjdXN0b21Db25maWcgPSBnZXRDb25maWcoe3RhZ3M6IFsnISMnLCAnIyEnXX0pXHJcbiAqIGBgYFxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0Q29uZmlnKG92ZXJyaWRlLCBiYXNlQ29uZmlnKSB7XHJcbiAgICAvLyBUT0RPOiBydW4gbW9yZSB0ZXN0cyBvbiB0aGlzXHJcbiAgICB2YXIgcmVzID0ge307IC8vIExpbmtlZFxyXG4gICAgY29weVByb3BzKHJlcywgY29uZmlnKTsgLy8gQ3JlYXRlcyBkZWVwIGNsb25lIG9mIGV0YS5jb25maWcsIDEgbGF5ZXIgZGVlcFxyXG4gICAgaWYgKGJhc2VDb25maWcpIHtcclxuICAgICAgICBjb3B5UHJvcHMocmVzLCBiYXNlQ29uZmlnKTtcclxuICAgIH1cclxuICAgIGlmIChvdmVycmlkZSkge1xyXG4gICAgICAgIGNvcHlQcm9wcyhyZXMsIG92ZXJyaWRlKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuLyoqIFVwZGF0ZSBFdGEncyBiYXNlIGNvbmZpZyAqL1xyXG5mdW5jdGlvbiBjb25maWd1cmUob3B0aW9ucykge1xyXG4gICAgcmV0dXJuIGNvcHlQcm9wcyhjb25maWcsIG9wdGlvbnMpO1xyXG59XG5cbi8qIEVORCBUWVBFUyAqL1xyXG4vKipcclxuICogVGFrZXMgYSB0ZW1wbGF0ZSBzdHJpbmcgYW5kIHJldHVybnMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgd2l0aCAoZGF0YSwgY29uZmlnLCBbY2JdKVxyXG4gKlxyXG4gKiBAcGFyYW0gc3RyIC0gVGhlIHRlbXBsYXRlIHN0cmluZ1xyXG4gKiBAcGFyYW0gY29uZmlnIC0gQSBjdXN0b20gY29uZmlndXJhdGlvbiBvYmplY3QgKG9wdGlvbmFsKVxyXG4gKlxyXG4gKiAqKkV4YW1wbGUqKlxyXG4gKlxyXG4gKiBgYGBqc1xyXG4gKiBsZXQgY29tcGlsZWRGbiA9IGV0YS5jb21waWxlKFwiSGkgPCU9IGl0LnVzZXIgJT5cIilcclxuICogLy8gZnVuY3Rpb24gYW5vbnltb3VzKClcclxuICogbGV0IGNvbXBpbGVkRm5TdHIgPSBjb21waWxlZEZuLnRvU3RyaW5nKClcclxuICogLy8gXCJmdW5jdGlvbiBhbm9ueW1vdXMoaXQsRSxjYlxcbikge1xcbnZhciB0Uj0nJyxpbmNsdWRlPUUuaW5jbHVkZS5iaW5kKEUpLGluY2x1ZGVGaWxlPUUuaW5jbHVkZUZpbGUuYmluZChFKTt0Uis9J0hpICc7dFIrPUUuZShpdC51c2VyKTtpZihjYil7Y2IobnVsbCx0Uil9IHJldHVybiB0Ulxcbn1cIlxyXG4gKiBgYGBcclxuICovXHJcbmZ1bmN0aW9uIGNvbXBpbGUoc3RyLCBjb25maWcpIHtcclxuICAgIHZhciBvcHRpb25zID0gZ2V0Q29uZmlnKGNvbmZpZyB8fCB7fSk7XHJcbiAgICAvKiBBU1lOQyBIQU5ETElORyAqL1xyXG4gICAgLy8gVGhlIGJlbG93IGNvZGUgaXMgbW9kaWZpZWQgZnJvbSBtZGUvZWpzLiBBbGwgY3JlZGl0IHNob3VsZCBnbyB0byB0aGVtLlxyXG4gICAgdmFyIGN0b3IgPSBvcHRpb25zLmFzeW5jID8gZ2V0QXN5bmNGdW5jdGlvbkNvbnN0cnVjdG9yKCkgOiBGdW5jdGlvbjtcclxuICAgIC8qIEVORCBBU1lOQyBIQU5ETElORyAqL1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gbmV3IGN0b3Iob3B0aW9ucy52YXJOYW1lLCAnRScsIC8vIEV0YUNvbmZpZ1xyXG4gICAgICAgICdjYicsIC8vIG9wdGlvbmFsIGNhbGxiYWNrXHJcbiAgICAgICAgY29tcGlsZVRvU3RyaW5nKHN0ciwgb3B0aW9ucykpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLW5ldy1mdW5jXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXRhRXJyKCdCYWQgdGVtcGxhdGUgc3ludGF4XFxuXFxuJyArXHJcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgK1xyXG4gICAgICAgICAgICAgICAgJ1xcbicgK1xyXG4gICAgICAgICAgICAgICAgQXJyYXkoZS5tZXNzYWdlLmxlbmd0aCArIDEpLmpvaW4oJz0nKSArXHJcbiAgICAgICAgICAgICAgICAnXFxuJyArXHJcbiAgICAgICAgICAgICAgICBjb21waWxlVG9TdHJpbmcoc3RyLCBvcHRpb25zKSArXHJcbiAgICAgICAgICAgICAgICAnXFxuJyAvLyBUaGlzIHdpbGwgcHV0IGFuIGV4dHJhIG5ld2xpbmUgYmVmb3JlIHRoZSBjYWxsc3RhY2sgZm9yIGV4dHJhIHJlYWRhYmlsaXR5XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxuXG52YXIgX0JPTSA9IC9eXFx1RkVGRi87XHJcbi8qIEVORCBUWVBFUyAqL1xyXG4vKipcclxuICogR2V0IHRoZSBwYXRoIHRvIHRoZSBpbmNsdWRlZCBmaWxlIGZyb20gdGhlIHBhcmVudCBmaWxlIHBhdGggYW5kIHRoZVxyXG4gKiBzcGVjaWZpZWQgcGF0aC5cclxuICpcclxuICogSWYgYG5hbWVgIGRvZXMgbm90IGhhdmUgYW4gZXh0ZW5zaW9uLCBpdCB3aWxsIGRlZmF1bHQgdG8gYC5ldGFgXHJcbiAqXHJcbiAqIEBwYXJhbSBuYW1lIHNwZWNpZmllZCBwYXRoXHJcbiAqIEBwYXJhbSBwYXJlbnRmaWxlIHBhcmVudCBmaWxlIHBhdGhcclxuICogQHBhcmFtIGlzRGlyZWN0b3J5IHdoZXRoZXIgcGFyZW50ZmlsZSBpcyBhIGRpcmVjdG9yeVxyXG4gKiBAcmV0dXJuIGFic29sdXRlIHBhdGggdG8gdGVtcGxhdGVcclxuICovXHJcbmZ1bmN0aW9uIGdldFdob2xlRmlsZVBhdGgobmFtZSwgcGFyZW50ZmlsZSwgaXNEaXJlY3RvcnkpIHtcclxuICAgIHZhciBpbmNsdWRlUGF0aCA9IHBhdGgucmVzb2x2ZShpc0RpcmVjdG9yeSA/IHBhcmVudGZpbGUgOiBwYXRoLmRpcm5hbWUocGFyZW50ZmlsZSksIC8vIHJldHVybnMgZGlyZWN0b3J5IHRoZSBwYXJlbnQgZmlsZSBpcyBpblxyXG4gICAgbmFtZSAvLyBmaWxlXHJcbiAgICApICsgKHBhdGguZXh0bmFtZShuYW1lKSA/ICcnIDogJy5ldGEnKTtcclxuICAgIHJldHVybiBpbmNsdWRlUGF0aDtcclxufVxyXG4vKipcclxuICogR2V0IHRoZSBhYnNvbHV0ZSBwYXRoIHRvIGFuIGluY2x1ZGVkIHRlbXBsYXRlXHJcbiAqXHJcbiAqIElmIHRoaXMgaXMgY2FsbGVkIHdpdGggYW4gYWJzb2x1dGUgcGF0aCAoZm9yIGV4YW1wbGUsIHN0YXJ0aW5nIHdpdGggJy8nIG9yICdDOlxcJylcclxuICogdGhlbiBFdGEgd2lsbCBhdHRlbXB0IHRvIHJlc29sdmUgdGhlIGFic29sdXRlIHBhdGggd2l0aGluIG9wdGlvbnMudmlld3MuIElmIGl0IGNhbm5vdCxcclxuICogRXRhIHdpbGwgZmFsbGJhY2sgdG8gb3B0aW9ucy5yb290IG9yICcvJ1xyXG4gKlxyXG4gKiBJZiB0aGlzIGlzIGNhbGxlZCB3aXRoIGEgcmVsYXRpdmUgcGF0aCwgRXRhIHdpbGw6XHJcbiAqIC0gTG9vayByZWxhdGl2ZSB0byB0aGUgY3VycmVudCB0ZW1wbGF0ZSAoaWYgdGhlIGN1cnJlbnQgdGVtcGxhdGUgaGFzIHRoZSBgZmlsZW5hbWVgIHByb3BlcnR5KVxyXG4gKiAtIExvb2sgaW5zaWRlIGVhY2ggZGlyZWN0b3J5IGluIG9wdGlvbnMudmlld3NcclxuICpcclxuICogTm90ZTogaWYgRXRhIGlzIHVuYWJsZSB0byBmaW5kIGEgdGVtcGxhdGUgdXNpbmcgcGF0aCBhbmQgb3B0aW9ucywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cclxuICpcclxuICogQHBhcmFtIHBhdGggICAgc3BlY2lmaWVkIHBhdGhcclxuICogQHBhcmFtIG9wdGlvbnMgY29tcGlsYXRpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJuIGFic29sdXRlIHBhdGggdG8gdGVtcGxhdGVcclxuICovXHJcbmZ1bmN0aW9uIGdldFBhdGgocGF0aCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGluY2x1ZGVQYXRoID0gZmFsc2U7XHJcbiAgICB2YXIgdmlld3MgPSBvcHRpb25zLnZpZXdzO1xyXG4gICAgdmFyIHNlYXJjaGVkUGF0aHMgPSBbXTtcclxuICAgIC8vIElmIHRoZXNlIGZvdXIgdmFsdWVzIGFyZSB0aGUgc2FtZSxcclxuICAgIC8vIGdldFBhdGgoKSB3aWxsIHJldHVybiB0aGUgc2FtZSByZXN1bHQgZXZlcnkgdGltZS5cclxuICAgIC8vIFdlIGNhbiBjYWNoZSB0aGUgcmVzdWx0IHRvIGF2b2lkIGV4cGVuc2l2ZVxyXG4gICAgLy8gZmlsZSBvcGVyYXRpb25zLlxyXG4gICAgdmFyIHBhdGhPcHRpb25zID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGZpbGVuYW1lOiBvcHRpb25zLmZpbGVuYW1lLFxyXG4gICAgICAgIHBhdGg6IHBhdGgsXHJcbiAgICAgICAgcm9vdDogb3B0aW9ucy5yb290LFxyXG4gICAgICAgIHZpZXdzOiBvcHRpb25zLnZpZXdzXHJcbiAgICB9KTtcclxuICAgIGlmIChvcHRpb25zLmNhY2hlICYmIG9wdGlvbnMuZmlsZXBhdGhDYWNoZSAmJiBvcHRpb25zLmZpbGVwYXRoQ2FjaGVbcGF0aE9wdGlvbnNdKSB7XHJcbiAgICAgICAgLy8gVXNlIHRoZSBjYWNoZWQgZmlsZXBhdGhcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5maWxlcGF0aENhY2hlW3BhdGhPcHRpb25zXTtcclxuICAgIH1cclxuICAgIC8qKiBBZGQgYSBmaWxlcGF0aCB0byB0aGUgbGlzdCBvZiBwYXRocyB3ZSd2ZSBjaGVja2VkIGZvciBhIHRlbXBsYXRlICovXHJcbiAgICBmdW5jdGlvbiBhZGRQYXRoVG9TZWFyY2hlZChwYXRoU2VhcmNoZWQpIHtcclxuICAgICAgICBpZiAoIXNlYXJjaGVkUGF0aHMuaW5jbHVkZXMocGF0aFNlYXJjaGVkKSkge1xyXG4gICAgICAgICAgICBzZWFyY2hlZFBhdGhzLnB1c2gocGF0aFNlYXJjaGVkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFRha2UgYSBmaWxlcGF0aCAobGlrZSAncGFydGlhbHMvbXlwYXJ0aWFsLmV0YScpLiBBdHRlbXB0IHRvIGZpbmQgdGhlIHRlbXBsYXRlIGZpbGUgaW5zaWRlIGB2aWV3c2A7XHJcbiAgICAgKiByZXR1cm4gdGhlIHJlc3VsdGluZyB0ZW1wbGF0ZSBmaWxlIHBhdGgsIG9yIGBmYWxzZWAgdG8gaW5kaWNhdGUgdGhhdCB0aGUgdGVtcGxhdGUgd2FzIG5vdCBmb3VuZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0gdmlld3MgdGhlIGZpbGVwYXRoIHRoYXQgaG9sZHMgdGVtcGxhdGVzLCBvciBhbiBhcnJheSBvZiBmaWxlcGF0aHMgdGhhdCBob2xkIHRlbXBsYXRlc1xyXG4gICAgICogQHBhcmFtIHBhdGggdGhlIHBhdGggdG8gdGhlIHRlbXBsYXRlXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHNlYXJjaFZpZXdzKHZpZXdzLCBwYXRoKSB7XHJcbiAgICAgICAgdmFyIGZpbGVQYXRoO1xyXG4gICAgICAgIC8vIElmIHZpZXdzIGlzIGFuIGFycmF5LCB0aGVuIGxvb3AgdGhyb3VnaCBlYWNoIGRpcmVjdG9yeVxyXG4gICAgICAgIC8vIEFuZCBhdHRlbXB0IHRvIGZpbmQgdGhlIHRlbXBsYXRlXHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmlld3MpICYmXHJcbiAgICAgICAgICAgIHZpZXdzLnNvbWUoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoID0gZ2V0V2hvbGVGaWxlUGF0aChwYXRoLCB2LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGFkZFBhdGhUb1NlYXJjaGVkKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBleGlzdHNTeW5jKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgfSkpIHtcclxuICAgICAgICAgICAgLy8gSWYgdGhlIGFib3ZlIHJldHVybmVkIHRydWUsIHdlIGtub3cgdGhhdCB0aGUgZmlsZVBhdGggd2FzIGp1c3Qgc2V0IHRvIGEgcGF0aFxyXG4gICAgICAgICAgICAvLyBUaGF0IGV4aXN0cyAoQXJyYXkuc29tZSgpIHJldHVybnMgYXMgc29vbiBhcyBpdCBmaW5kcyBhIHZhbGlkIGVsZW1lbnQpXHJcbiAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHZpZXdzID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAvLyBTZWFyY2ggZm9yIHRoZSBmaWxlIGlmIHZpZXdzIGlzIGEgc2luZ2xlIGRpcmVjdG9yeVxyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IGdldFdob2xlRmlsZVBhdGgocGF0aCwgdmlld3MsIHRydWUpO1xyXG4gICAgICAgICAgICBhZGRQYXRoVG9TZWFyY2hlZChmaWxlUGF0aCk7XHJcbiAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKGZpbGVQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFVuYWJsZSB0byBmaW5kIGEgZmlsZVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vIFBhdGggc3RhcnRzIHdpdGggJy8nLCAnQzpcXCcsIGV0Yy5cclxuICAgIHZhciBtYXRjaCA9IC9eW0EtWmEtel0rOlxcXFx8XlxcLy8uZXhlYyhwYXRoKTtcclxuICAgIC8vIEFic29sdXRlIHBhdGgsIGxpa2UgL3BhcnRpYWxzL3BhcnRpYWwuZXRhXHJcbiAgICBpZiAobWF0Y2ggJiYgbWF0Y2gubGVuZ3RoKSB7XHJcbiAgICAgICAgLy8gV2UgaGF2ZSB0byB0cmltIHRoZSBiZWdpbm5pbmcgJy8nIG9mZiB0aGUgcGF0aCwgb3IgZWxzZVxyXG4gICAgICAgIC8vIHBhdGgucmVzb2x2ZShkaXIsIHBhdGgpIHdpbGwgYWx3YXlzIHJlc29sdmUgdG8ganVzdCBwYXRoXHJcbiAgICAgICAgdmFyIGZvcm1hdHRlZFBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC8qLywgJycpO1xyXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gcmVzb2x2ZSB0aGUgcGF0aCB3aXRoaW4gb3B0aW9ucy52aWV3c1xyXG4gICAgICAgIGluY2x1ZGVQYXRoID0gc2VhcmNoVmlld3Modmlld3MsIGZvcm1hdHRlZFBhdGgpO1xyXG4gICAgICAgIGlmICghaW5jbHVkZVBhdGgpIHtcclxuICAgICAgICAgICAgLy8gSWYgdGhhdCBmYWlscywgc2VhcmNoVmlld3Mgd2lsbCByZXR1cm4gZmFsc2UuIFRyeSB0byBmaW5kIHRoZSBwYXRoXHJcbiAgICAgICAgICAgIC8vIGluc2lkZSBvcHRpb25zLnJvb3QgKGJ5IGRlZmF1bHQgJy8nLCB0aGUgYmFzZSBvZiB0aGUgZmlsZXN5c3RlbSlcclxuICAgICAgICAgICAgdmFyIHBhdGhGcm9tUm9vdCA9IGdldFdob2xlRmlsZVBhdGgoZm9ybWF0dGVkUGF0aCwgb3B0aW9ucy5yb290IHx8ICcvJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGFkZFBhdGhUb1NlYXJjaGVkKHBhdGhGcm9tUm9vdCk7XHJcbiAgICAgICAgICAgIGluY2x1ZGVQYXRoID0gcGF0aEZyb21Sb290O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIFJlbGF0aXZlIHBhdGhzXHJcbiAgICAgICAgLy8gTG9vayByZWxhdGl2ZSB0byBhIHBhc3NlZCBmaWxlbmFtZSBmaXJzdFxyXG4gICAgICAgIGlmIChvcHRpb25zLmZpbGVuYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWxlUGF0aCA9IGdldFdob2xlRmlsZVBhdGgocGF0aCwgb3B0aW9ucy5maWxlbmFtZSk7XHJcbiAgICAgICAgICAgIGFkZFBhdGhUb1NlYXJjaGVkKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBpbmNsdWRlUGF0aCA9IGZpbGVQYXRoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFRoZW4gbG9vayBmb3IgdGhlIHRlbXBsYXRlIGluIG9wdGlvbnMudmlld3NcclxuICAgICAgICBpZiAoIWluY2x1ZGVQYXRoKSB7XHJcbiAgICAgICAgICAgIGluY2x1ZGVQYXRoID0gc2VhcmNoVmlld3Modmlld3MsIHBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWluY2x1ZGVQYXRoKSB7XHJcbiAgICAgICAgICAgIHRocm93IEV0YUVycignQ291bGQgbm90IGZpbmQgdGhlIHRlbXBsYXRlIFwiJyArIHBhdGggKyAnXCIuIFBhdGhzIHRyaWVkOiAnICsgc2VhcmNoZWRQYXRocyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gSWYgY2FjaGluZyBhbmQgZmlsZXBhdGhDYWNoZSBhcmUgZW5hYmxlZCxcclxuICAgIC8vIGNhY2hlIHRoZSBpbnB1dCAmIG91dHB1dCBvZiB0aGlzIGZ1bmN0aW9uLlxyXG4gICAgaWYgKG9wdGlvbnMuY2FjaGUgJiYgb3B0aW9ucy5maWxlcGF0aENhY2hlKSB7XHJcbiAgICAgICAgb3B0aW9ucy5maWxlcGF0aENhY2hlW3BhdGhPcHRpb25zXSA9IGluY2x1ZGVQYXRoO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGluY2x1ZGVQYXRoO1xyXG59XHJcbi8qKlxyXG4gKiBSZWFkcyBhIGZpbGUgc3luY2hyb25vdXNseVxyXG4gKi9cclxuZnVuY3Rpb24gcmVhZEZpbGUoZmlsZVBhdGgpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIHJlYWRGaWxlU3luYyhmaWxlUGF0aCkudG9TdHJpbmcoKS5yZXBsYWNlKF9CT00sICcnKTsgLy8gVE9ETzogaXMgcmVwbGFjaW5nIEJPTSdzIG5lY2Vzc2FyeT9cclxuICAgIH1cclxuICAgIGNhdGNoIChfYSkge1xyXG4gICAgICAgIHRocm93IEV0YUVycihcIkZhaWxlZCB0byByZWFkIHRlbXBsYXRlIGF0ICdcIiArIGZpbGVQYXRoICsgXCInXCIpO1xyXG4gICAgfVxyXG59XG5cbi8vIGV4cHJlc3MgaXMgc2V0IGxpa2U6IGFwcC5lbmdpbmUoJ2h0bWwnLCByZXF1aXJlKCdldGEnKS5yZW5kZXJGaWxlKVxyXG4vKiBFTkQgVFlQRVMgKi9cclxuLyoqXHJcbiAqIFJlYWRzIGEgdGVtcGxhdGUsIGNvbXBpbGVzIGl0IGludG8gYSBmdW5jdGlvbiwgY2FjaGVzIGl0IGlmIGNhY2hpbmcgaXNuJ3QgZGlzYWJsZWQsIHJldHVybnMgdGhlIGZ1bmN0aW9uXHJcbiAqXHJcbiAqIEBwYXJhbSBmaWxlUGF0aCBBYnNvbHV0ZSBwYXRoIHRvIHRlbXBsYXRlIGZpbGVcclxuICogQHBhcmFtIG9wdGlvbnMgRXRhIGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGVzXHJcbiAqIEBwYXJhbSBub0NhY2hlIE9wdGlvbmFsbHksIG1ha2UgRXRhIG5vdCBjYWNoZSB0aGUgdGVtcGxhdGVcclxuICovXHJcbmZ1bmN0aW9uIGxvYWRGaWxlKGZpbGVQYXRoLCBvcHRpb25zLCBub0NhY2hlKSB7XHJcbiAgICB2YXIgY29uZmlnID0gZ2V0Q29uZmlnKG9wdGlvbnMpO1xyXG4gICAgdmFyIHRlbXBsYXRlID0gcmVhZEZpbGUoZmlsZVBhdGgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgY29tcGlsZWRUZW1wbGF0ZSA9IGNvbXBpbGUodGVtcGxhdGUsIGNvbmZpZyk7XHJcbiAgICAgICAgaWYgKCFub0NhY2hlKSB7XHJcbiAgICAgICAgICAgIGNvbmZpZy50ZW1wbGF0ZXMuZGVmaW5lKGNvbmZpZy5maWxlbmFtZSwgY29tcGlsZWRUZW1wbGF0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb21waWxlZFRlbXBsYXRlO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICB0aHJvdyBFdGFFcnIoJ0xvYWRpbmcgZmlsZTogJyArIGZpbGVQYXRoICsgJyBmYWlsZWQ6XFxuXFxuJyArIGUubWVzc2FnZSk7XHJcbiAgICB9XHJcbn1cclxuLyoqXHJcbiAqIEdldCB0aGUgdGVtcGxhdGUgZnJvbSBhIHN0cmluZyBvciBhIGZpbGUsIGVpdGhlciBjb21waWxlZCBvbi10aGUtZmx5IG9yXHJcbiAqIHJlYWQgZnJvbSBjYWNoZSAoaWYgZW5hYmxlZCksIGFuZCBjYWNoZSB0aGUgdGVtcGxhdGUgaWYgbmVlZGVkLlxyXG4gKlxyXG4gKiBJZiBgb3B0aW9ucy5jYWNoZWAgaXMgdHJ1ZSwgdGhpcyBmdW5jdGlvbiByZWFkcyB0aGUgZmlsZSBmcm9tXHJcbiAqIGBvcHRpb25zLmZpbGVuYW1lYCBzbyBpdCBtdXN0IGJlIHNldCBwcmlvciB0byBjYWxsaW5nIHRoaXMgZnVuY3Rpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zICAgY29tcGlsYXRpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJuIEV0YSB0ZW1wbGF0ZSBmdW5jdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlQ2FjaGUkMShvcHRpb25zKSB7XHJcbiAgICB2YXIgZmlsZW5hbWUgPSBvcHRpb25zLmZpbGVuYW1lO1xyXG4gICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcclxuICAgICAgICB2YXIgZnVuYyA9IG9wdGlvbnMudGVtcGxhdGVzLmdldChmaWxlbmFtZSk7XHJcbiAgICAgICAgaWYgKGZ1bmMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsb2FkRmlsZShmaWxlbmFtZSwgb3B0aW9ucyk7XHJcbiAgICB9XHJcbiAgICAvLyBDYWNoaW5nIGlzIGRpc2FibGVkLCBzbyBwYXNzIG5vQ2FjaGUgPSB0cnVlXHJcbiAgICByZXR1cm4gbG9hZEZpbGUoZmlsZW5hbWUsIG9wdGlvbnMsIHRydWUpO1xyXG59XHJcbi8qKlxyXG4gKiBUcnkgY2FsbGluZyBoYW5kbGVDYWNoZSB3aXRoIHRoZSBnaXZlbiBvcHRpb25zIGFuZCBkYXRhIGFuZCBjYWxsIHRoZVxyXG4gKiBjYWxsYmFjayB3aXRoIHRoZSByZXN1bHQuIElmIGFuIGVycm9yIG9jY3VycywgY2FsbCB0aGUgY2FsbGJhY2sgd2l0aFxyXG4gKiB0aGUgZXJyb3IuIFVzZWQgYnkgcmVuZGVyRmlsZSgpLlxyXG4gKlxyXG4gKiBAcGFyYW0gZGF0YSB0ZW1wbGF0ZSBkYXRhXHJcbiAqIEBwYXJhbSBvcHRpb25zIGNvbXBpbGF0aW9uIG9wdGlvbnNcclxuICogQHBhcmFtIGNiIGNhbGxiYWNrXHJcbiAqL1xyXG5mdW5jdGlvbiB0cnlIYW5kbGVDYWNoZShkYXRhLCBvcHRpb25zLCBjYikge1xyXG4gICAgaWYgKGNiKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gTm90ZTogaWYgdGhlcmUgaXMgYW4gZXJyb3Igd2hpbGUgcmVuZGVyaW5nIHRoZSB0ZW1wbGF0ZSxcclxuICAgICAgICAgICAgLy8gSXQgd2lsbCBidWJibGUgdXAgYW5kIGJlIGNhdWdodCBoZXJlXHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZUZuID0gaGFuZGxlQ2FjaGUkMShvcHRpb25zKTtcclxuICAgICAgICAgICAgdGVtcGxhdGVGbihkYXRhLCBvcHRpb25zLCBjYik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNiKGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgLy8gTm8gY2FsbGJhY2ssIHRyeSByZXR1cm5pbmcgYSBwcm9taXNlXHJcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9taXNlSW1wbCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IHByb21pc2VJbXBsKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlRm4gPSBoYW5kbGVDYWNoZSQxKG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZUZuKGRhdGEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBFdGFFcnIoXCJQbGVhc2UgcHJvdmlkZSBhIGNhbGxiYWNrIGZ1bmN0aW9uLCB0aGlzIGVudiBkb2Vzbid0IHN1cHBvcnQgUHJvbWlzZXNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbi8qKlxyXG4gKiBHZXQgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLlxyXG4gKlxyXG4gKiBJZiBgb3B0aW9ucy5jYWNoZWAgaXMgYHRydWVgLCB0aGVuIHRoZSB0ZW1wbGF0ZSBpcyBjYWNoZWQuXHJcbiAqXHJcbiAqIFRoaXMgcmV0dXJucyBhIHRlbXBsYXRlIGZ1bmN0aW9uIGFuZCB0aGUgY29uZmlnIG9iamVjdCB3aXRoIHdoaWNoIHRoYXQgdGVtcGxhdGUgZnVuY3Rpb24gc2hvdWxkIGJlIGNhbGxlZC5cclxuICpcclxuICogQHJlbWFya3NcclxuICpcclxuICogSXQncyBpbXBvcnRhbnQgdGhhdCB0aGlzIHJldHVybnMgYSBjb25maWcgb2JqZWN0IHdpdGggYGZpbGVuYW1lYCBzZXQuXHJcbiAqIE90aGVyd2lzZSwgdGhlIGluY2x1ZGVkIGZpbGUgd291bGQgbm90IGJlIGFibGUgdG8gdXNlIHJlbGF0aXZlIHBhdGhzXHJcbiAqXHJcbiAqIEBwYXJhbSBwYXRoIHBhdGggZm9yIHRoZSBzcGVjaWZpZWQgZmlsZSAoaWYgcmVsYXRpdmUsIHNwZWNpZnkgYHZpZXdzYCBvbiBgb3B0aW9uc2ApXHJcbiAqIEBwYXJhbSBvcHRpb25zIGNvbXBpbGF0aW9uIG9wdGlvbnNcclxuICogQHJldHVybiBbRXRhIHRlbXBsYXRlIGZ1bmN0aW9uLCBuZXcgY29uZmlnIG9iamVjdF1cclxuICovXHJcbmZ1bmN0aW9uIGluY2x1ZGVGaWxlKHBhdGgsIG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBiZWxvdyBjcmVhdGVzIGEgbmV3IG9wdGlvbnMgb2JqZWN0LCB1c2luZyB0aGUgcGFyZW50IGZpbGVwYXRoIG9mIHRoZSBvbGQgb3B0aW9ucyBvYmplY3QgYW5kIHRoZSBwYXRoXHJcbiAgICB2YXIgbmV3RmlsZU9wdGlvbnMgPSBnZXRDb25maWcoeyBmaWxlbmFtZTogZ2V0UGF0aChwYXRoLCBvcHRpb25zKSB9LCBvcHRpb25zKTtcclxuICAgIC8vIFRPRE86IG1ha2Ugc3VyZSBwcm9wZXJ0aWVzIGFyZSBjdXJyZWN0bHkgY29waWVkIG92ZXJcclxuICAgIHJldHVybiBbaGFuZGxlQ2FjaGUkMShuZXdGaWxlT3B0aW9ucyksIG5ld0ZpbGVPcHRpb25zXTtcclxufVxyXG5mdW5jdGlvbiByZW5kZXJGaWxlKGZpbGVuYW1lLCBkYXRhLCBjb25maWcsIGNiKSB7XHJcbiAgICAvKlxyXG4gICAgSGVyZSB3ZSBoYXZlIHNvbWUgZnVuY3Rpb24gb3ZlcmxvYWRpbmcuXHJcbiAgICBFc3NlbnRpYWxseSwgdGhlIGZpcnN0IDIgYXJndW1lbnRzIHRvIHJlbmRlckZpbGUgc2hvdWxkIGFsd2F5cyBiZSB0aGUgZmlsZW5hbWUgYW5kIGRhdGFcclxuICAgIEhvd2V2ZXIsIHdpdGggRXhwcmVzcywgY29uZmlndXJhdGlvbiBvcHRpb25zIHdpbGwgYmUgcGFzc2VkIGFsb25nIHdpdGggdGhlIGRhdGEuXHJcbiAgICBUaHVzLCBFeHByZXNzIHdpbGwgY2FsbCByZW5kZXJGaWxlIHdpdGggKGZpbGVuYW1lLCBkYXRhQW5kT3B0aW9ucywgY2IpXHJcbiAgICBBbmQgd2Ugd2FudCB0byBhbHNvIG1ha2UgKGZpbGVuYW1lLCBkYXRhLCBvcHRpb25zLCBjYikgYXZhaWxhYmxlXHJcbiAgICAqL1xyXG4gICAgdmFyIHJlbmRlckNvbmZpZztcclxuICAgIHZhciBjYWxsYmFjaztcclxuICAgIGRhdGEgPSBkYXRhIHx8IHt9OyAvLyBJZiBkYXRhIGlzIHVuZGVmaW5lZCwgd2UgZG9uJ3Qgd2FudCBhY2Nlc3NpbmcgZGF0YS5zZXR0aW5ncyB0byBlcnJvclxyXG4gICAgLy8gRmlyc3QsIGFzc2lnbiBvdXIgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYGNhbGxiYWNrYFxyXG4gICAgLy8gV2UgY2FuIGxlYXZlIGl0IHVuZGVmaW5lZCBpZiBuZWl0aGVyIHBhcmFtZXRlciBpcyBhIGZ1bmN0aW9uO1xyXG4gICAgLy8gQ2FsbGJhY2tzIGFyZSBvcHRpb25hbFxyXG4gICAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIC8vIFRoZSA0dGggYXJndW1lbnQgaXMgdGhlIGNhbGxiYWNrXHJcbiAgICAgICAgY2FsbGJhY2sgPSBjYjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBjb25maWcgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAvLyBUaGUgM3JkIGFyZyBpcyB0aGUgY2FsbGJhY2tcclxuICAgICAgICBjYWxsYmFjayA9IGNvbmZpZztcclxuICAgIH1cclxuICAgIC8vIElmIHRoZXJlIGlzIGEgY29uZmlnIG9iamVjdCBwYXNzZWQgaW4gZXhwbGljaXRseSwgdXNlIGl0XHJcbiAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICByZW5kZXJDb25maWcgPSBnZXRDb25maWcoY29uZmlnIHx8IHt9KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIE90aGVyd2lzZSwgZ2V0IHRoZSBjb25maWcgZnJvbSB0aGUgZGF0YSBvYmplY3RcclxuICAgICAgICAvLyBBbmQgdGhlbiBncmFiIHNvbWUgY29uZmlnIG9wdGlvbnMgZnJvbSBkYXRhLnNldHRpbmdzXHJcbiAgICAgICAgLy8gV2hpY2ggaXMgd2hlcmUgRXhwcmVzcyBzb21ldGltZXMgc3RvcmVzIHRoZW1cclxuICAgICAgICByZW5kZXJDb25maWcgPSBnZXRDb25maWcoZGF0YSk7XHJcbiAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3MpIHtcclxuICAgICAgICAgICAgLy8gUHVsbCBhIGZldyB0aGluZ3MgZnJvbSBrbm93biBsb2NhdGlvbnNcclxuICAgICAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3Mudmlld3MpIHtcclxuICAgICAgICAgICAgICAgIHJlbmRlckNvbmZpZy52aWV3cyA9IGRhdGEuc2V0dGluZ3Mudmlld3M7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3NbJ3ZpZXcgY2FjaGUnXSkge1xyXG4gICAgICAgICAgICAgICAgcmVuZGVyQ29uZmlnLmNhY2hlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBVbmRvY3VtZW50ZWQgYWZ0ZXIgRXhwcmVzcyAyLCBidXQgc3RpbGwgdXNhYmxlLCBlc3AuIGZvclxyXG4gICAgICAgICAgICAvLyBpdGVtcyB0aGF0IGFyZSB1bnNhZmUgdG8gYmUgcGFzc2VkIGFsb25nIHdpdGggZGF0YSwgbGlrZSBgcm9vdGBcclxuICAgICAgICAgICAgdmFyIHZpZXdPcHRzID0gZGF0YS5zZXR0aW5nc1sndmlldyBvcHRpb25zJ107XHJcbiAgICAgICAgICAgIGlmICh2aWV3T3B0cykge1xyXG4gICAgICAgICAgICAgICAgY29weVByb3BzKHJlbmRlckNvbmZpZywgdmlld09wdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gU2V0IHRoZSBmaWxlbmFtZSBvcHRpb24gb24gdGhlIHRlbXBsYXRlXHJcbiAgICAvLyBUaGlzIHdpbGwgZmlyc3QgdHJ5IHRvIHJlc29sdmUgdGhlIGZpbGUgcGF0aCAoc2VlIGdldFBhdGggZm9yIGRldGFpbHMpXHJcbiAgICByZW5kZXJDb25maWcuZmlsZW5hbWUgPSBnZXRQYXRoKGZpbGVuYW1lLCByZW5kZXJDb25maWcpO1xyXG4gICAgcmV0dXJuIHRyeUhhbmRsZUNhY2hlKGRhdGEsIHJlbmRlckNvbmZpZywgY2FsbGJhY2spO1xyXG59XHJcbmZ1bmN0aW9uIHJlbmRlckZpbGVBc3luYyhmaWxlbmFtZSwgZGF0YSwgY29uZmlnLCBjYikge1xyXG4gICAgcmV0dXJuIHJlbmRlckZpbGUoZmlsZW5hbWUsIHR5cGVvZiBjb25maWcgPT09ICdmdW5jdGlvbicgPyBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgZGF0YSksIHsgYXN5bmM6IHRydWUgfSkgOiBkYXRhLCB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyA/IF9fYXNzaWduKF9fYXNzaWduKHt9LCBjb25maWcpLCB7IGFzeW5jOiB0cnVlIH0pIDogY29uZmlnLCBjYik7XHJcbn1cblxuLyogRU5EIFRZUEVTICovXHJcbi8qKlxyXG4gKiBDYWxsZWQgd2l0aCBgaW5jbHVkZUZpbGUocGF0aCwgZGF0YSlgXHJcbiAqL1xyXG5mdW5jdGlvbiBpbmNsdWRlRmlsZUhlbHBlcihwYXRoLCBkYXRhKSB7XHJcbiAgICB2YXIgdGVtcGxhdGVBbmRDb25maWcgPSBpbmNsdWRlRmlsZShwYXRoLCB0aGlzKTtcclxuICAgIHJldHVybiB0ZW1wbGF0ZUFuZENvbmZpZ1swXShkYXRhLCB0ZW1wbGF0ZUFuZENvbmZpZ1sxXSk7XHJcbn1cblxuLyogRU5EIFRZUEVTICovXHJcbmZ1bmN0aW9uIGhhbmRsZUNhY2hlKHRlbXBsYXRlLCBvcHRpb25zKSB7XHJcbiAgICBpZiAob3B0aW9ucy5jYWNoZSAmJiBvcHRpb25zLm5hbWUgJiYgb3B0aW9ucy50ZW1wbGF0ZXMuZ2V0KG9wdGlvbnMubmFtZSkpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZXMuZ2V0KG9wdGlvbnMubmFtZSk7XHJcbiAgICB9XHJcbiAgICB2YXIgdGVtcGxhdGVGdW5jID0gdHlwZW9mIHRlbXBsYXRlID09PSAnZnVuY3Rpb24nID8gdGVtcGxhdGUgOiBjb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKTtcclxuICAgIC8vIE5vdGUgdGhhdCB3ZSBkb24ndCBoYXZlIHRvIGNoZWNrIGlmIGl0IGFscmVhZHkgZXhpc3RzIGluIHRoZSBjYWNoZTtcclxuICAgIC8vIGl0IHdvdWxkIGhhdmUgcmV0dXJuZWQgZWFybGllciBpZiBpdCBoYWRcclxuICAgIGlmIChvcHRpb25zLmNhY2hlICYmIG9wdGlvbnMubmFtZSkge1xyXG4gICAgICAgIG9wdGlvbnMudGVtcGxhdGVzLmRlZmluZShvcHRpb25zLm5hbWUsIHRlbXBsYXRlRnVuYyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGVtcGxhdGVGdW5jO1xyXG59XHJcbi8qKlxyXG4gKiBSZW5kZXIgYSB0ZW1wbGF0ZVxyXG4gKlxyXG4gKiBJZiBgdGVtcGxhdGVgIGlzIGEgc3RyaW5nLCBFdGEgd2lsbCBjb21waWxlIGl0IHRvIGEgZnVuY3Rpb24gYW5kIHRoZW4gY2FsbCBpdCB3aXRoIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gKiBJZiBgdGVtcGxhdGVgIGlzIGEgdGVtcGxhdGUgZnVuY3Rpb24sIEV0YSB3aWxsIGNhbGwgaXQgd2l0aCB0aGUgcHJvdmlkZWQgZGF0YS5cclxuICpcclxuICogSWYgYGNvbmZpZy5hc3luY2AgaXMgYGZhbHNlYCwgRXRhIHdpbGwgcmV0dXJuIHRoZSByZW5kZXJlZCB0ZW1wbGF0ZS5cclxuICpcclxuICogSWYgYGNvbmZpZy5hc3luY2AgaXMgYHRydWVgIGFuZCB0aGVyZSdzIGEgY2FsbGJhY2sgZnVuY3Rpb24sIEV0YSB3aWxsIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggYChlcnIsIHJlbmRlcmVkVGVtcGxhdGUpYC5cclxuICogSWYgYGNvbmZpZy5hc3luY2AgaXMgYHRydWVgIGFuZCB0aGVyZSdzIG5vdCBhIGNhbGxiYWNrIGZ1bmN0aW9uLCBFdGEgd2lsbCByZXR1cm4gYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHJlbmRlcmVkIHRlbXBsYXRlLlxyXG4gKlxyXG4gKiBJZiBgY29uZmlnLmNhY2hlYCBpcyBgdHJ1ZWAgYW5kIGBjb25maWdgIGhhcyBhIGBuYW1lYCBvciBgZmlsZW5hbWVgIHByb3BlcnR5LCBFdGEgd2lsbCBjYWNoZSB0aGUgdGVtcGxhdGUgb24gdGhlIGZpcnN0IHJlbmRlciBhbmQgdXNlIHRoZSBjYWNoZWQgdGVtcGxhdGUgZm9yIGFsbCBzdWJzZXF1ZW50IHJlbmRlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB0ZW1wbGF0ZSBUZW1wbGF0ZSBzdHJpbmcgb3IgdGVtcGxhdGUgZnVuY3Rpb25cclxuICogQHBhcmFtIGRhdGEgRGF0YSB0byByZW5kZXIgdGhlIHRlbXBsYXRlIHdpdGhcclxuICogQHBhcmFtIGNvbmZpZyBPcHRpb25hbCBjb25maWcgb3B0aW9uc1xyXG4gKiBAcGFyYW0gY2IgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICovXHJcbmZ1bmN0aW9uIHJlbmRlcih0ZW1wbGF0ZSwgZGF0YSwgY29uZmlnLCBjYikge1xyXG4gICAgdmFyIG9wdGlvbnMgPSBnZXRDb25maWcoY29uZmlnIHx8IHt9KTtcclxuICAgIGlmIChvcHRpb25zLmFzeW5jKSB7XHJcbiAgICAgICAgaWYgKGNiKSB7XHJcbiAgICAgICAgICAgIC8vIElmIHVzZXIgcGFzc2VzIGNhbGxiYWNrXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBpZiB0aGVyZSBpcyBhbiBlcnJvciB3aGlsZSByZW5kZXJpbmcgdGhlIHRlbXBsYXRlLFxyXG4gICAgICAgICAgICAgICAgLy8gSXQgd2lsbCBidWJibGUgdXAgYW5kIGJlIGNhdWdodCBoZXJlXHJcbiAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVGbiA9IGhhbmRsZUNhY2hlKHRlbXBsYXRlLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlRm4oZGF0YSwgb3B0aW9ucywgY2IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjYihlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBObyBjYWxsYmFjaywgdHJ5IHJldHVybmluZyBhIHByb21pc2VcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9taXNlSW1wbCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBwcm9taXNlSW1wbChmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShoYW5kbGVDYWNoZSh0ZW1wbGF0ZSwgb3B0aW9ucykoZGF0YSwgb3B0aW9ucykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXRhRXJyKFwiUGxlYXNlIHByb3ZpZGUgYSBjYWxsYmFjayBmdW5jdGlvbiwgdGhpcyBlbnYgZG9lc24ndCBzdXBwb3J0IFByb21pc2VzXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGhhbmRsZUNhY2hlKHRlbXBsYXRlLCBvcHRpb25zKShkYXRhLCBvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG4vKipcclxuICogUmVuZGVyIGEgdGVtcGxhdGUgYXN5bmNocm9ub3VzbHlcclxuICpcclxuICogSWYgYHRlbXBsYXRlYCBpcyBhIHN0cmluZywgRXRhIHdpbGwgY29tcGlsZSBpdCB0byBhIGZ1bmN0aW9uIGFuZCBjYWxsIGl0IHdpdGggdGhlIHByb3ZpZGVkIGRhdGEuXHJcbiAqIElmIGB0ZW1wbGF0ZWAgaXMgYSBmdW5jdGlvbiwgRXRhIHdpbGwgY2FsbCBpdCB3aXRoIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gKlxyXG4gKiBJZiB0aGVyZSBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLCBFdGEgd2lsbCBjYWxsIGl0IHdpdGggYChlcnIsIHJlbmRlcmVkVGVtcGxhdGUpYC5cclxuICogSWYgdGhlcmUgaXMgbm90IGEgY2FsbGJhY2sgZnVuY3Rpb24sIEV0YSB3aWxsIHJldHVybiBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgcmVuZGVyZWQgdGVtcGxhdGVcclxuICpcclxuICogQHBhcmFtIHRlbXBsYXRlIFRlbXBsYXRlIHN0cmluZyBvciB0ZW1wbGF0ZSBmdW5jdGlvblxyXG4gKiBAcGFyYW0gZGF0YSBEYXRhIHRvIHJlbmRlciB0aGUgdGVtcGxhdGUgd2l0aFxyXG4gKiBAcGFyYW0gY29uZmlnIE9wdGlvbmFsIGNvbmZpZyBvcHRpb25zXHJcbiAqIEBwYXJhbSBjYiBDYWxsYmFjayBmdW5jdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gcmVuZGVyQXN5bmModGVtcGxhdGUsIGRhdGEsIGNvbmZpZywgY2IpIHtcclxuICAgIC8vIFVzaW5nIE9iamVjdC5hc3NpZ24gdG8gbG93ZXIgYnVuZGxlIHNpemUsIHVzaW5nIHNwcmVhZCBvcGVyYXRvciBtYWtlcyBpdCBsYXJnZXIgYmVjYXVzZSBvZiB0eXBlc2NyaXB0IGluamVjdGVkIHBvbHlmaWxsc1xyXG4gICAgcmV0dXJuIHJlbmRlcih0ZW1wbGF0ZSwgZGF0YSwgT2JqZWN0LmFzc2lnbih7fSwgY29uZmlnLCB7IGFzeW5jOiB0cnVlIH0pLCBjYik7XHJcbn1cblxuLy8gQGRlbm9pZnktaWdub3JlXHJcbmNvbmZpZy5pbmNsdWRlRmlsZSA9IGluY2x1ZGVGaWxlSGVscGVyO1xyXG5jb25maWcuZmlsZXBhdGhDYWNoZSA9IHt9O1xuXG5leHBvcnQgeyByZW5kZXJGaWxlIGFzIF9fZXhwcmVzcywgY29tcGlsZSwgY29tcGlsZVRvU3RyaW5nLCBjb25maWcsIGNvbmZpZ3VyZSwgY29uZmlnIGFzIGRlZmF1bHRDb25maWcsIGdldENvbmZpZywgbG9hZEZpbGUsIHBhcnNlLCByZW5kZXIsIHJlbmRlckFzeW5jLCByZW5kZXJGaWxlLCByZW5kZXJGaWxlQXN5bmMsIHRlbXBsYXRlcyB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXRhLmVzLmpzLm1hcFxuIiwiaW1wb3J0IFRlbXBsYXRlclBsdWdpbiBmcm9tIFwibWFpblwiO1xuaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBSdW5uaW5nQ29uZmlnIH0gZnJvbSBcIlRlbXBsYXRlclwiO1xuaW1wb3J0IHsgVFBhcnNlciB9IGZyb20gXCJUUGFyc2VyXCI7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJbnRlcm5hbE1vZHVsZSBpbXBsZW1lbnRzIFRQYXJzZXIge1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBuYW1lOiBzdHJpbmc7XG4gICAgcHJvdGVjdGVkIHN0YXRpY190ZW1wbGF0ZXM6IE1hcDxzdHJpbmcsIGFueT4gPSBuZXcgTWFwKCk7XG4gICAgcHJvdGVjdGVkIGR5bmFtaWNfdGVtcGxhdGVzOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcCgpO1xuICAgIHByb3RlY3RlZCBjb25maWc6IFJ1bm5pbmdDb25maWc7XG4gICAgcHJpdmF0ZSBzdGF0aWNfY29udGV4dDoge1t4OiBzdHJpbmddOiBhbnl9O1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGFwcDogQXBwLCBwcm90ZWN0ZWQgcGx1Z2luOiBUZW1wbGF0ZXJQbHVnaW4pIHt9XG5cbiAgICBnZXROYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVcbiAgICB9XG5cbiAgICBhYnN0cmFjdCBjcmVhdGVTdGF0aWNUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPjtcbiAgICBhYnN0cmFjdCB1cGRhdGVUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPjtcblxuICAgIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlU3RhdGljVGVtcGxhdGVzKCk7XG4gICAgICAgIHRoaXMuc3RhdGljX2NvbnRleHQgPSBPYmplY3QuZnJvbUVudHJpZXModGhpcy5zdGF0aWNfdGVtcGxhdGVzKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5lcmF0ZUNvbnRleHQoY29uZmlnOiBSdW5uaW5nQ29uZmlnKTogUHJvbWlzZTx7W3g6IHN0cmluZ106IGFueX0+IHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlVGVtcGxhdGVzKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLnRoaXMuc3RhdGljX2NvbnRleHQsXG4gICAgICAgICAgICAuLi5PYmplY3QuZnJvbUVudHJpZXModGhpcy5keW5hbWljX3RlbXBsYXRlcyksXG4gICAgICAgIH07XG4gICAgfVxufSIsImltcG9ydCB7IFRlbXBsYXRlckVycm9yIH0gZnJvbSBcIkVycm9yXCI7XG5pbXBvcnQgeyBJbnRlcm5hbE1vZHVsZSB9IGZyb20gXCIuLi9JbnRlcm5hbE1vZHVsZVwiO1xuXG5leHBvcnQgY2xhc3MgSW50ZXJuYWxNb2R1bGVEYXRlIGV4dGVuZHMgSW50ZXJuYWxNb2R1bGUge1xuICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcgPSBcImRhdGVcIjtcblxuICAgIGFzeW5jIGNyZWF0ZVN0YXRpY1RlbXBsYXRlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcIm5vd1wiLCB0aGlzLmdlbmVyYXRlX25vdygpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInRvbW9ycm93XCIsIHRoaXMuZ2VuZXJhdGVfdG9tb3Jyb3coKSk7XG4gICAgICAgIHRoaXMuc3RhdGljX3RlbXBsYXRlcy5zZXQoXCJ3ZWVrZGF5XCIsIHRoaXMuZ2VuZXJhdGVfd2Vla2RheSgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInllc3RlcmRheVwiLCB0aGlzLmdlbmVyYXRlX3llc3RlcmRheSgpKTtcbiAgICB9XG5cbiAgICBhc3luYyB1cGRhdGVUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gICAgZ2VuZXJhdGVfbm93KCk6IEZ1bmN0aW9uIHtcbiAgICAgICAgcmV0dXJuIChmb3JtYXQ6IHN0cmluZyA9IFwiWVlZWS1NTS1ERFwiLCBvZmZzZXQ/OiBudW1iZXJ8c3RyaW5nLCByZWZlcmVuY2U/OiBzdHJpbmcsIHJlZmVyZW5jZV9mb3JtYXQ/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChyZWZlcmVuY2UgJiYgIXdpbmRvdy5tb21lbnQocmVmZXJlbmNlLCByZWZlcmVuY2VfZm9ybWF0KS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoXCJJbnZhbGlkIHJlZmVyZW5jZSBkYXRlIGZvcm1hdCwgdHJ5IHNwZWNpZnlpbmcgb25lIHdpdGggdGhlIGFyZ3VtZW50ICdyZWZlcmVuY2VfZm9ybWF0J1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBkdXJhdGlvbjtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb2Zmc2V0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSB3aW5kb3cubW9tZW50LmR1cmF0aW9uKG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2Zmc2V0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24gPSB3aW5kb3cubW9tZW50LmR1cmF0aW9uKG9mZnNldCwgXCJkYXlzXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gd2luZG93Lm1vbWVudChyZWZlcmVuY2UsIHJlZmVyZW5jZV9mb3JtYXQpLmFkZChkdXJhdGlvbikuZm9ybWF0KGZvcm1hdCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV90b21vcnJvdygpOiBGdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiAoZm9ybWF0OiBzdHJpbmcgPSBcIllZWVktTU0tRERcIikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5tb21lbnQoKS5hZGQoMSwgJ2RheXMnKS5mb3JtYXQoZm9ybWF0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX3dlZWtkYXkoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gKGZvcm1hdDogc3RyaW5nID0gXCJZWVlZLU1NLUREXCIsIHdlZWtkYXk6IG51bWJlciwgcmVmZXJlbmNlPzogc3RyaW5nLCByZWZlcmVuY2VfZm9ybWF0Pzogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVmZXJlbmNlICYmICF3aW5kb3cubW9tZW50KHJlZmVyZW5jZSwgcmVmZXJlbmNlX2Zvcm1hdCkuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKFwiSW52YWxpZCByZWZlcmVuY2UgZGF0ZSBmb3JtYXQsIHRyeSBzcGVjaWZ5aW5nIG9uZSB3aXRoIHRoZSBhcmd1bWVudCAncmVmZXJlbmNlX2Zvcm1hdCdcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gd2luZG93Lm1vbWVudChyZWZlcmVuY2UsIHJlZmVyZW5jZV9mb3JtYXQpLndlZWtkYXkod2Vla2RheSkuZm9ybWF0KGZvcm1hdCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV95ZXN0ZXJkYXkoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gKGZvcm1hdDogc3RyaW5nID0gXCJZWVlZLU1NLUREXCIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cubW9tZW50KCkuYWRkKC0xLCAnZGF5cycpLmZvcm1hdChmb3JtYXQpO1xuICAgICAgICB9XG4gICAgfVxufSIsImltcG9ydCB7IEludGVybmFsTW9kdWxlIH0gZnJvbSBcIi4uL0ludGVybmFsTW9kdWxlXCI7XG5cbmltcG9ydCB7IEZpbGVTeXN0ZW1BZGFwdGVyLCBnZXRBbGxUYWdzLCBNYXJrZG93blZpZXcsIG5vcm1hbGl6ZVBhdGgsIHBhcnNlTGlua3RleHQsIHJlc29sdmVTdWJwYXRoLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgVU5TVVBQT1JURURfTU9CSUxFX1RFTVBMQVRFIH0gZnJvbSBcIkNvbnN0YW50c1wiO1xuaW1wb3J0IHsgVGVtcGxhdGVyRXJyb3IgfSBmcm9tIFwiRXJyb3JcIjtcblxuZXhwb3J0IGNvbnN0IERFUFRIX0xJTUlUID0gMTA7XG5cbmV4cG9ydCBjbGFzcyBJbnRlcm5hbE1vZHVsZUZpbGUgZXh0ZW5kcyBJbnRlcm5hbE1vZHVsZSB7XG4gICAgcHVibGljIG5hbWU6IHN0cmluZyA9IFwiZmlsZVwiO1xuICAgIHByaXZhdGUgaW5jbHVkZV9kZXB0aDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIGxpbmtwYXRoX3JlZ2V4OiBSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlxcXFxbXFxcXFsoLiopXFxcXF1cXFxcXSRcIik7XG5cbiAgICBhc3luYyBjcmVhdGVTdGF0aWNUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuc3RhdGljX3RlbXBsYXRlcy5zZXQoXCJjcmVhdGlvbl9kYXRlXCIsIHRoaXMuZ2VuZXJhdGVfY3JlYXRpb25fZGF0ZSgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImN1cnNvclwiLCB0aGlzLmdlbmVyYXRlX2N1cnNvcigpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImV4aXN0c1wiLCB0aGlzLmdlbmVyYXRlX2V4aXN0cygpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImZvbGRlclwiLCB0aGlzLmdlbmVyYXRlX2ZvbGRlcigpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImluY2x1ZGVcIiwgdGhpcy5nZW5lcmF0ZV9pbmNsdWRlKCkpO1xuICAgICAgICB0aGlzLnN0YXRpY190ZW1wbGF0ZXMuc2V0KFwibGFzdF9tb2RpZmllZF9kYXRlXCIsIHRoaXMuZ2VuZXJhdGVfbGFzdF9tb2RpZmllZF9kYXRlKCkpO1xuICAgICAgICB0aGlzLnN0YXRpY190ZW1wbGF0ZXMuc2V0KFwibW92ZVwiLCB0aGlzLmdlbmVyYXRlX21vdmUoKSk7XG4gICAgICAgIHRoaXMuc3RhdGljX3RlbXBsYXRlcy5zZXQoXCJwYXRoXCIsIHRoaXMuZ2VuZXJhdGVfcGF0aCgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInJlbmFtZVwiLCB0aGlzLmdlbmVyYXRlX3JlbmFtZSgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInNlbGVjdGlvblwiLCB0aGlzLmdlbmVyYXRlX3NlbGVjdGlvbigpKTtcbiAgICB9XG5cbiAgICBhc3luYyB1cGRhdGVUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuZHluYW1pY190ZW1wbGF0ZXMuc2V0KFwiY29udGVudFwiLCBhd2FpdCB0aGlzLmdlbmVyYXRlX2NvbnRlbnQoKSk7XG4gICAgICAgIHRoaXMuZHluYW1pY190ZW1wbGF0ZXMuc2V0KFwidGFnc1wiLCB0aGlzLmdlbmVyYXRlX3RhZ3MoKSk7XG4gICAgICAgIHRoaXMuZHluYW1pY190ZW1wbGF0ZXMuc2V0KFwidGl0bGVcIiwgdGhpcy5nZW5lcmF0ZV90aXRsZSgpKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9jdXJzb3IoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gKG9yZGVyPzogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAvLyBIYWNrIHRvIHByZXZlbnQgZW1wdHkgb3V0cHV0XG4gICAgICAgICAgICByZXR1cm4gYDwlIHRwLmZpbGUuY3Vyc29yKCR7b3JkZXIgPz8gJyd9KSAlPmA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZW5lcmF0ZV9jb250ZW50KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKHRoaXMuY29uZmlnLnRhcmdldF9maWxlKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9jcmVhdGlvbl9kYXRlKCk6IEZ1bmN0aW9uIHtcbiAgICAgICAgcmV0dXJuIChmb3JtYXQ6IHN0cmluZyA9IFwiWVlZWS1NTS1ERCBISDptbVwiKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gd2luZG93Lm1vbWVudCh0aGlzLmNvbmZpZy50YXJnZXRfZmlsZS5zdGF0LmN0aW1lKS5mb3JtYXQoZm9ybWF0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX2V4aXN0cygpOiBGdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiAoZmlsZV9saW5rOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGxldCBtYXRjaDtcbiAgICAgICAgICAgIGlmICgobWF0Y2ggPSB0aGlzLmxpbmtwYXRoX3JlZ2V4LmV4ZWMoZmlsZV9saW5rKSkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoXCJJbnZhbGlkIGZpbGUgZm9ybWF0LCBwcm92aWRlIGFuIG9ic2lkaWFuIGxpbmsgYmV0d2VlbiBxdW90ZXMuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QobWF0Y2hbMV0sIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUgIT0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX2ZvbGRlcigpOiBGdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiAocmVsYXRpdmU6IGJvb2xlYW4gPSBmYWxzZSkgPT4ge1xuICAgICAgICAgICAgbGV0IHBhcmVudCA9IHRoaXMuY29uZmlnLnRhcmdldF9maWxlLnBhcmVudDtcbiAgICAgICAgICAgIGxldCBmb2xkZXI7XG5cbiAgICAgICAgICAgIGlmIChyZWxhdGl2ZSkge1xuICAgICAgICAgICAgICAgIGZvbGRlciA9IHBhcmVudC5wYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyID0gcGFyZW50Lm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmb2xkZXI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9pbmNsdWRlKCk6IEZ1bmN0aW9uIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jIChpbmNsdWRlX2xpbms6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgLy8gVE9ETzogQWRkIG11dGV4IGZvciB0aGlzLCB0aGlzIG1heSBjdXJyZW50bHkgbGVhZCB0byBhIHJhY2UgY29uZGl0aW9uLiBcbiAgICAgICAgICAgIC8vIFdoaWxlIG5vdCB2ZXJ5IGltcGFjdGZ1bCwgdGhhdCBjb3VsZCBzdGlsbCBiZSBhbm5veWluZy5cbiAgICAgICAgICAgIHRoaXMuaW5jbHVkZV9kZXB0aCArPSAxO1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5jbHVkZV9kZXB0aCA+IERFUFRIX0xJTUlUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmNsdWRlX2RlcHRoID0gMDtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoXCJSZWFjaGVkIGluY2x1c2lvbiBkZXB0aCBsaW1pdCAobWF4ID0gMTApXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgICAgICBpZiAoKG1hdGNoID0gdGhpcy5saW5rcGF0aF9yZWdleC5leGVjKGluY2x1ZGVfbGluaykpID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKFwiSW52YWxpZCBmaWxlIGZvcm1hdCwgcHJvdmlkZSBhbiBvYnNpZGlhbiBsaW5rIGJldHdlZW4gcXVvdGVzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHtwYXRoLCBzdWJwYXRofSA9IHBhcnNlTGlua3RleHQobWF0Y2hbMV0pO1xuXG4gICAgICAgICAgICBjb25zdCBpbmNfZmlsZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QocGF0aCwgXCJcIik7XG4gICAgICAgICAgICBpZiAoIWluY19maWxlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKGBGaWxlICR7aW5jbHVkZV9saW5rfSBkb2Vzbid0IGV4aXN0YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBpbmNfZmlsZV9jb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChpbmNfZmlsZSk7XG4gICAgICAgICAgICBpZiAoc3VicGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoaW5jX2ZpbGUpO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSByZXNvbHZlU3VicGF0aChjYWNoZSwgc3VicGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY19maWxlX2NvbnRlbnQgPSBpbmNfZmlsZV9jb250ZW50LnNsaWNlKHJlc3VsdC5zdGFydC5vZmZzZXQsIHJlc3VsdC5lbmQ/Lm9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZF9jb250ZW50ID0gYXdhaXQgdGhpcy5wbHVnaW4udGVtcGxhdGVyLnBhcnNlci5wYXJzZVRlbXBsYXRlcyhpbmNfZmlsZV9jb250ZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pbmNsdWRlX2RlcHRoIC09IDE7XG4gICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlZF9jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfbGFzdF9tb2RpZmllZF9kYXRlKCk6IEZ1bmN0aW9uIHtcbiAgICAgICAgcmV0dXJuIChmb3JtYXQ6IHN0cmluZyA9IFwiWVlZWS1NTS1ERCBISDptbVwiKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cubW9tZW50KHRoaXMuY29uZmlnLnRhcmdldF9maWxlLnN0YXQubXRpbWUpLmZvcm1hdChmb3JtYXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfbW92ZSgpOiBGdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiBhc3luYyAocGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdfcGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7cGF0aH0uJHt0aGlzLmNvbmZpZy50YXJnZXRfZmlsZS5leHRlbnNpb259YCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKHRoaXMuY29uZmlnLnRhcmdldF9maWxlLCBuZXdfcGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX3BhdGgoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gKHJlbGF0aXZlOiBib29sZWFuID0gZmFsc2UpID0+IHtcbiAgICAgICAgICAgIC8vIFRPRE86IEFkZCBtb2JpbGUgc3VwcG9ydFxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgaWYgKHRoaXMuYXBwLmlzTW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVOU1VQUE9SVEVEX01PQklMRV9URU1QTEFURTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgaW5zdGFuY2VvZiBGaWxlU3lzdGVtQWRhcHRlcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoXCJhcHAudmF1bHQgaXMgbm90IGEgRmlsZVN5c3RlbUFkYXB0ZXIgaW5zdGFuY2VcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB2YXVsdF9wYXRoID0gdGhpcy5hcHAudmF1bHQuYWRhcHRlci5nZXRCYXNlUGF0aCgpO1xuXG4gICAgICAgICAgICBpZiAocmVsYXRpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcudGFyZ2V0X2ZpbGUucGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBgJHt2YXVsdF9wYXRofS8ke3RoaXMuY29uZmlnLnRhcmdldF9maWxlLnBhdGh9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX3JlbmFtZSgpOiBGdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiBhc3luYyAobmV3X3RpdGxlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChuZXdfdGl0bGUubWF0Y2goL1tcXFxcXFwvOl0rL2cpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKFwiRmlsZSBuYW1lIGNhbm5vdCBjb250YWluIGFueSBvZiB0aGVzZSBjaGFyYWN0ZXJzOiBcXFxcIC8gOlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG5ld19wYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLmNvbmZpZy50YXJnZXRfZmlsZS5wYXJlbnQucGF0aH0vJHtuZXdfdGl0bGV9LiR7dGhpcy5jb25maWcudGFyZ2V0X2ZpbGUuZXh0ZW5zaW9ufWApO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZSh0aGlzLmNvbmZpZy50YXJnZXRfZmlsZSwgbmV3X3BhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9zZWxlY3Rpb24oKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYWN0aXZlX3ZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgICAgICAgICAgaWYgKGFjdGl2ZV92aWV3ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoXCJBY3RpdmUgdmlldyBpcyBudWxsLCBjYW4ndCByZWFkIHNlbGVjdGlvbi5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZV92aWV3LmVkaXRvcjtcbiAgICAgICAgICAgIHJldHVybiBlZGl0b3IuZ2V0U2VsZWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPOiBUdXJuIHRoaXMgaW50byBhIGZ1bmN0aW9uXG4gICAgZ2VuZXJhdGVfdGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUodGhpcy5jb25maWcudGFyZ2V0X2ZpbGUpO1xuICAgICAgICByZXR1cm4gZ2V0QWxsVGFncyhjYWNoZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogVHVybiB0aGlzIGludG8gYSBmdW5jdGlvblxuICAgIGdlbmVyYXRlX3RpdGxlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy50YXJnZXRfZmlsZS5iYXNlbmFtZTtcbiAgICB9XG59IiwiaW1wb3J0IHsgVGVtcGxhdGVyRXJyb3IgfSBmcm9tIFwiRXJyb3JcIjtcbmltcG9ydCB7IEludGVybmFsTW9kdWxlIH0gZnJvbSBcIi4uL0ludGVybmFsTW9kdWxlXCI7XG5cbmV4cG9ydCBjbGFzcyBJbnRlcm5hbE1vZHVsZVdlYiBleHRlbmRzIEludGVybmFsTW9kdWxlIHtcbiAgICBuYW1lID0gXCJ3ZWJcIjtcblxuICAgIGFzeW5jIGNyZWF0ZVN0YXRpY1RlbXBsYXRlcygpIHtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImRhaWx5X3F1b3RlXCIsIHRoaXMuZ2VuZXJhdGVfZGFpbHlfcXVvdGUoKSk7XG4gICAgICAgIHRoaXMuc3RhdGljX3RlbXBsYXRlcy5zZXQoXCJyYW5kb21fcGljdHVyZVwiLCB0aGlzLmdlbmVyYXRlX3JhbmRvbV9waWN0dXJlKCkpO1xuICAgICAgICAvL3RoaXMuc3RhdGljX3RlbXBsYXRlcy5zZXQoXCJnZXRfcmVxdWVzdFwiLCB0aGlzLmdlbmVyYXRlX2dldF9yZXF1ZXN0KCkpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyB1cGRhdGVUZW1wbGF0ZXMoKSB7fVxuXG4gICAgYXN5bmMgZ2V0UmVxdWVzdCh1cmw6IHN0cmluZyk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKFwiRXJyb3IgcGVyZm9ybWluZyBHRVQgcmVxdWVzdFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfZGFpbHlfcXVvdGUoKSB7XG4gICAgICAgIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldFJlcXVlc3QoXCJodHRwczovL3F1b3Rlcy5yZXN0L3FvZFwiKTtcbiAgICAgICAgICAgIGxldCBqc29uID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuXG4gICAgICAgICAgICBsZXQgYXV0aG9yID0ganNvbi5jb250ZW50cy5xdW90ZXNbMF0uYXV0aG9yO1xuICAgICAgICAgICAgbGV0IHF1b3RlID0ganNvbi5jb250ZW50cy5xdW90ZXNbMF0ucXVvdGU7XG4gICAgICAgICAgICBsZXQgbmV3X2NvbnRlbnQgPSBgPiAke3F1b3RlfVxcbj4gJm1kYXNoOyA8Y2l0ZT4ke2F1dGhvcn08L2NpdGU+YDtcblxuICAgICAgICAgICAgcmV0dXJuIG5ld19jb250ZW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfcmFuZG9tX3BpY3R1cmUoKSB7XG4gICAgICAgIHJldHVybiBhc3luYyAoc2l6ZTogc3RyaW5nLCBxdWVyeT86IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRSZXF1ZXN0KGBodHRwczovL3NvdXJjZS51bnNwbGFzaC5jb20vcmFuZG9tLyR7c2l6ZSA/PyAnJ30/JHtxdWVyeSA/PyAnJ31gKTtcbiAgICAgICAgICAgIGxldCB1cmwgPSByZXNwb25zZS51cmw7XG4gICAgICAgICAgICByZXR1cm4gYCFbdHAud2ViLnJhbmRvbV9waWN0dXJlXSgke3VybH0pYDsgICBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlX2dldF9yZXF1ZXN0KCkge1xuICAgICAgICByZXR1cm4gYXN5bmMgKHVybDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldFJlcXVlc3QodXJsKTtcbiAgICAgICAgICAgIGxldCBqc29uID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgcmV0dXJuIGpzb247XG4gICAgICAgIH1cbiAgICB9XG59IiwiaW1wb3J0IHsgSW50ZXJuYWxNb2R1bGUgfSBmcm9tIFwiLi4vSW50ZXJuYWxNb2R1bGVcIjtcblxuZXhwb3J0IGNsYXNzIEludGVybmFsTW9kdWxlRnJvbnRtYXR0ZXIgZXh0ZW5kcyBJbnRlcm5hbE1vZHVsZSB7XG4gICAgcHVibGljIG5hbWU6IHN0cmluZyA9IFwiZnJvbnRtYXR0ZXJcIjtcblxuICAgIGFzeW5jIGNyZWF0ZVN0YXRpY1RlbXBsYXRlcygpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgICBhc3luYyB1cGRhdGVUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUodGhpcy5jb25maWcudGFyZ2V0X2ZpbGUpXG4gICAgICAgIHRoaXMuZHluYW1pY190ZW1wbGF0ZXMgPSBuZXcgTWFwKE9iamVjdC5lbnRyaWVzKGNhY2hlPy5mcm9udG1hdHRlciB8fCB7fSkpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBUZW1wbGF0ZXJFcnJvciB9IGZyb20gXCJFcnJvclwiO1xuaW1wb3J0IHsgQXBwLCBNb2RhbCB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgY2xhc3MgUHJvbXB0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcHJpdmF0ZSBwcm9tcHRFbDogSFRNTElucHV0RWxlbWVudDtcbiAgICBwcml2YXRlIHJlc29sdmU6ICh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xuICAgIHByaXZhdGUgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xuICAgIHByaXZhdGUgc3VibWl0dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSBwcm9tcHRfdGV4dDogc3RyaW5nLCBwcml2YXRlIGRlZmF1bHRfdmFsdWU6IHN0cmluZykge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgIH1cblxuICAgIG9uT3BlbigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy5wcm9tcHRfdGV4dCk7XG4gICAgICAgIHRoaXMuY3JlYXRlRm9ybSgpO1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgICAgIGlmICghdGhpcy5zdWJtaXR0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMucmVqZWN0KG5ldyBUZW1wbGF0ZXJFcnJvcihcIkNhbmNlbGxlZCBwcm9tcHRcIikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRm9ybSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGl2ID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGRpdi5hZGRDbGFzcyhcInRlbXBsYXRlci1wcm9tcHQtZGl2XCIpO1xuXG4gICAgICAgIGNvbnN0IGZvcm0gPSBkaXYuY3JlYXRlRWwoXCJmb3JtXCIpO1xuICAgICAgICBmb3JtLmFkZENsYXNzKFwidGVtcGxhdGVyLXByb21wdC1mb3JtXCIpO1xuICAgICAgICBmb3JtLnR5cGUgPSBcInN1Ym1pdFwiO1xuICAgICAgICBmb3JtLm9uc3VibWl0ID0gKGU6IEV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN1Ym1pdHRlZCA9IHRydWU7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnJlc29sdmUodGhpcy5wcm9tcHRFbC52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnByb21wdEVsID0gZm9ybS5jcmVhdGVFbChcImlucHV0XCIpO1xuICAgICAgICB0aGlzLnByb21wdEVsLnR5cGUgPSBcInRleHRcIjtcbiAgICAgICAgdGhpcy5wcm9tcHRFbC5wbGFjZWhvbGRlciA9IFwiVHlwZSB0ZXh0IGhlcmUuLi5cIjtcbiAgICAgICAgdGhpcy5wcm9tcHRFbC52YWx1ZSA9IHRoaXMuZGVmYXVsdF92YWx1ZSA/PyBcIlwiO1xuICAgICAgICB0aGlzLnByb21wdEVsLmFkZENsYXNzKFwidGVtcGxhdGVyLXByb21wdC1pbnB1dFwiKVxuICAgICAgICB0aGlzLnByb21wdEVsLnNlbGVjdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5BbmRHZXRWYWx1ZShyZXNvbHZlOiAodmFsdWU6IHN0cmluZykgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgVGVtcGxhdGVyRXJyb3IgfSBmcm9tIFwiRXJyb3JcIjtcbmltcG9ydCB7IEFwcCwgRnV6enlNYXRjaCwgRnV6enlTdWdnZXN0TW9kYWwgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuXG5leHBvcnQgY2xhc3MgU3VnZ2VzdGVyTW9kYWw8VD4gZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxUPiB7XG4gICAgcHJpdmF0ZSByZXNvbHZlOiAodmFsdWU6IFQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSBzdWJtaXR0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHRleHRfaXRlbXM6IHN0cmluZ1tdIHwgKChpdGVtOiBUKSA9PiBzdHJpbmcpLCBwcml2YXRlIGl0ZW1zOiBUW10pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICB9XG5cbiAgICBnZXRJdGVtcygpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcbiAgICB9XG4gICAgXG4gICAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLnN1Ym1pdHRlZCkge1xuICAgICAgICAgICAgdGhpcy5yZWplY3QobmV3IFRlbXBsYXRlckVycm9yKFwiQ2FuY2VsbGVkIHByb21wdFwiKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3RTdWdnZXN0aW9uKHZhbHVlOiBGdXp6eU1hdGNoPFQ+LCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7XG4gICAgICAgIHRoaXMuc3VibWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB0aGlzLm9uQ2hvb3NlU3VnZ2VzdGlvbih2YWx1ZSwgZXZ0KTtcbiAgICB9XG5cbiAgICBnZXRJdGVtVGV4dChpdGVtOiBUKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHRoaXMudGV4dF9pdGVtcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50ZXh0X2l0ZW1zKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnRleHRfaXRlbXNbdGhpcy5pdGVtcy5pbmRleE9mKGl0ZW0pXSB8fCBcIlVuZGVmaW5lZCBUZXh0IEl0ZW1cIjtcbiAgICB9XG5cbiAgICBvbkNob29zZUl0ZW0oaXRlbTogVCwgX2V2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlKGl0ZW0pO1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5BbmRHZXRWYWx1ZShyZXNvbHZlOiAodmFsdWU6IFQpID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IGFueSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxufSIsImltcG9ydCB7IFVOU1VQUE9SVEVEX01PQklMRV9URU1QTEFURSB9IGZyb20gXCJDb25zdGFudHNcIjtcbmltcG9ydCB7IEludGVybmFsTW9kdWxlIH0gZnJvbSBcIkludGVybmFsVGVtcGxhdGVzL0ludGVybmFsTW9kdWxlXCI7XG5pbXBvcnQgeyBQcm9tcHRNb2RhbCB9IGZyb20gXCIuL1Byb21wdE1vZGFsXCI7XG5pbXBvcnQgeyBTdWdnZXN0ZXJNb2RhbCB9IGZyb20gXCIuL1N1Z2dlc3Rlck1vZGFsXCI7XG5cbmV4cG9ydCBjbGFzcyBJbnRlcm5hbE1vZHVsZVN5c3RlbSBleHRlbmRzIEludGVybmFsTW9kdWxlIHtcbiAgICBwdWJsaWMgbmFtZTogc3RyaW5nID0gXCJzeXN0ZW1cIjtcblxuICAgIGFzeW5jIGNyZWF0ZVN0YXRpY1RlbXBsYXRlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcImNsaXBib2FyZFwiLCB0aGlzLmdlbmVyYXRlX2NsaXBib2FyZCgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInByb21wdFwiLCB0aGlzLmdlbmVyYXRlX3Byb21wdCgpKTtcbiAgICAgICAgdGhpcy5zdGF0aWNfdGVtcGxhdGVzLnNldChcInN1Z2dlc3RlclwiLCB0aGlzLmdlbmVyYXRlX3N1Z2dlc3RlcigpKTtcbiAgICB9XG5cbiAgICBhc3luYyB1cGRhdGVUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gICAgZ2VuZXJhdGVfY2xpcGJvYXJkKCk6IEZ1bmN0aW9uIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIC8vIFRPRE86IEFkZCBtb2JpbGUgc3VwcG9ydFxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgaWYgKHRoaXMuYXBwLmlzTW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVOU1VQUE9SVEVEX01PQklMRV9URU1QTEFURTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLnJlYWRUZXh0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9wcm9tcHQoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gYXN5bmMgKHByb21wdF90ZXh0Pzogc3RyaW5nLCBkZWZhdWx0X3ZhbHVlPzogc3RyaW5nLCB0aHJvd19vbl9jYW5jZWw6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9tcHQgPSBuZXcgUHJvbXB0TW9kYWwodGhpcy5hcHAsIHByb21wdF90ZXh0LCBkZWZhdWx0X3ZhbHVlKTtcbiAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZTogKHZhbHVlOiBzdHJpbmcpID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IGFueSkgPT4gdm9pZCkgPT4gcHJvbXB0Lm9wZW5BbmRHZXRWYWx1ZShyZXNvbHZlLCByZWplY3QpKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRocm93X29uX2NhbmNlbCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9zdWdnZXN0ZXIoKTogRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gYXN5bmMgPFQ+KHRleHRfaXRlbXM6IHN0cmluZ1tdIHwgKChpdGVtOiBUKSA9PiBzdHJpbmcpLCBpdGVtczogVFtdLCB0aHJvd19vbl9jYW5jZWw6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3VnZ2VzdGVyID0gbmV3IFN1Z2dlc3Rlck1vZGFsKHRoaXMuYXBwLCB0ZXh0X2l0ZW1zLCBpdGVtcyk7XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmU6ICh2YWx1ZTogVCkgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkKSA9PiBzdWdnZXN0ZXIub3BlbkFuZEdldFZhbHVlKHJlc29sdmUsIHJlamVjdCkpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgcHJvbWlzZVxuICAgICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgICAgIGlmICh0aHJvd19vbl9jYW5jZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsImltcG9ydCB7IEludGVybmFsTW9kdWxlIH0gZnJvbSBcIkludGVybmFsVGVtcGxhdGVzL0ludGVybmFsTW9kdWxlXCI7XG5pbXBvcnQgeyBSdW5Nb2RlLCBSdW5uaW5nQ29uZmlnIH0gZnJvbSBcIlRlbXBsYXRlclwiO1xuXG5leHBvcnQgY2xhc3MgSW50ZXJuYWxNb2R1bGVDb25maWcgZXh0ZW5kcyBJbnRlcm5hbE1vZHVsZSB7XG4gICAgcHVibGljIG5hbWU6IHN0cmluZyA9IFwiY29uZmlnXCI7XG5cbiAgICBhc3luYyBjcmVhdGVTdGF0aWNUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gICAgYXN5bmMgdXBkYXRlVGVtcGxhdGVzKCk6IFByb21pc2U8dm9pZD4ge31cblxuICAgIGFzeW5jIGdlbmVyYXRlQ29udGV4dChjb25maWc6IFJ1bm5pbmdDb25maWcpOiBQcm9taXNlPHtbeDogc3RyaW5nXTogYW55fT4ge1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBcHAsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbmltcG9ydCBUZW1wbGF0ZXJQbHVnaW4gZnJvbSBcIm1haW5cIjtcbmltcG9ydCB7IFRQYXJzZXIgfSBmcm9tIFwiVFBhcnNlclwiO1xuaW1wb3J0IHsgSW50ZXJuYWxNb2R1bGUgfSBmcm9tIFwiLi9JbnRlcm5hbE1vZHVsZVwiO1xuaW1wb3J0IHsgSW50ZXJuYWxNb2R1bGVEYXRlIH0gZnJvbSBcIi4vZGF0ZS9JbnRlcm5hbE1vZHVsZURhdGVcIjtcbmltcG9ydCB7IEludGVybmFsTW9kdWxlRmlsZSB9IGZyb20gXCIuL2ZpbGUvSW50ZXJuYWxNb2R1bGVGaWxlXCI7XG5pbXBvcnQgeyBJbnRlcm5hbE1vZHVsZVdlYiB9IGZyb20gXCIuL3dlYi9JbnRlcm5hbE1vZHVsZVdlYlwiO1xuaW1wb3J0IHsgSW50ZXJuYWxNb2R1bGVGcm9udG1hdHRlciB9IGZyb20gXCIuL2Zyb250bWF0dGVyL0ludGVybmFsTW9kdWxlRnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IEludGVybmFsTW9kdWxlU3lzdGVtIH0gZnJvbSBcIi4vc3lzdGVtL0ludGVybmFsTW9kdWxlU3lzdGVtXCI7XG5pbXBvcnQgeyBSdW5uaW5nQ29uZmlnIH0gZnJvbSBcIlRlbXBsYXRlclwiO1xuaW1wb3J0IHsgSW50ZXJuYWxNb2R1bGVDb25maWcgfSBmcm9tIFwiLi9jb25maWcvSW50ZXJuYWxNb2R1bGVDb25maWdcIjtcblxuZXhwb3J0IGNsYXNzIEludGVybmFsVGVtcGxhdGVQYXJzZXIgaW1wbGVtZW50cyBUUGFyc2VyIHtcbiAgICBwcml2YXRlIG1vZHVsZXNfYXJyYXk6IEFycmF5PEludGVybmFsTW9kdWxlPiA9IG5ldyBBcnJheSgpO1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGFwcDogQXBwLCBwcm90ZWN0ZWQgcGx1Z2luOiBUZW1wbGF0ZXJQbHVnaW4pIHtcbiAgICAgICAgdGhpcy5tb2R1bGVzX2FycmF5LnB1c2gobmV3IEludGVybmFsTW9kdWxlRGF0ZSh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pKTtcbiAgICAgICAgdGhpcy5tb2R1bGVzX2FycmF5LnB1c2gobmV3IEludGVybmFsTW9kdWxlRmlsZSh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pKTtcbiAgICAgICAgdGhpcy5tb2R1bGVzX2FycmF5LnB1c2gobmV3IEludGVybmFsTW9kdWxlV2ViKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikpO1xuICAgICAgICB0aGlzLm1vZHVsZXNfYXJyYXkucHVzaChuZXcgSW50ZXJuYWxNb2R1bGVGcm9udG1hdHRlcih0aGlzLmFwcCwgdGhpcy5wbHVnaW4pKTtcbiAgICAgICAgdGhpcy5tb2R1bGVzX2FycmF5LnB1c2gobmV3IEludGVybmFsTW9kdWxlU3lzdGVtKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikpO1xuICAgICAgICB0aGlzLm1vZHVsZXNfYXJyYXkucHVzaChuZXcgSW50ZXJuYWxNb2R1bGVDb25maWcodGhpcy5hcHAsIHRoaXMucGx1Z2luKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgZm9yIChjb25zdCBtb2Qgb2YgdGhpcy5tb2R1bGVzX2FycmF5KSB7XG4gICAgICAgICAgICBhd2FpdCBtb2QuaW5pdCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZ2VuZXJhdGVDb250ZXh0KGNvbmZpZzogUnVubmluZ0NvbmZpZyk6IFByb21pc2U8e30+IHtcbiAgICAgICAgY29uc3QgbW9kdWxlc19jb250ZXh0OiB7W2tleTogc3RyaW5nXTogYW55fSA9IHt9O1xuXG4gICAgICAgIGZvciAoY29uc3QgbW9kIG9mIHRoaXMubW9kdWxlc19hcnJheSkge1xuICAgICAgICAgICAgbW9kdWxlc19jb250ZXh0W21vZC5nZXROYW1lKCldID0gYXdhaXQgbW9kLmdlbmVyYXRlQ29udGV4dChjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZHVsZXNfY29udGV4dDtcbiAgICB9XG59IiwiaW1wb3J0IHsgQXBwLCBGaWxlU3lzdGVtQWRhcHRlciwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGV4ZWMgfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSBcInV0aWxcIjtcblxuaW1wb3J0IFRlbXBsYXRlclBsdWdpbiBmcm9tIFwibWFpblwiO1xuaW1wb3J0IHsgQ29udGV4dE1vZGUgfSBmcm9tIFwiVGVtcGxhdGVQYXJzZXJcIjtcbmltcG9ydCB7IFRQYXJzZXIgfSBmcm9tIFwiVFBhcnNlclwiO1xuaW1wb3J0IHsgVU5TVVBQT1JURURfTU9CSUxFX1RFTVBMQVRFIH0gZnJvbSBcIkNvbnN0YW50c1wiO1xuaW1wb3J0IHsgUnVubmluZ0NvbmZpZyB9IGZyb20gXCJUZW1wbGF0ZXJcIjtcbmltcG9ydCB7IGdldFRGaWxlc0Zyb21Gb2xkZXIgfSBmcm9tIFwiVXRpbHNcIjtcbmltcG9ydCB7IFRlbXBsYXRlckVycm9yIH0gZnJvbSBcIkVycm9yXCI7XG5cbmV4cG9ydCBjbGFzcyBVc2VyVGVtcGxhdGVQYXJzZXIgaW1wbGVtZW50cyBUUGFyc2VyIHtcbiAgICBwcml2YXRlIGN3ZDogc3RyaW5nO1xuICAgIHByaXZhdGUgZXhlY19wcm9taXNlOiBGdW5jdGlvbjtcbiAgICBwcml2YXRlIHVzZXJfc3lzdGVtX2NvbW1hbmRfZnVuY3Rpb25zOiBNYXA8c3RyaW5nLCBGdW5jdGlvbj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSB1c2VyX3NjcmlwdF9mdW5jdGlvbnM6IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPiA9IG5ldyBNYXAoKTtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHAsIHByaXZhdGUgcGx1Z2luOiBUZW1wbGF0ZXJQbHVnaW4pIHtcbiAgICAgICAgdGhpcy5zZXR1cCgpOyAgICAgICAgXG4gICAgfVxuXG4gICAgc2V0dXAoKTogdm9pZCB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgaWYgKHRoaXMuYXBwLmlzTW9iaWxlIHx8ICEodGhpcy5hcHAudmF1bHQuYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5jd2QgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jd2QgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldEJhc2VQYXRoKCk7XG4gICAgICAgICAgICB0aGlzLmV4ZWNfcHJvbWlzZSA9IHByb21pc2lmeShleGVjKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gICAgYXN5bmMgZ2VuZXJhdGVfdXNlcl9zY3JpcHRfZnVuY3Rpb25zKGNvbmZpZzogUnVubmluZ0NvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgZmlsZXMgPSBnZXRURmlsZXNGcm9tRm9sZGVyKHRoaXMuYXBwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY3JpcHRfZm9sZGVyKTtcblxuICAgICAgICBmb3IgKGxldCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJqc1wiKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkX3VzZXJfc2NyaXB0X2Z1bmN0aW9uKGNvbmZpZywgZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBsb2FkX3VzZXJfc2NyaXB0X2Z1bmN0aW9uKGNvbmZpZzogUnVubmluZ0NvbmZpZywgZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCEodGhpcy5hcHAudmF1bHQuYWRhcHRlciBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1BZGFwdGVyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKFwiYXBwLnZhdWx0IGlzIG5vdCBhIEZpbGVTeXN0ZW1BZGFwdGVyIGluc3RhbmNlXCIpO1xuICAgICAgICB9XG4gICAgICAgIGxldCB2YXVsdF9wYXRoID0gdGhpcy5hcHAudmF1bHQuYWRhcHRlci5nZXRCYXNlUGF0aCgpO1xuICAgICAgICBsZXQgZmlsZV9wYXRoID0gYCR7dmF1bHRfcGF0aH0vJHtmaWxlLnBhdGh9YDtcblxuICAgICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yNjYzMzkwMS9yZWxvYWQtbW9kdWxlLWF0LXJ1bnRpbWVcbiAgICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTk3MjI0Mi9ob3ctdG8tYXV0by1yZWxvYWQtZmlsZXMtaW4tbm9kZS1qc1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMod2luZG93LnJlcXVpcmUuY2FjaGUpLmNvbnRhaW5zKGZpbGVfcGF0aCkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3cucmVxdWlyZS5jYWNoZVt3aW5kb3cucmVxdWlyZS5yZXNvbHZlKGZpbGVfcGF0aCldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXNlcl9mdW5jdGlvbiA9IGF3YWl0IGltcG9ydChmaWxlX3BhdGgpO1xuICAgICAgICBpZiAoIXVzZXJfZnVuY3Rpb24uZGVmYXVsdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFRlbXBsYXRlckVycm9yKGBGYWlsZWQgdG8gbG9hZCB1c2VyIHNjcmlwdCAke2ZpbGVfcGF0aH0uIE5vIGV4cG9ydHMgZGV0ZWN0ZWQuYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEodXNlcl9mdW5jdGlvbi5kZWZhdWx0IGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVGVtcGxhdGVyRXJyb3IoYEZhaWxlZCB0byBsb2FkIHVzZXIgc2NyaXB0ICR7ZmlsZV9wYXRofS4gRGVmYXVsdCBleHBvcnQgaXMgbm90IGEgZnVuY3Rpb24uYCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51c2VyX3NjcmlwdF9mdW5jdGlvbnMuc2V0KGAke2ZpbGUuYmFzZW5hbWV9YCwgdXNlcl9mdW5jdGlvbi5kZWZhdWx0KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBBZGQgbW9iaWxlIHN1cHBvcnRcbiAgICBhc3luYyBnZW5lcmF0ZV9zeXN0ZW1fY29tbWFuZF91c2VyX2Z1bmN0aW9ucyhjb25maWc6IFJ1bm5pbmdDb25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHRoaXMucGx1Z2luLnRlbXBsYXRlci5wYXJzZXIuZ2VuZXJhdGVDb250ZXh0KGNvbmZpZywgQ29udGV4dE1vZGUuSU5URVJOQUwpO1xuXG4gICAgICAgIGZvciAobGV0IFt0ZW1wbGF0ZSwgY21kXSBvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50ZW1wbGF0ZXNfcGFpcnMpIHtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gXCJcIiB8fCBjbWQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgaWYgKHRoaXMuYXBwLmlzTW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51c2VyX3N5c3RlbV9jb21tYW5kX2Z1bmN0aW9ucy5zZXQodGVtcGxhdGUsICh1c2VyX2FyZ3M/OiBhbnkpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVU5TVVBQT1JURURfTU9CSUxFX1RFTVBMQVRFO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbWQgPSBhd2FpdCB0aGlzLnBsdWdpbi50ZW1wbGF0ZXIucGFyc2VyLnBhcnNlVGVtcGxhdGVzKGNtZCwgY29udGV4dCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnVzZXJfc3lzdGVtX2NvbW1hbmRfZnVuY3Rpb25zLnNldCh0ZW1wbGF0ZSwgYXN5bmMgKHVzZXJfYXJncz86IGFueSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NfZW52ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi51c2VyX2FyZ3MsXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY21kX29wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21tYW5kX3RpbWVvdXQgKiAxMDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3dkOiB0aGlzLmN3ZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudjogcHJvY2Vzc19lbnYsXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hlbGxfcGF0aCAhPT0gXCJcIiAmJiB7c2hlbGw6IHRoaXMucGx1Z2luLnNldHRpbmdzLnNoZWxsX3BhdGh9KSxcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge3N0ZG91dH0gPSBhd2FpdCB0aGlzLmV4ZWNfcHJvbWlzZShjbWQsIGNtZF9vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGRvdXQudHJpbVJpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUZW1wbGF0ZXJFcnJvcihgRXJyb3Igd2l0aCBVc2VyIFRlbXBsYXRlICR7dGVtcGxhdGV9YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZW5lcmF0ZUNvbnRleHQoY29uZmlnOiBSdW5uaW5nQ29uZmlnKTogUHJvbWlzZTx7fT4ge1xuICAgICAgICB0aGlzLnVzZXJfc3lzdGVtX2NvbW1hbmRfZnVuY3Rpb25zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMudXNlcl9zY3JpcHRfZnVuY3Rpb25zLmNsZWFyKCk7XG5cbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZV9zeXN0ZW1fY29tbWFuZHMpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ2VuZXJhdGVfc3lzdGVtX2NvbW1hbmRfdXNlcl9mdW5jdGlvbnMoY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBBZGQgbW9iaWxlIHN1cHBvcnRcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoIXRoaXMuYXBwLmlzTW9iaWxlICYmIHRoaXMucGx1Z2luLnNldHRpbmdzLnNjcmlwdF9mb2xkZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ2VuZXJhdGVfdXNlcl9zY3JpcHRfZnVuY3Rpb25zKGNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMudXNlcl9zeXN0ZW1fY29tbWFuZF9mdW5jdGlvbnMpLFxuICAgICAgICAgICAgLi4uT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMudXNlcl9zY3JpcHRfZnVuY3Rpb25zKSxcbiAgICAgICAgfTtcbiAgICB9XG59IiwiaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgKiBhcyBFdGEgZnJvbSBcImV0YVwiO1xuXG5pbXBvcnQgeyBJbnRlcm5hbFRlbXBsYXRlUGFyc2VyIH0gZnJvbSBcIi4vSW50ZXJuYWxUZW1wbGF0ZXMvSW50ZXJuYWxUZW1wbGF0ZVBhcnNlclwiO1xuaW1wb3J0IFRlbXBsYXRlclBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBVc2VyVGVtcGxhdGVQYXJzZXIgfSBmcm9tIFwiLi9Vc2VyVGVtcGxhdGVzL1VzZXJUZW1wbGF0ZVBhcnNlclwiO1xuaW1wb3J0IHsgVFBhcnNlciB9IGZyb20gXCJUUGFyc2VyXCI7XG5pbXBvcnQgeyBvYnNpZGlhbl9tb2R1bGUgfSBmcm9tIFwiVXRpbHNcIjtcbmltcG9ydCB7IFJ1bm5pbmdDb25maWcgfSBmcm9tIFwiVGVtcGxhdGVyXCI7XG5cbmV4cG9ydCBlbnVtIENvbnRleHRNb2RlIHtcbiAgICBJTlRFUk5BTCxcbiAgICBVU0VSX0lOVEVSTkFMLFxufTtcblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUGFyc2VyIGltcGxlbWVudHMgVFBhcnNlciB7XG4gICAgcHVibGljIGludGVybmFsVGVtcGxhdGVQYXJzZXI6IEludGVybmFsVGVtcGxhdGVQYXJzZXI7XG5cdHB1YmxpYyB1c2VyVGVtcGxhdGVQYXJzZXI6IFVzZXJUZW1wbGF0ZVBhcnNlcjtcbiAgICBwdWJsaWMgY3VycmVudF9jb250ZXh0OiB7fTtcbiAgICBcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFwcDogQXBwLCBwcml2YXRlIHBsdWdpbjogVGVtcGxhdGVyUGx1Z2luKSB7XG4gICAgICAgIHRoaXMuaW50ZXJuYWxUZW1wbGF0ZVBhcnNlciA9IG5ldyBJbnRlcm5hbFRlbXBsYXRlUGFyc2VyKHRoaXMuYXBwLCB0aGlzLnBsdWdpbik7XG4gICAgICAgIHRoaXMudXNlclRlbXBsYXRlUGFyc2VyID0gbmV3IFVzZXJUZW1wbGF0ZVBhcnNlcih0aGlzLmFwcCwgdGhpcy5wbHVnaW4pO1xuICAgIH1cblxuICAgIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW50ZXJuYWxUZW1wbGF0ZVBhcnNlci5pbml0KCk7XG4gICAgICAgIGF3YWl0IHRoaXMudXNlclRlbXBsYXRlUGFyc2VyLmluaXQoKTtcbiAgICB9XG5cbiAgICBhc3luYyBzZXRDdXJyZW50Q29udGV4dChjb25maWc6IFJ1bm5pbmdDb25maWcsIGNvbnRleHRfbW9kZTogQ29udGV4dE1vZGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5jdXJyZW50X2NvbnRleHQgPSBhd2FpdCB0aGlzLmdlbmVyYXRlQ29udGV4dChjb25maWcsIGNvbnRleHRfbW9kZSk7XG4gICAgfVxuXG4gICAgYWRkaXRpb25hbENvbnRleHQoKToge30ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb2JzaWRpYW46IG9ic2lkaWFuX21vZHVsZSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5lcmF0ZUNvbnRleHQoY29uZmlnOiBSdW5uaW5nQ29uZmlnLCBjb250ZXh0X21vZGU6IENvbnRleHRNb2RlID0gQ29udGV4dE1vZGUuVVNFUl9JTlRFUk5BTCk6IFByb21pc2U8e30+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHt9O1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsX2NvbnRleHQgPSB0aGlzLmFkZGl0aW9uYWxDb250ZXh0KCk7XG4gICAgICAgIGNvbnN0IGludGVybmFsX2NvbnRleHQgPSBhd2FpdCB0aGlzLmludGVybmFsVGVtcGxhdGVQYXJzZXIuZ2VuZXJhdGVDb250ZXh0KGNvbmZpZyk7XG4gICAgICAgIGxldCB1c2VyX2NvbnRleHQgPSB7fTtcblxuICAgICAgICBpZiAoIXRoaXMuY3VycmVudF9jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgc3lzdGVtIGNvbW1hbmQgaXMgdXNpbmcgdHAuZmlsZS5pbmNsdWRlLCB3ZSBuZWVkIHRoZSBjb250ZXh0IHRvIGJlIHNldC5cbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9jb250ZXh0ID0gaW50ZXJuYWxfY29udGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oY29udGV4dCwgYWRkaXRpb25hbF9jb250ZXh0KTtcbiAgICAgICAgc3dpdGNoIChjb250ZXh0X21vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgQ29udGV4dE1vZGUuSU5URVJOQUw6XG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjb250ZXh0LCBpbnRlcm5hbF9jb250ZXh0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgQ29udGV4dE1vZGUuVVNFUl9JTlRFUk5BTDpcbiAgICAgICAgICAgICAgICB1c2VyX2NvbnRleHQgPSBhd2FpdCB0aGlzLnVzZXJUZW1wbGF0ZVBhcnNlci5nZW5lcmF0ZUNvbnRleHQoY29uZmlnKTtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGNvbnRleHQsIHtcbiAgICAgICAgICAgICAgICAgICAgLi4uaW50ZXJuYWxfY29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgdXNlcjogdXNlcl9jb250ZXh0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgYXN5bmMgcGFyc2VUZW1wbGF0ZXMoY29udGVudDogc3RyaW5nLCBjb250ZXh0PzogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5jdXJyZW50X2NvbnRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50ID0gYXdhaXQgRXRhLnJlbmRlckFzeW5jKGNvbnRlbnQsIGNvbnRleHQsIHtcbiAgICAgICAgICAgIHZhck5hbWU6IFwidHBcIixcbiAgICAgICAgICAgIHBhcnNlOiB7XG4gICAgICAgICAgICAgICAgZXhlYzogXCIqXCIsXG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGU6IFwiflwiLFxuICAgICAgICAgICAgICAgIHJhdzogXCJcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhdXRvVHJpbTogZmFsc2UsXG4gICAgICAgICAgICBnbG9iYWxBd2FpdDogdHJ1ZSxcbiAgICAgICAgfSkgYXMgc3RyaW5nO1xuXG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBcHAsIE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQsIE1hcmtkb3duVmlldywgVEZpbGUsIFRGb2xkZXIgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuaW1wb3J0IHsgQ3Vyc29ySnVtcGVyIH0gZnJvbSBcIkN1cnNvckp1bXBlclwiO1xuaW1wb3J0IFRlbXBsYXRlclBsdWdpbiBmcm9tIFwibWFpblwiO1xuaW1wb3J0IHsgQ29udGV4dE1vZGUsIFRlbXBsYXRlUGFyc2VyIH0gZnJvbSBcIlRlbXBsYXRlUGFyc2VyXCI7XG5pbXBvcnQgeyBUZW1wbGF0ZXJFcnJvciB9IGZyb20gXCJFcnJvclwiO1xuXG5leHBvcnQgZW51bSBSdW5Nb2RlIHtcbiAgICBDcmVhdGVOZXdGcm9tVGVtcGxhdGUsXG4gICAgQXBwZW5kQWN0aXZlRmlsZSxcbiAgICBPdmVyd3JpdGVGaWxlLFxuICAgIE92ZXJ3cml0ZUFjdGl2ZUZpbGUsXG4gICAgRHluYW1pY1Byb2Nlc3Nvcixcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVubmluZ0NvbmZpZyB7XG4gICAgdGVtcGxhdGVfZmlsZTogVEZpbGUsXG4gICAgdGFyZ2V0X2ZpbGU6IFRGaWxlLFxuICAgIHJ1bl9tb2RlOiBSdW5Nb2RlLFxufTtcblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlciB7XG4gICAgcHVibGljIHBhcnNlcjogVGVtcGxhdGVQYXJzZXI7XG4gICAgcHVibGljIGN1cnNvcl9qdW1wZXI6IEN1cnNvckp1bXBlcjtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHAsIHByaXZhdGUgcGx1Z2luOiBUZW1wbGF0ZXJQbHVnaW4pIHtcbiAgICAgICAgdGhpcy5jdXJzb3JfanVtcGVyID0gbmV3IEN1cnNvckp1bXBlcih0aGlzLmFwcCk7XG5cdFx0dGhpcy5wYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIodGhpcy5hcHAsIHRoaXMucGx1Z2luKTtcbiAgICB9XG5cbiAgICBhc3luYyBzZXR1cCgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5wYXJzZXIuaW5pdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIGVycm9yV3JhcHBlcihmbjogRnVuY3Rpb24pOiBQcm9taXNlPGFueT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGZuKCk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFRlbXBsYXRlckVycm9yKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmxvZ19lcnJvcihuZXcgVGVtcGxhdGVyRXJyb3IoYFRlbXBsYXRlIHBhcnNpbmcgZXJyb3IsIGFib3J0aW5nLmAsIGUubWVzc2FnZSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5sb2dfZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNyZWF0ZV9ydW5uaW5nX2NvbmZpZyh0ZW1wbGF0ZV9maWxlOiBURmlsZSwgdGFyZ2V0X2ZpbGU6IFRGaWxlLCBydW5fbW9kZTogUnVuTW9kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGVtcGxhdGVfZmlsZTogdGVtcGxhdGVfZmlsZSxcbiAgICAgICAgICAgIHRhcmdldF9maWxlOiB0YXJnZXRfZmlsZSxcbiAgICAgICAgICAgIHJ1bl9tb2RlOiBydW5fbW9kZSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlYWRfYW5kX3BhcnNlX3RlbXBsYXRlKGNvbmZpZzogUnVubmluZ0NvbmZpZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlX2NvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGNvbmZpZy50ZW1wbGF0ZV9maWxlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wYXJzZXIuc2V0Q3VycmVudENvbnRleHQoY29uZmlnLCBDb250ZXh0TW9kZS5VU0VSX0lOVEVSTkFMKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMucGFyc2VyLnBhcnNlVGVtcGxhdGVzKHRlbXBsYXRlX2NvbnRlbnQpO1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVfbmV3X25vdGVfZnJvbV90ZW1wbGF0ZSh0ZW1wbGF0ZV9maWxlOiBURmlsZSwgZm9sZGVyPzogVEZvbGRlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgZm9sZGVyID0gdGhpcy5hcHAuZmlsZU1hbmFnZXIuZ2V0TmV3RmlsZVBhcmVudChcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBDaGFuZ2UgdGhhdCwgbm90IHN0YWJsZSBhdG1cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBjb25zdCBjcmVhdGVkX25vdGUgPSBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5jcmVhdGVOZXdNYXJrZG93bkZpbGUoZm9sZGVyLCBcIlVudGl0bGVkXCIpO1xuXG4gICAgICAgIGNvbnN0IHJ1bm5pbmdfY29uZmlnID0gdGhpcy5jcmVhdGVfcnVubmluZ19jb25maWcodGVtcGxhdGVfZmlsZSwgY3JlYXRlZF9ub3RlLCBSdW5Nb2RlLkNyZWF0ZU5ld0Zyb21UZW1wbGF0ZSk7XG5cbiAgICAgICAgY29uc3Qgb3V0cHV0X2NvbnRlbnQgPSBhd2FpdCB0aGlzLmVycm9yV3JhcHBlcihhc3luYyAoKSA9PiB0aGlzLnJlYWRfYW5kX3BhcnNlX3RlbXBsYXRlKHJ1bm5pbmdfY29uZmlnKSk7XG4gICAgICAgIGlmICghb3V0cHV0X2NvbnRlbnQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShjcmVhdGVkX25vdGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShjcmVhdGVkX25vdGUsIG91dHB1dF9jb250ZW50KTtcblxuICAgICAgICBjb25zdCBhY3RpdmVfbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmO1xuICAgICAgICBpZiAoIWFjdGl2ZV9sZWFmKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5sb2dfZXJyb3IobmV3IFRlbXBsYXRlckVycm9yKFwiTm8gYWN0aXZlIGxlYWZcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGFjdGl2ZV9sZWFmLm9wZW5GaWxlKGNyZWF0ZWRfbm90ZSwge3N0YXRlOiB7bW9kZTogJ3NvdXJjZSd9LCBlU3RhdGU6IHtyZW5hbWU6ICdhbGwnfX0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuY3Vyc29yX2p1bXBlci5qdW1wX3RvX25leHRfY3Vyc29yX2xvY2F0aW9uKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYXBwZW5kX3RlbXBsYXRlKHRlbXBsYXRlX2ZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGFjdGl2ZV92aWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICAgICAgaWYgKGFjdGl2ZV92aWV3ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5sb2dfZXJyb3IobmV3IFRlbXBsYXRlckVycm9yKFwiTm8gYWN0aXZlIHZpZXcsIGNhbid0IGFwcGVuZCB0ZW1wbGF0ZXMuXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBydW5uaW5nX2NvbmZpZyA9IHRoaXMuY3JlYXRlX3J1bm5pbmdfY29uZmlnKHRlbXBsYXRlX2ZpbGUsIGFjdGl2ZV92aWV3LmZpbGUsIFJ1bk1vZGUuQXBwZW5kQWN0aXZlRmlsZSk7XG4gICAgICAgIGNvbnN0IG91dHB1dF9jb250ZW50ID0gYXdhaXQgdGhpcy5lcnJvcldyYXBwZXIoYXN5bmMgKCkgPT4gdGhpcy5yZWFkX2FuZF9wYXJzZV90ZW1wbGF0ZShydW5uaW5nX2NvbmZpZykpO1xuICAgICAgICBpZiAoIW91dHB1dF9jb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlZGl0b3IgPSBhY3RpdmVfdmlldy5lZGl0b3I7XG4gICAgICAgIGNvbnN0IGRvYyA9IGVkaXRvci5nZXREb2MoKTtcbiAgICAgICAgZG9jLnJlcGxhY2VTZWxlY3Rpb24ob3V0cHV0X2NvbnRlbnQpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuY3Vyc29yX2p1bXBlci5qdW1wX3RvX25leHRfY3Vyc29yX2xvY2F0aW9uKCk7XG4gICAgfVxuXG4gICAgb3ZlcndyaXRlX2FjdGl2ZV9maWxlX3RlbXBsYXRlcygpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgYWN0aXZlX3ZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgICAgICBpZiAoYWN0aXZlX3ZpZXcgPT09IG51bGwpIHtcblx0XHRcdHRoaXMucGx1Z2luLmxvZ19lcnJvcihuZXcgVGVtcGxhdGVyRXJyb3IoXCJBY3RpdmUgdmlldyBpcyBudWxsLCBjYW4ndCBvdmVyd3JpdGUgY29udGVudFwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vdmVyd3JpdGVfZmlsZV90ZW1wbGF0ZXMoYWN0aXZlX3ZpZXcuZmlsZSwgdHJ1ZSk7XG5cdH1cblxuICAgIGFzeW5jIG92ZXJ3cml0ZV9maWxlX3RlbXBsYXRlcyhmaWxlOiBURmlsZSwgYWN0aXZlX2ZpbGU6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBydW5uaW5nX2NvbmZpZyA9IHRoaXMuY3JlYXRlX3J1bm5pbmdfY29uZmlnKGZpbGUsIGZpbGUsIGFjdGl2ZV9maWxlID8gUnVuTW9kZS5PdmVyd3JpdGVBY3RpdmVGaWxlIDogUnVuTW9kZS5PdmVyd3JpdGVGaWxlKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0X2NvbnRlbnQgPSBhd2FpdCB0aGlzLmVycm9yV3JhcHBlcihhc3luYyAoKSA9PiB0aGlzLnJlYWRfYW5kX3BhcnNlX3RlbXBsYXRlKHJ1bm5pbmdfY29uZmlnKSk7XG4gICAgICAgIGlmICghb3V0cHV0X2NvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgb3V0cHV0X2NvbnRlbnQpO1xuICAgICAgICBpZiAodGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKSA9PT0gZmlsZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jdXJzb3JfanVtcGVyLmp1bXBfdG9fbmV4dF9jdXJzb3JfbG9jYXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHByb2Nlc3NfZHluYW1pY190ZW1wbGF0ZXMoZWw6IEhUTUxFbGVtZW50LCBjdHg6IE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgZHluYW1pY19jb21tYW5kX3JlZ2V4OiBSZWdFeHAgPSAvKDwlWyp+XXswLDF9KVxcKyguKiU+KS9nO1xuXG5cdFx0bGV0IGNvbnRlbnQgPSBlbC5pbm5lclRleHQ7XG4gICAgICAgIGxldCBtYXRjaDtcbiAgICAgICAgaWYgKChtYXRjaCA9IGR5bmFtaWNfY29tbWFuZF9yZWdleC5leGVjKGNvbnRlbnQpKSAhPSBudWxsKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaXJzdExpbmtwYXRoRGVzdChcIlwiLCBjdHguc291cmNlUGF0aCk7XG5cdFx0XHRpZiAoIWZpbGUgfHwgIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cbiAgICAgICAgICAgIGNvbnN0IHJ1bm5pbmdfY29uZmlnID0gdGhpcy5jcmVhdGVfcnVubmluZ19jb25maWcoZmlsZSwgZmlsZSwgUnVuTW9kZS5EeW5hbWljUHJvY2Vzc29yKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGFyc2VyLnNldEN1cnJlbnRDb250ZXh0KHJ1bm5pbmdfY29uZmlnLCBDb250ZXh0TW9kZS5VU0VSX0lOVEVSTkFMKTtcblxuICAgICAgICAgICAgd2hpbGUgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBOb3QgdGhlIG1vc3QgZWZmaWNpZW50IHdheSB0byBleGNsdWRlIHRoZSAnKycgZnJvbSB0aGUgY29tbWFuZCBidXQgSSBjb3VsZG4ndCBmaW5kIHNvbWV0aGluZyBiZXR0ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wbGV0ZV9jb21tYW5kID0gbWF0Y2hbMV0gKyBtYXRjaFsyXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21tYW5kX291dHB1dDogc3RyaW5nID0gYXdhaXQgdGhpcy5lcnJvcldyYXBwZXIoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5wYXJzZXIucGFyc2VUZW1wbGF0ZXMoY29tcGxldGVfY29tbWFuZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21tYW5kX291dHB1dCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBzdGFydCA9IGR5bmFtaWNfY29tbWFuZF9yZWdleC5sYXN0SW5kZXggLSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbGV0IGVuZCA9IGR5bmFtaWNfY29tbWFuZF9yZWdleC5sYXN0SW5kZXg7XG4gICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQuc3Vic3RyaW5nKDAsIHN0YXJ0KSArIGNvbW1hbmRfb3V0cHV0ICsgY29udGVudC5zdWJzdHJpbmcoZW5kKTtcblxuICAgICAgICAgICAgICAgIGR5bmFtaWNfY29tbWFuZF9yZWdleC5sYXN0SW5kZXggKz0gKGNvbW1hbmRfb3V0cHV0Lmxlbmd0aCAtIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSBkeW5hbWljX2NvbW1hbmRfcmVnZXguZXhlYyhjb250ZW50KTtcbiAgICAgICAgICAgIH1cblx0XHRcdGVsLmlubmVyVGV4dCA9IGNvbnRlbnQ7XG5cdFx0fVxuXHR9XG59IiwiaW1wb3J0IHsgYWRkSWNvbiwgRXZlbnRSZWYsIE1lbnUsIE1lbnVJdGVtLCBOb3RpY2UsIFBsdWdpbiwgVEFic3RyYWN0RmlsZSwgVEZpbGUsIFRGb2xkZXIgfSBmcm9tICdvYnNpZGlhbic7XHJcblxyXG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBUZW1wbGF0ZXJTZXR0aW5ncywgVGVtcGxhdGVyU2V0dGluZ1RhYiB9IGZyb20gJ1NldHRpbmdzJztcclxuaW1wb3J0IHsgVGVtcGxhdGVyRnV6enlTdWdnZXN0TW9kYWwgfSBmcm9tICdUZW1wbGF0ZXJGdXp6eVN1Z2dlc3QnO1xyXG5pbXBvcnQgeyBJQ09OX0RBVEEgfSBmcm9tICdDb25zdGFudHMnO1xyXG5pbXBvcnQgeyBkZWxheSB9IGZyb20gJ1V0aWxzJztcclxuaW1wb3J0IHsgVGVtcGxhdGVyIH0gZnJvbSAnVGVtcGxhdGVyJztcclxuaW1wb3J0IHsgVGVtcGxhdGVyRXJyb3IgfSBmcm9tICdFcnJvcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZW1wbGF0ZXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG5cdHB1YmxpYyBzZXR0aW5nczogVGVtcGxhdGVyU2V0dGluZ3M7IFxyXG5cdHB1YmxpYyB0ZW1wbGF0ZXI6IFRlbXBsYXRlcjtcclxuXHRwcml2YXRlIGZ1enp5U3VnZ2VzdDogVGVtcGxhdGVyRnV6enlTdWdnZXN0TW9kYWw7XHJcblx0cHJpdmF0ZSB0cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb25fZXZlbnQ6IEV2ZW50UmVmO1xyXG5cclxuXHRhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG5cclxuXHRcdHRoaXMudGVtcGxhdGVyID0gbmV3IFRlbXBsYXRlcih0aGlzLmFwcCwgdGhpcyk7XHJcblx0XHRhd2FpdCB0aGlzLnRlbXBsYXRlci5zZXR1cCgpO1xyXG5cclxuXHRcdHRoaXMuZnV6enlTdWdnZXN0ID0gbmV3IFRlbXBsYXRlckZ1enp5U3VnZ2VzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyTWFya2Rvd25Qb3N0UHJvY2Vzc29yKChlbCwgY3R4KSA9PiB0aGlzLnRlbXBsYXRlci5wcm9jZXNzX2R5bmFtaWNfdGVtcGxhdGVzKGVsLCBjdHgpKTtcclxuXHJcblx0XHRhZGRJY29uKFwidGVtcGxhdGVyLWljb25cIiwgSUNPTl9EQVRBKTtcclxuXHRcdHRoaXMuYWRkUmliYm9uSWNvbigndGVtcGxhdGVyLWljb24nLCAnVGVtcGxhdGVyJywgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmZ1enp5U3VnZ2VzdC5pbnNlcnRfdGVtcGxhdGUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiBcImluc2VydC10ZW1wbGF0ZXJcIixcclxuXHRcdFx0bmFtZTogXCJJbnNlcnQgVGVtcGxhdGVcIixcclxuXHRcdFx0aG90a2V5czogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG1vZGlmaWVyczogW1wiQWx0XCJdLFxyXG5cdFx0XHRcdFx0a2V5OiAnZScsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XSxcclxuXHRcdFx0Y2FsbGJhY2s6ICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmZ1enp5U3VnZ2VzdC5pbnNlcnRfdGVtcGxhdGUoKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiBcInJlcGxhY2UtaW4tZmlsZS10ZW1wbGF0ZXJcIixcclxuICAgICAgICAgICAgbmFtZTogXCJSZXBsYWNlIHRlbXBsYXRlcyBpbiB0aGUgYWN0aXZlIGZpbGVcIixcclxuICAgICAgICAgICAgaG90a2V5czogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVyczogW1wiQWx0XCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIGtleTogJ3InLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRlbXBsYXRlci5vdmVyd3JpdGVfYWN0aXZlX2ZpbGVfdGVtcGxhdGVzKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcblxyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwianVtcC10by1uZXh0LWN1cnNvci1sb2NhdGlvblwiLFxyXG5cdFx0XHRuYW1lOiBcIkp1bXAgdG8gbmV4dCBjdXJzb3IgbG9jYXRpb25cIixcclxuXHRcdFx0aG90a2V5czogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG1vZGlmaWVyczogW1wiQWx0XCJdLFxyXG5cdFx0XHRcdFx0a2V5OiBcIlRhYlwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50ZW1wbGF0ZXIuY3Vyc29yX2p1bXBlci5qdW1wX3RvX25leHRfY3Vyc29yX2xvY2F0aW9uKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiBcImNyZWF0ZS1uZXctbm90ZS1mcm9tLXRlbXBsYXRlXCIsXHJcblx0XHRcdG5hbWU6IFwiQ3JlYXRlIG5ldyBub3RlIGZyb20gdGVtcGxhdGVcIixcclxuXHRcdFx0aG90a2V5czogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG1vZGlmaWVyczogW1wiQWx0XCJdLFxyXG5cdFx0XHRcdFx0a2V5OiBcIm5cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRjYWxsYmFjazogKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZnV6enlTdWdnZXN0LmNyZWF0ZV9uZXdfbm90ZV9mcm9tX3RlbXBsYXRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcclxuXHRcdFx0Ly8gVE9ET1xyXG5cdFx0XHQvL3RoaXMucmVnaXN0ZXJDb2RlTWlycm9yTW9kZSgpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZV90cmlnZ2VyX2ZpbGVfb25fY3JlYXRpb24oKTtcdFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlLW1lbnVcIiwgKG1lbnU6IE1lbnUsIGZpbGU6IFRGaWxlKSA9PiB7XHJcblx0XHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XHJcblx0XHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW06IE1lbnVJdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUoXCJDcmVhdGUgbmV3IG5vdGUgZnJvbSB0ZW1wbGF0ZVwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwidGVtcGxhdGVyLWljb25cIilcclxuXHRcdFx0XHRcdFx0XHQub25DbGljayhldnQgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5mdXp6eVN1Z2dlc3QuY3JlYXRlX25ld19ub3RlX2Zyb21fdGVtcGxhdGUoZmlsZSk7XHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBUZW1wbGF0ZXJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XHJcblx0fVx0XHJcblxyXG5cdHVwZGF0ZV90cmlnZ2VyX2ZpbGVfb25fY3JlYXRpb24oKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy50cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb24pIHtcclxuXHRcdFx0dGhpcy50cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb25fZXZlbnQgPSB0aGlzLmFwcC52YXVsdC5vbihcImNyZWF0ZVwiLCBhc3luYyAoZmlsZTogVEFic3RyYWN0RmlsZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiVFJJR0dFUkVEIFRSSUdHRVJFRFwiKTtcclxuXHRcdFx0XHQvLyBUT0RPOiBmaW5kIGEgYmV0dGVyIHdheSB0byBkbyB0aGlzXHJcblx0XHRcdFx0Ly8gQ3VycmVudGx5LCBJIGhhdmUgdG8gd2FpdCBmb3IgdGhlIGRhaWx5IG5vdGUgcGx1Z2luIHRvIGFkZCB0aGUgZmlsZSBjb250ZW50IGJlZm9yZSByZXBsYWNpbmdcclxuXHRcdFx0XHQvLyBOb3QgYSBwcm9ibGVtIHdpdGggQ2FsZW5kYXIgaG93ZXZlciBzaW5jZSBpdCBjcmVhdGVzIHRoZSBmaWxlIHdpdGggdGhlIGV4aXN0aW5nIGNvbnRlbnRcclxuXHRcdFx0XHRhd2FpdCBkZWxheSgzMDApO1xyXG5cdFx0XHRcdGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkgfHwgZmlsZS5leHRlbnNpb24gIT09IFwibWRcIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLnRlbXBsYXRlci5vdmVyd3JpdGVfZmlsZV90ZW1wbGF0ZXMoZmlsZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb25fZXZlbnRcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRpZiAodGhpcy50cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb25fZXZlbnQpIHtcclxuXHRcdFx0XHR0aGlzLmFwcC52YXVsdC5vZmZyZWYodGhpcy50cmlnZ2VyX29uX2ZpbGVfY3JlYXRpb25fZXZlbnQpO1xyXG5cdFx0XHRcdHRoaXMudHJpZ2dlcl9vbl9maWxlX2NyZWF0aW9uX2V2ZW50ID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRsb2dfdXBkYXRlKG1zZzogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBub3RpY2UgPSBuZXcgTm90aWNlKFwiXCIsIDE1MDAwKTtcclxuXHRcdC8vIFRPRE86IEZpbmQgYmV0dGVyIHdheSBmb3IgdGhpc1xyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0bm90aWNlLm5vdGljZUVsLmlubmVySFRNTCA9IGA8Yj5UZW1wbGF0ZXIgdXBkYXRlPC9iPjo8YnIvPiR7bXNnfWA7XHJcblx0fVxyXG5cclxuXHRsb2dfZXJyb3IoZTogRXJyb3IgfCBUZW1wbGF0ZXJFcnJvcik6IHZvaWQge1xyXG5cdFx0Y29uc3Qgbm90aWNlID0gbmV3IE5vdGljZShcIlwiLCA4MDAwKTtcclxuXHRcdGlmIChlIGluc3RhbmNlb2YgVGVtcGxhdGVyRXJyb3IgJiYgZS5jb25zb2xlX21zZykge1xyXG5cdFx0XHQvLyBUT0RPOiBGaW5kIGEgYmV0dGVyIHdheSBmb3IgdGhpc1xyXG5cdFx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRcdG5vdGljZS5ub3RpY2VFbC5pbm5lckhUTUwgPSBgPGI+VGVtcGxhdGVyIEVycm9yPC9iPjo8YnIvPiR7ZS5tZXNzYWdlfTxici8+Q2hlY2sgY29uc29sZSBmb3IgbW9yZSBpbmZvcm1hdGlvbnNgO1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZS5jb25zb2xlX21zZyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0XHRub3RpY2Uubm90aWNlRWwuaW5uZXJIVE1MID0gYDxiPlRlbXBsYXRlciBFcnJvcjwvYj46PGJyLz4ke2UubWVzc2FnZX1gO1xyXG5cdFx0fVxyXG5cdH1cdFxyXG5cclxuXHQvKlxyXG5cdC8vIFRPRE9cclxuXHRyZWdpc3RlckNvZGVNaXJyb3JNb2RlKCkge1xyXG5cdFx0Ly8gaHR0cHM6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjbW9kZWFwaVxyXG5cdFx0Ly8gY20tZWRpdG9yLXN5bnRheC1oaWdobGlnaHQtb2JzaWRpYW4gcGx1Z2luXHJcblx0XHQvLyBodHRwczovL2NvZGVtaXJyb3IubmV0L21vZGUvZGlmZi9kaWZmLmpzXHJcblx0XHQvLyBodHRwczovL21hcmlqbmhhdmVyYmVrZS5ubC9ibG9nL2NvZGVtaXJyb3ItbW9kZS1zeXN0ZW0uaHRtbFxyXG5cclxuXHRcdGNvbnN0IGh5cGVybWRfbW9kZSA9IHdpbmRvdy5Db2RlTWlycm9yLmdldE1vZGUoe30sIFwiaHlwZXJtZFwiKTtcclxuXHRcdGNvbnN0IGphdmFzY3JpcHRfbW9kZSA9IHdpbmRvdy5Db2RlTWlycm9yLmdldE1vZGUoe30sIFwiamF2YXNjcmlwdFwiKTtcclxuXHJcblx0XHR3aW5kb3cuQ29kZU1pcnJvci5leHRlbmRNb2RlKFwiaHlwZXJtZFwiLCB7XHJcblx0XHRcdHN0YXJ0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGNvbnN0IGh5cGVybWRfc3RhdGUgPSB3aW5kb3cuQ29kZU1pcnJvci5zdGFydFN0YXRlKGh5cGVybWRfbW9kZSk7XHJcblx0XHRcdFx0Y29uc3QganNfc3RhdGUgPSBqYXZhc2NyaXB0X21vZGUgPyB3aW5kb3cuQ29kZU1pcnJvci5zdGFydFN0YXRlKGphdmFzY3JpcHRfbW9kZSk6IHt9O1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHQuLi5oeXBlcm1kX3N0YXRlLFxyXG5cdFx0XHRcdFx0Li4uanNfc3RhdGUsXHJcblx0XHRcdFx0XHRpbkNvbW1hbmQ6IGZhbHNlXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29weVN0YXRlOiBmdW5jdGlvbihzdGF0ZSkge1xyXG5cdFx0XHRcdGNvbnN0IGh5cGVybWRfc3RhdGU6IHt9ID0gaHlwZXJtZF9tb2RlLmNvcHlTdGF0ZShzdGF0ZSk7XHJcblx0XHRcdFx0Y29uc3QganNfc3RhdGUgPSBqYXZhc2NyaXB0X21vZGUgPyB3aW5kb3cuQ29kZU1pcnJvci5zdGFydFN0YXRlKGphdmFzY3JpcHRfbW9kZSk6IHt9O1xyXG5cdFx0XHRcdGNvbnN0IG5ld19zdGF0ZSA9IHtcclxuXHRcdFx0XHRcdC4uLmh5cGVybWRfc3RhdGUsXHJcblx0XHRcdFx0XHQuLi5qc19zdGF0ZSxcclxuXHRcdFx0XHRcdGluQ29tbWFuZDogc3RhdGUuaW5Db21tYW5kXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRyZXR1cm4gbmV3X3N0YXRlO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQvLyBUT0RPOiBGaXggY29uZmxpY3RzIHdpdGggbGlua3NcclxuXHRcdFx0dG9rZW46IGZ1bmN0aW9uKHN0cmVhbSwgc3RhdGUpIHtcclxuXHRcdFx0XHRpZiAoc3RyZWFtLm1hdGNoKC88JVsqfl17MCwxfVstX117MCwxfS8pKSB7XHJcblx0XHRcdFx0XHRzdGF0ZS5pbkNvbW1hbmQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIFwiZm9ybWF0dGluZyBmb3JtYXR0aW5nLWNvZGUgaW5saW5lLWNvZGVcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChzdGF0ZS5pbkNvbW1hbmQpIHtcclxuXHRcdFx0XHRcdGlmIChzdHJlYW0ubWF0Y2goL1stX117MCwxfSU+L20sIHRydWUpKSB7XHJcblx0XHRcdFx0XHRcdHN0YXRlLmluQ29tbWFuZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJmb3JtYXR0aW5nIGZvcm1hdHRpbmctY29kZSBpbmxpbmUtY29kZVwiO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGxldCBrZXl3b3JkcyA9IFwiaG1kLWNvZGVibG9jayBsaW5lLXRlc3R0ZXN0XCI7XHJcblx0XHRcdFx0XHRpZiAoamF2YXNjcmlwdF9tb2RlKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGpzX3Jlc3VsdCA9IGphdmFzY3JpcHRfbW9kZS50b2tlbihzdHJlYW0sIHN0YXRlKTtcclxuXHRcdFx0XHRcdFx0aWYgKGpzX3Jlc3VsdCkge1xyXG5cdFx0XHRcdFx0XHRcdGtleXdvcmRzICs9ICBcIiBcIiArIGpzX3Jlc3VsdDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmV0dXJuIGtleXdvcmRzO1xyXG5cdFx0XHRcdH0gXHJcblxyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGh5cGVybWRfbW9kZS50b2tlbihzdHJlYW0sIHN0YXRlKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdCovXHJcbn07Il0sIm5hbWVzIjpbIlBsdWdpblNldHRpbmdUYWIiLCJTZXR0aW5nIiwiZXNjYXBlUmVnRXhwIiwibm9ybWFsaXplUGF0aCIsIlRGb2xkZXIiLCJWYXVsdCIsIlRGaWxlIiwiRnV6enlTdWdnZXN0TW9kYWwiLCJNYXJrZG93blZpZXciLCJwYXRoIiwiZXhpc3RzU3luYyIsInJlYWRGaWxlU3luYyIsInBhcnNlTGlua3RleHQiLCJyZXNvbHZlU3VicGF0aCIsIkZpbGVTeXN0ZW1BZGFwdGVyIiwiZ2V0QWxsVGFncyIsIk1vZGFsIiwicHJvbWlzaWZ5IiwiZXhlYyIsIkV0YS5yZW5kZXJBc3luYyIsIlBsdWdpbiIsImFkZEljb24iLCJOb3RpY2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUF1REE7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7QUFDaEgsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDL0QsUUFBUSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ25HLFFBQVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ3RHLFFBQVEsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0FB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
