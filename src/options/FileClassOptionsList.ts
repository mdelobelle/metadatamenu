import MetadataMenu from "main";
import { App, Menu, TFile } from "obsidian";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import { FieldIcon } from "src/types/fieldTypes";
import FieldCommandSuggestModal from "./FieldCommandSuggestModal";

function isMenu(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is Menu {
    return (location as Menu).addItem !== undefined;
};

function isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is "InsertFieldCommand" {
    return (location as string) === "InsertFieldCommand";
}

function isSuggest(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is FieldCommandSuggestModal {
    return (location as FieldCommandSuggestModal).getItems !== undefined;
};

export default class FileClassOptionsList {

    // adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette

    app: App;
    file: TFile;
    plugin: MetadataMenu;
    path: string;
    location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal;
    fileClass: FileClass;

    constructor(plugin: MetadataMenu, file: TFile, location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal) {
        this.file = file;
        this.plugin = plugin;
        this.location = location;
        this.fileClass = FileClass.createFileClass(this.plugin, file.basename)
    };

    public createExtraOptionList(openAfterCreate: boolean = true): void {
        if (isMenu(this.location)) { this.location.addSeparator(); };
        if (isInsertFieldCommand(this.location)) {
            const modal = new FileClassAttributeModal(this.plugin, this.fileClass);
            modal.open();
        } else if (isSuggest(this.location)) {
            this.buildFieldOptions();

            if (openAfterCreate) this.location.open();
        } else {
            this.buildFieldOptions();
        }
    }

    private buildFieldOptions(): void {
        this.fileClass.attributes.forEach((attr: FileClassAttribute) => {
            const modal = new FileClassAttributeModal(this.plugin, this.fileClass, attr)
            if (isMenu(this.location)) {
                this.location.addItem((item) => {
                    item.setTitle(`${attr.name}`)
                    item.onClick(() => {
                        modal.open()
                    })
                    item.setSection("metadata-menu.fileclass-fields")
                })
            } else if (isSuggest(this.location)) {
                this.location.options.push({
                    id: `update_${attr.name}`,
                    actionLabel: `<span>${attr.name}</span>`,
                    action: () => modal.open(),
                    icon: "gear"
                });
            }
        });
        if (isMenu(this.location)) {
            this.location.addItem((item) => {
                item.setTitle("Add new attribute")
                item.setIcon("plus-circle")
                item.onClick(() => {
                    const modal = new FileClassAttributeModal(this.plugin, this.fileClass);
                    modal.open();
                })
                item.setSection("metadata-menu")
            })
        } else if (isSuggest(this.location)) {
            const modal = new FileClassAttributeModal(this.plugin, this.fileClass);
            this.location.options.push({
                id: "add_fileClass_attribute",
                actionLabel: `<span>Insert an attribute for <b>${this.fileClass.name}</b> fileClass</span>`,
                action: () => { modal.open() },
                icon: "plus-circle"
            })
        }
    }

};
