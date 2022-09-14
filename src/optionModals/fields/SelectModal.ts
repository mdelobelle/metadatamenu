import { TFile, SuggestModal } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";

export default class ValueSuggestModal extends SuggestModal<string>{

    private newValue: string | null;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private value: string,
        private field: Field,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
        this.newValue = null;
    };

    getSuggestions(query: string): string[] {
        const listNoteValues = this.plugin.fieldIndex.valuesListNotePathValues.get(this.field.valuesListNotePath)
        let options: string[] = []
        if (listNoteValues?.length === 0) {
            options = Object.values(this.field.options).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        } else {
            options = listNoteValues!.filter(o => o.toLowerCase().includes(query.toLowerCase()))
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