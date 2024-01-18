import { TFile, ButtonComponent } from "obsidian";
import Field from "src/fields/_Field";
import MetadataMenu from "main";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";
import BaseSelecttModal from "../baseFieldModals/BaseSelectModal";
import { postValues } from "src/commands/postValues";

export default class ValueSuggestModal extends BaseSelecttModal {

    public addButton: ButtonComponent;
    private value: string

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal

    ) {
        super(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        this.value = this.eF?.value || ""
    };

    async onAdd(): Promise<void> {
        await this.addNewValueToSettings();
        await this.saveItem(this.inputEl.value);
        this.close();
    }

    renderSuggestion(value: string, el: HTMLElement) {
        super.renderSuggestion(value, el)
        if (value === this.value) el.addClass("value-checked")
    }

    async saveItem(item: string): Promise<void> {
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: item.toString() } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        await this.saveItem(item)
    }
}