import { TFile, SuggestModal } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";

export default class ValueSuggestModal extends SuggestModal<string>{
    private plugin: MetadataMenu;
    private file: TFile;
    private value: string;
    private field: Field;
    private newValue: string | null;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(plugin: MetadataMenu, file: TFile, value: string, field: Field, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(plugin.app);
        this.plugin = plugin;
        this.file = file;
        this.field = field;
        this.value = value;
        this.newValue = null;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    };

    async getSuggestions(query: string): Promise<string[]> {
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.plugin, this.field.valuesListNotePath)
        let options: string[] = []
        if (listNoteValues.length === 0) {
            options = Object.values(this.field.options).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        } else {
            options = listNoteValues.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        }
        return query ? [...options, "--empty--"] : ["--empty--", ...options]
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        if (value === this.value) el.addClass("metadata-menu-value-selected")
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.newValue = item === "--empty--" ? "" : item
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, this.newValue);
        } else {
            await insertValues(this.plugin, this.file, this.field.name, this.newValue, this.lineNumber, this.inFrontmatter, this.after);
        };
    }
}