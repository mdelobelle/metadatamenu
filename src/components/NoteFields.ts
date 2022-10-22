import MetadataMenu from "main";
import { Component, Modal, setIcon, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { FileClass } from "src/fileClass/fileClass";
import ChooseSectionModal from "src/modals/chooseSectionModal"

class FieldsModal extends Modal {

    private dvApi?: any
    public fields: Field[]
    private fileClass?: FileClass
    constructor(
        public plugin: MetadataMenu,
        private file: TFile
    ) {
        super(plugin.app);
        this.dvApi = plugin.app.plugins.plugins.dataview?.api;
        this.getFields();
        this.fileClass = this.plugin.fieldIndex.filesFileClass.get(this.file.path);
    }
    onOpen() {
        this.titleEl.setText("Fields")
        this.buildFieldsList();
    };

    getFields(): void {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || [];
    }

    buildFieldsList(): void {
        this.contentEl.replaceChildren();
        const fieldsContainer = this.contentEl.createDiv({});
        this.fields.forEach(field => {
            const value = this.dvApi ? this.dvApi.page(this.file.path)[field.name] : undefined
            console.log(field.name, value)
            const fieldContainer = fieldsContainer.createDiv({ cls: "metadata-menu-modal-value", })
            fieldContainer.createDiv({ text: `${field.name} | ${field.type} | ${value}` })
            const fieldBtn = fieldContainer.createDiv({})
            setIcon(fieldBtn, value ? "edit" : "list-plus")
            fieldBtn.onclick = () => {
                if (!value) {
                    (new ChooseSectionModal(this.plugin, this.file, this.fileClass, field.name)).open();
                } else {
                    FieldManager.createAndOpenModal(this.plugin, this.file, field.name, field, value)
                }
            }
        })
    }
}

export default class NoteFieldsComponent extends Component {

    private allFieldsModal: FieldsModal;

    constructor(
        public plugin: MetadataMenu,
        public cacheVersion: string,
        public onChange: () => void,
        public file: TFile
    ) {
        super();
        this.allFieldsModal = new FieldsModal(this.plugin, file)
    }

    onload(): void {
        this.plugin.registerEvent(this.plugin.app.metadataCache.on('dataview:metadata-change', () => {
            this.allFieldsModal.getFields();
            this.allFieldsModal.buildFieldsList();
        }))
        this.allFieldsModal.open()
    }


}