import MetadataMenu from "main";
import { FuzzyMatch, FuzzySuggestModal, setIcon, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FileClass } from "src/fileClass/fileClass";
import { FieldIcon, FieldManager, FieldType, FieldTypeTagClass } from "src/types/fieldTypes";
import addNewFieldModal from "./addNewFieldModal";


interface Option {
    actionLabel: string,
    type?: FieldType
}


export default class InsertFieldSuggestModal extends FuzzySuggestModal<Option> {
    private lineNumber: number;
    private plugin: MetadataMenu;
    private file: TFile;
    private inFrontmatter: boolean;
    private after: boolean;
    private fileClass?: FileClass

    constructor(plugin: MetadataMenu, file: TFile, lineNumber: number, inFrontmatter: boolean, after: boolean, fileClass?: FileClass) {
        super(plugin.app);
        this.lineNumber = lineNumber;
        this.plugin = plugin;
        this.file = file;
        this.inFrontmatter = inFrontmatter;
        this.after = after;
        this.fileClass = fileClass
    };

    getItems(): Option[] {
        if (this.fileClass) {
            return [{ actionLabel: '++New++' }]
                .concat(this.fileClass.attributes.map(attr => {
                    return { actionLabel: attr.name, type: attr.type }
                }));
        } else {
            return [{ actionLabel: '++New++' }]
                .concat(this.plugin.settings.presetFields.map(setting => {
                    return { actionLabel: setting.name, type: setting.type }
                }));
        };
    }

    getItemText(item: Option): string {
        return item.actionLabel;
    }

    renderSuggestion(item: FuzzyMatch<Option>, el: HTMLElement): void {
        el.addClass("metadata-menu-command-suggest-item")
        const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
        item.item.type ? setIcon(iconContainer, FieldIcon[item.item.type]) : setIcon(iconContainer, "plus-with-circle")
        el.createDiv({ text: item.item.actionLabel, cls: "metadata-menu-command-suggest-action-label" })
        el.createDiv({ cls: "metadata-menu-command-suggest-spacer" })
        if (item.item.type) {
            const typeContainer = el.createEl("div")
            typeContainer.setAttr("class", `metadata-menu-setting-item-info-type ${FieldTypeTagClass[item.item.type]}`)
            typeContainer.setText(item.item.type)
        }
    }

    onChooseItem(item: Option, evt: MouseEvent | KeyboardEvent): void {
        if (item.actionLabel === "++New++") {
            const newFieldModal = new addNewFieldModal(this.plugin, this.lineNumber, this.file, this.inFrontmatter, this.after);
            newFieldModal.open();
            this.close();
        } else if (this.fileClass) {
            const fileClassAttributesWithName = this.fileClass.attributes.filter(attr => attr.name == item.actionLabel);
            let field: Field | undefined
            let type: FieldType | undefined
            if (fileClassAttributesWithName.length > 0) {
                const fileClassAttribute = fileClassAttributesWithName[0];
                field = fileClassAttribute.getField();
                type = fileClassAttribute.type
            }
            if (field) {
                const fieldManager = new FieldManager[field.type](field);
                fieldManager.createAndOpenFieldModal(this.app, this.file, item.actionLabel, "", this.lineNumber, this.inFrontmatter, this.after);
            }
            this.close()
        } else {
            const field = this.plugin.settings.presetFields.filter(_field => _field.name == item.actionLabel)[0];
            const fieldManager = new FieldManager[field.type](field);
            fieldManager.createAndOpenFieldModal(this.app, this.file, item.actionLabel, "", this.lineNumber, this.inFrontmatter, this.after);
            this.close();
        };
    }
}