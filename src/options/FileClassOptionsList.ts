import MetadataMenu from "main";
import { Menu, Notice, TFile } from "obsidian";
import { insertMissingFields } from "src/commands/insertMissingFields";
import { postValues } from "src/commands/postValues";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import chooseSectionModal from "src/modals/chooseSectionModal";
import { genuineKeys } from "src/utils/dataviewUtils";
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
    private fileClass: FileClass | undefined;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal,
        private fromFile?: TFile
    ) {
        this.fileClass = this.plugin.fieldIndex.fileClassesPath.get(this.file.path)
    };

    public createExtraOptionList(openAfterCreate: boolean = true): void {
        const mapWithTagAction = async () => {
            this.plugin.app.fileManager.processFrontMatter(this.file, fm => fm.mapWithTag = true)
        }
        const openFileClassTableViewAction = () => {
            const fileClassComponent = new FileClassManager(this.plugin, fileClass)
            this.plugin.addChild(fileClassComponent);
        }
        if (isMenu(this.location)) { this.location.addSeparator(); };
        const fileClass = this.fileClass
        const currentFieldsNames: string[] = []
        let addMissingFieldsAction = () => { new Notice("Something went wrong, please check your fileClass definitions") }
        if (this.fromFile) {
            const dvApi = this.plugin.app.plugins.plugins.dataview?.api
            if (dvApi) {
                const dvFile = dvApi.page(this.fromFile.path);
                if (dvFile) {
                    currentFieldsNames.push(...genuineKeys(dvFile))
                    const modal = new chooseSectionModal(
                        this.plugin,
                        this.fromFile,
                        (
                            lineNumber: number,
                            after: boolean,
                            asList: boolean,
                            asComment: boolean
                        ) => insertMissingFields(
                            this.plugin,
                            dvFile.file.path,
                            lineNumber,
                            after,
                            asList,
                            asComment,
                            fileClass?.name
                        )
                    );
                    addMissingFieldsAction = () => {
                        modal.open()
                    }
                }
            };
        }

        const missingFields = fileClass && this.fromFile ?
            !this.plugin.fieldIndex.fileClassesFields.get(fileClass.name)?.map(f => f.name).every(fieldName => currentFieldsNames.includes(fieldName)) :
            false
        if (isInsertFieldCommand(this.location) && fileClass) {
            const modal = new FileClassAttributeModal(this.plugin, fileClass);
            modal.open();
        } else if (isSuggest(this.location)) {
            if (fileClass) {
                this.location.options.push({
                    id: `display_table_view_for_${fileClass.name.replace("/", "_")}`,
                    actionLabel: `Display ${fileClass.name} table view`,
                    action: openFileClassTableViewAction,
                    icon: "file-spreadsheet"
                })
            }
            if (fileClass && !fileClass.isMappedWithTag()) {
                this.location.options.push({
                    id: "map_fileClass_with_tag",
                    actionLabel: `<span>Map <b>${fileClass.name}</b> with tag of same name</span>`,
                    action: mapWithTagAction,
                    icon: "hash"
                });
            }
            if (fileClass && missingFields && this.fromFile) {
                this.location.options.push({
                    id: `insert_missig_fields_from_${fileClass.name.replace("/", "_")}`,
                    actionLabel: `<span>Insert missing fields from <b>${fileClass.name}</b></span>`,
                    action: addMissingFieldsAction,
                    icon: "battery-full"
                });
            }
            this.buildFieldOptions();


            if (openAfterCreate) this.location.open();
        } else if (isMenu(this.location)) {
            if (fileClass) {
                this.location.addItem((item) => {
                    item.setTitle(`Display ${fileClass.name} table view`);
                    item.onClick(openFileClassTableViewAction);
                    item.setIcon("file-spreadsheet");
                    item.setSection(`metadata-menu-fileclass.${fileClass.name}.fileclass-fields`);
                })
            }
            if (fileClass && !fileClass.isMappedWithTag()) {
                this.location.addItem((item) => {
                    item.setTitle(`Map ${fileClass.name} with tag`);
                    item.setIcon("hash");
                    item.onClick(mapWithTagAction);
                    item.setSection(`metadata-menu-fileclass.${fileClass.name}.fileclass-fields`);
                })
            }
            if (fileClass && missingFields && this.fromFile) {
                this.location.addItem((item) => {
                    item.setTitle(`Insert missing fields from ${fileClass.name}`);
                    item.setIcon("battery-full");
                    item.onClick(addMissingFieldsAction);
                    item.setSection(`metadata-menu-fileclass.${fileClass.name}.fileclass-fields`);
                })
            }
            this.buildFieldOptions();
        } else {
            this.buildFieldOptions
        }
    }

    private buildFieldOptions(): void {
        this.fileClass?.attributes.forEach((attr: FileClassAttribute) => {
            const modal = new FileClassAttributeModal(this.plugin, this.fileClass!, attr)
            if (isMenu(this.location)) {
                this.location.addItem((item) => {
                    item.setTitle(`${this.fileClass!.name} - ${attr.name}`)
                    item.setIcon("wrench")
                    item.onClick(() => {
                        modal.open()
                    })
                    item.setSection(`metadata-menu-fileclass.${this.fileClass!.name}.fileclass-fields`)
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
        const modal = new FileClassAttributeModal(this.plugin, this.fileClass!);
        const action = () => modal.open();
        if (isMenu(this.location) && this.fileClass) {
            this.location.addItem((item) => {
                item.setTitle("Add new field")
                item.setIcon("plus-circle")
                item.onClick(action)
                item.setSection(`metadata-menu-fileclass.${this.fileClass!.name}.fileclass-fields`)
            })
        } else if (isSuggest(this.location) && this.fileClass) {
            this.location.options.push({
                id: "add_fileClass_attribute",
                actionLabel: `<span>Insert an attribute for <b>${this.fileClass.name}</b> fileClass</span>`,
                action: action,
                icon: "plus-circle"
            });
        }
    }

};
