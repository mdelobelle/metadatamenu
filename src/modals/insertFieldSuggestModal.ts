import MetadataMenu from "main";
import { FuzzyMatch, FuzzySuggestModal, setIcon, TFile } from "obsidian";
import { insertMissingFields } from "src/commands/insertMissingFields";
import { postValues } from "src/commands/postValues";
import { Note } from "src/note/note";
import { FieldIcon, FieldManager, FieldType, FieldTypeTagClass, frontmatterOnlyTypes, objectTypes } from "src/types/fieldTypes";
import chooseSectionModal from "./chooseSectionModal";


interface Option {
    actionLabel: string,
    type?: FieldType,
    icon?: string
}

const defaulOptions: Option[] = [
    {
        actionLabel: 'Insert missing fields in frontmatter',
        icon: 'align-vertical-space-around'
    },
    {
        actionLabel: 'Insert missing fields at section',
        icon: "enter"
    }
]

export default class InsertFieldSuggestModal extends FuzzySuggestModal<Option> {
    // a modal to insert field at root level
    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private lineNumber: number,
        private asList: boolean = false,
        private asBlockquote: boolean = false
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
    };

    getItems(): Option[] {
        const { start, end } = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatterPosition || {}
        if (start && end && start.line <= this.lineNumber && end.line >= this.lineNumber || this.lineNumber === -1) {
            return defaulOptions.concat(this.plugin.fieldIndex.filesFields
                .get(this.file.path)?.filter(_f => _f.isRoot()).map(field => {
                    return { actionLabel: field.name, type: field.type }
                }) || []
            );
        } else {
            return defaulOptions.concat(this.plugin.fieldIndex.filesFields
                .get(this.file.path)?.filter(_f => _f.isRoot() && !frontmatterOnlyTypes.includes(_f.type))
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
        item.item.type ? setIcon(iconContainer, FieldIcon[item.item.type]) : setIcon(iconContainer, item.item.icon || "plus-with-circle")
        el.createDiv({ text: item.item.actionLabel })
        el.createDiv({ cls: "spacer" })
        if (item.item.type) el.createDiv({ cls: `chip ${FieldTypeTagClass[item.item.type]}`, text: item.item.type })
    }

    async onChooseItem(item: Option, evt: MouseEvent | KeyboardEvent): Promise<void> {
        if (item.actionLabel === 'Insert missing fields in frontmatter') {
            insertMissingFields(this.plugin, this.file.path, -1)
        } else if (item.actionLabel === 'Insert missing fields at section') {
            new chooseSectionModal(
                this.plugin,
                this.file,
                (
                    lineNumber: number,
                    asList: boolean,
                    asBlockquote: boolean
                ) => insertMissingFields(
                    this.plugin,
                    this.file.path,
                    lineNumber,
                    asList,
                    asBlockquote
                )
            ).open();
        } else {
            const field = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(field => field.name === item.actionLabel)
            if (field) {
                if (objectTypes.includes(field.type)) {
                    await postValues(this.plugin, [{ indexedPath: field.id, payload: { value: "" } }], this.file)
                    const eF = await Note.getExistingFieldForIndexedPath(this.plugin, this.file, field.id)
                    const fieldManager = new FieldManager[field.type](this.plugin, field);
                    fieldManager.createAndOpenFieldModal(this.file, field.name, eF, field.id, undefined, undefined, undefined, undefined)
                } else {
                    const fieldManager = new FieldManager[field.type](this.plugin, field);
                    fieldManager.createAndOpenFieldModal(this.file, item.actionLabel, undefined, undefined, this.lineNumber, this.asList, this.asBlockquote);
                }
            }
        }
    }
}