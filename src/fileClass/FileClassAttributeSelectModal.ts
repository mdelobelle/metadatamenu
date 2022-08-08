import MetadataMenu from "main";
import { DropdownComponent, Modal, TFile } from "obsidian";
import { createFileClass } from "src/fileClass/fileClass";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";

export default class FileClassAttributeSelectModal extends Modal {

    plugin: MetadataMenu;
    file: TFile;

    constructor(plugin: MetadataMenu, file: TFile) {
        super(plugin.app);
        this.file = file;
        this.plugin = plugin;
    }

    async onOpen() {
        this.titleEl.setText(`Select the field to update`);
        const fileClass = await createFileClass(this.plugin, this.file.basename, true) // limit fields manage to current fileClass
        this.titleEl.setText(`Select the field to update in ${fileClass.name}`);
        const selectContainer = this.contentEl.createDiv();
        const select = new DropdownComponent(selectContainer);
        select.addOption("select an attribute", "--select an attribute--");
        fileClass.attributes.forEach(attr => {
            select.addOption(attr.name, attr.name);
        })

        select.addOption("++newAttr++", "++Add a new attribute++");
        select.onChange((attrName) => {
            if (attrName == "++newAttr") {
                const modal = new FileClassAttributeModal(this.plugin, fileClass);
                modal.open();
                this.close();
            } else {
                const modal = new FileClassAttributeModal(this.plugin, fileClass, fileClass.attributes.filter(attr => attr.name == attrName)[0]);
                modal.open();
                this.close();
            }
        })
    }
}