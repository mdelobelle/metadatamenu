import MetadataMenu from "main";
import { TFile, SuggestModal } from "obsidian";
import Field from "src/fields/Field";
import BooleanField from "src/fields/fieldManagers/BooleanField";
import CycleField from "src/fields/fieldManagers/CycleField";
import { ExistingField } from "src/fields/ExistingField";
import { FieldManager as F } from "src/fields/FieldManager";
import { FieldManager, FieldType } from "src/types/fieldTypes";

export default class ObjectModal extends SuggestModal<ExistingField | Field> {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false,
        private existingFields: ExistingField[] = [],
        private missingFields: Field[] = [],
    ) {
        super(plugin.app);
    };

    onOpen() {
        super.onOpen()
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
    };

    getSuggestions(query: string = ""): Array<ExistingField | Field> {
        return [...this.existingFields, ...this.missingFields]
    }

    renderSuggestion(item: ExistingField | Field, el: HTMLElement) {
        if (item instanceof ExistingField) {
            el.setText(`${item.field.name}: ` + item.value || "not found")
        } else {
            el.setText(`${item.name}: missing`)
        }
    }


    async onChooseSuggestion(item: ExistingField | Field, evt: MouseEvent | KeyboardEvent) {
        if (item instanceof ExistingField) {
            //open field modal
            const field = item.field
            const fieldManager = new FieldManager[field.type](this.plugin, field)
            switch (fieldManager.type) {
                case FieldType.Boolean:
                    (fieldManager as BooleanField).toggle(this.file)
                    break;
                case FieldType.Cycle:
                    (fieldManager as CycleField).next(field.name, this.file)
                    break;
                default:
                    fieldManager.createAndOpenFieldModal(this.file, field.name, item, item.indexedPath, undefined, undefined, undefined, undefined)
                    break;
            }
        } else {
            //insert field
            const fieldManager = new FieldManager[item.type](this.plugin, item) as F
            fieldManager.createAndOpenFieldModal(this.file, item.name, undefined, `${this.indexedPath}____${item.id}`, this.lineNumber, this.after, this.asList, this.asComment)
        }
    }
};