import { Modal, DropdownComponent, TFile, FuzzySuggestModal, TextComponent } from "obsidian";
import MetadataMenu from "main";
import addNewFieldModal from "./addNewFieldModal";
import { FileClass } from "src/fileClass/fileClass";
import Field from "src/fields/Field";
import { FieldManager, FieldType } from "src/types/fieldTypes";


export default class InsertFieldSuggestModal extends FuzzySuggestModal<string> {
    private lineNumber: number;
    private line: string;
    private plugin: MetadataMenu;
    private file: TFile;
    private inFrontmatter: boolean;
    private top: boolean;
    private fileClass?: FileClass

    constructor(plugin: MetadataMenu, file: TFile, lineNumber: number, line: string, inFrontmatter: boolean, top: boolean, fileClass?: FileClass) {
        super(plugin.app);
        this.line = line;
        this.lineNumber = lineNumber;
        this.plugin = plugin;
        this.file = file;
        this.inFrontmatter = inFrontmatter;
        this.top = top;
        this.fileClass = fileClass
    };

    getItems(): string[] {
        if (this.fileClass) {
            return ['++New++'].concat(this.fileClass.attributes.map(attr => attr.name));
        } else {
            return ['++New++'].concat(this.plugin.settings.presetFields.map(setting => setting.name));
        };
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        if (item === "++New++") {
            const newFieldModal = new addNewFieldModal(this.plugin, this.lineNumber, this.file, this.inFrontmatter, this.top);
            newFieldModal.open();
            this.close();
        } else if (this.fileClass) {
            const fileClassAttributesWithName = this.fileClass.attributes.filter(attr => attr.name == item);
            let field: Field | undefined
            let type: FieldType | undefined
            if (fileClassAttributesWithName.length > 0) {
                const fileClassAttribute = fileClassAttributesWithName[0];
                field = fileClassAttribute.getField();
                type = fileClassAttribute.type
            }
            if (field) {
                const fieldManager = new FieldManager[field.type](field);
                fieldManager.createAndOpenFieldModal(this.app, this.file, item, this.lineNumber, this.inFrontmatter, this.top);
            }
            this.close()
        } else {
            const field = this.plugin.settings.presetFields.filter(_field => _field.name == item)[0];
            const fieldManager = new FieldManager[field.type](field);
            fieldManager.createAndOpenFieldModal(this.app, this.file, item, this.lineNumber, this.inFrontmatter, this.top);
            this.close();
        };
    }
}