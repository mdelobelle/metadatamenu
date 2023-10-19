import MetadataMenu from "main";
import { FuzzyMatch, FuzzySuggestModal, setIcon, TFile } from "obsidian";
import { FieldIcon, FieldManager, FieldType, FieldTypeTagClass, objectTypes } from "src/types/fieldTypes";
import addNewFieldModal from "./addNewFieldModal";


interface Option {
    actionLabel: string,
    type?: FieldType
}


export default class InsertFieldSuggestModal extends FuzzySuggestModal<Option> {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private lineNumber: number,
        private after: boolean,
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
    };

    getItems(): Option[] {
        const { start, end } = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatterPosition || {}
        console.log()
        if (start && end && start.line <= this.lineNumber && end.line >= this.lineNumber || this.lineNumber === -1) {
            console.log("ici")
            return [{ actionLabel: '++New++' }]
                .concat(this.plugin.fieldIndex.filesFields
                    .get(this.file.path)?.filter(_f => _f.isRoot()).map(field => {
                        return { actionLabel: field.name, type: field.type }
                    }) || []
                );
        } else {
            return [{ actionLabel: '++New++' }]
                .concat(this.plugin.fieldIndex.filesFields
                    .get(this.file.path)?.filter(_f => _f.isRoot())
                    .filter(_f => !objectTypes.includes(_f.type))
                    .map(field => {
                        return { actionLabel: field.name, type: field.type }
                    }) || []
                );
        }

    }

    getItemText(item: Option): string {
        return item.actionLabel;
    }

    renderSuggestion(item: FuzzyMatch<Option>, el: HTMLElement): void {
        el.addClass("value-container")
        const iconContainer = el.createDiv({ cls: "icon-container" })
        item.item.type ? setIcon(iconContainer, FieldIcon[item.item.type]) : setIcon(iconContainer, "plus-with-circle")
        el.createDiv({ text: item.item.actionLabel })
        el.createDiv({ cls: "spacer" })
        if (item.item.type) el.createDiv({ cls: `chip ${FieldTypeTagClass[item.item.type]}`, text: item.item.type })
    }

    onChooseItem(item: Option, evt: MouseEvent | KeyboardEvent): void {
        if (item.actionLabel === "++New++") {
            const newFieldModal = new addNewFieldModal(this.plugin, this.lineNumber, this.file, this.after);
            newFieldModal.open();
            this.close();
        } else {
            const field = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(field => field.name === item.actionLabel)
            if (field) {
                const fieldManager = new FieldManager[field.type](this.plugin, field);
                fieldManager.createAndOpenFieldModal(this.file, item.actionLabel, undefined, undefined, this.lineNumber, this.after, false, false);
            }
        }
    }
}