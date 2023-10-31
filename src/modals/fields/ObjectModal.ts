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
        public plugin: MetadataMenu,
        public file: TFile,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal,
        public existingFields: ExistingField[] = [],
        public missingFields: Field[] = []
        //TODO: can be generalized?
    ) {
        super(plugin.app);
    };

    onOpen() {
        //this.previousModal?.close(true)
        super.onOpen()
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        console.log(this)
    };

    /*
    close(fromChildOpening: boolean = false): void {
        //if (!fromChildOpening) this.previousModal?.open()
        super.close()
    }
    */
    onClose(): void {
        //@ts-ignore
        console.log("SELECTED", this.selectedItem)
    }

    getSuggestions(query: string = ""): Array<ExistingField | Field> {
        return [...this.existingFields, ...this.missingFields].filter(f => {
            if (f instanceof ExistingField) {
                return f.field.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
            } else {
                return f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
            }
        })
    }

    renderSuggestion(item: ExistingField | Field, el: HTMLElement) {
        const container = el.createDiv({ cls: "value-container" })
        if (item instanceof ExistingField) {
            container.createDiv({ text: `${item.field.name} :`, cls: "label-container" })
            const fM = new FieldManager[item.field.type](this.plugin, item.field)
            const valueContainer = container.createDiv()
            fM.displayValue(valueContainer, this.file, item.value !== undefined ? item.value : "<empty>")
        } else {
            container.createDiv({ text: `${item.name} :`, cls: "label-container" })
            container.createDiv({ text: "<missing>" })
        }

    }


    async onChooseSuggestion(item: ExistingField | Field, evt: MouseEvent | KeyboardEvent) {
        const reOpen = async () => {
            // because vault.on("modify") is not triggered fast enough
            await ExistingField.indexFieldsValues(this.plugin)
            const eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(this.plugin, this.file, this.indexedPath)
            if (eF) {
                const thisFieldManager = new FieldManager[eF.field.type](this.plugin, eF.field)
                thisFieldManager.createAndOpenFieldModal(this.file, eF.field.name, eF, eF.indexedPath, undefined, undefined, undefined, this.previousModal)
                this.close()
            }
        }
        if (item instanceof ExistingField) {
            //open field modal
            const field = item.field
            const fieldManager = new FieldManager[field.type](this.plugin, field)
            switch (fieldManager.type) {
                case FieldType.Boolean:
                    await (fieldManager as BooleanField).toggle(this.file, item.indexedPath)
                    await reOpen()
                    break;
                case FieldType.Cycle:
                    await (fieldManager as CycleField).next(field.name, this.file, item.indexedPath)
                    await reOpen()
                    break;
                default:
                    fieldManager.createAndOpenFieldModal(this.file, field.name, item, item.indexedPath, undefined, undefined, undefined, this)
                    break;
            }
        } else {
            //insert field
            const fieldManager = new FieldManager[item.type](this.plugin, item) as F
            fieldManager.createAndOpenFieldModal(this.file, item.name, undefined, `${this.indexedPath}____${item.id}`, this.lineNumber, this.asList, this.asBlockquote, this)
        }
    }
};