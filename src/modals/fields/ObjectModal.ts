import MetadataMenu from "main";
import { TFile, SuggestModal, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import BooleanField from "src/fields/fieldManagers/BooleanField";
import CycleField from "src/fields/fieldManagers/CycleField";
import { ExistingField } from "src/fields/ExistingField";
import { FieldManager as F } from "src/fields/FieldManager";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import ObjectListModal from "./ObjectListModal";

export default class ObjectModal extends SuggestModal<ExistingField | Field> {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal,
        private existingFields: ExistingField[] = [],
        private missingFields: Field[] = []
        //TODO: can be generalized?
    ) {
        super(plugin.app);
    };

    onOpen() {
        super.onOpen()
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
    };

    onClose(): void {
        this.previousModal?.open()
    }

    getSuggestions(query: string = ""): Array<ExistingField | Field> {
        return [...this.existingFields, ...this.missingFields]
    }

    renderSuggestion(item: ExistingField | Field, el: HTMLElement) {
        const container = el.createDiv({ cls: "value-container" })
        if (item instanceof ExistingField) {
            const label = container.createDiv({ text: `${item.field.name} :`, cls: "label-container" })
            const fM = new FieldManager[item.field.type](this.plugin, item.field)
            const valueContainer = container.createDiv()
            fM.displayValue(valueContainer, this.file, item.value || "<empty>")
        } else {
            const label = container.createDiv({ text: `${item.name} :`, cls: "label-container" })
            const valueContainer = container.createDiv({ text: "<missing>" })
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
                    console.log(fieldManager)
                    fieldManager.createAndOpenFieldModal(this.file, field.name, item, item.indexedPath, undefined, undefined, undefined, undefined, this)
                    break;
            }
        } else {
            //insert field
            const fieldManager = new FieldManager[item.type](this.plugin, item) as F
            fieldManager.createAndOpenFieldModal(this.file, item.name, undefined, `${this.indexedPath}____${item.id}`, this.lineNumber, this.asList, this.asBlockquote, this)
        }
    }
};