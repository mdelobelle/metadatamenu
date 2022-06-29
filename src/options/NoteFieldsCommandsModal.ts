import { App, Modal, TFile } from "obsidian"
import MetadataMenu from "main"
import OptionsList from "src/options/OptionsList"
import SelectModal from "src/optionModals/SelectModal"

export default class NoteFieldsCommandsModal extends Modal {
    public app: App;
    private plugin: MetadataMenu;
    private file: TFile
    private select: SelectModal
    optionsList: OptionsList

    constructor(app: App, plugin: MetadataMenu, file: TFile) {
        super(app);
        this.app = app;
        this.plugin = plugin;
        this.file = file
    }

    onOpen() {
        this.titleEl.setText(`Select the field to manage`)
        const optionsListContainer = this.contentEl.createDiv()
        this.select = new SelectModal(optionsListContainer)
        this.select.addOption("---", "Choose Field")
        this.optionsList = new OptionsList(this.plugin, this.file, this.select)
        this.optionsList.createExtraOptionList()
        this.select.onChange((value) => {
            this.select.modals[value]()
            this.close()
        })
        this.select.selectEl.focus()
    }
}