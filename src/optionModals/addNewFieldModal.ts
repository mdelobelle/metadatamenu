import { Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TFile } from "obsidian"
import MetadataMenu from "main"

export default class addNewFieldModal extends Modal {

    plugin: MetadataMenu
    lineNumber: number
    file: TFile
    inFrontmatter: boolean
    top: boolean

    constructor(plugin: MetadataMenu, lineNumber: number, file: TFile, inFrontmatter: boolean, top: boolean) {
        super(plugin.app)
        this.lineNumber = lineNumber
        this.inFrontmatter = inFrontmatter
        this.file = file
        this.top = top
    }

    onOpen() {
        this.titleEl.setText("Insert new field")
        const addNewFieldContainer = this.contentEl.createDiv()
        const nameInputContainer = addNewFieldContainer.createDiv()
        nameInputContainer.setText("Field Name: ")
        const nameInputEl = new TextComponent(nameInputContainer)
        nameInputEl.setPlaceholder("Field name")
        const valueInputContainer = addNewFieldContainer.createDiv()
        valueInputContainer.setText("Field value: ")
        const valueInputEl = new TextComponent(valueInputContainer)
        valueInputEl.setPlaceholder("Field value")
        const footerButtons = this.contentEl.createDiv({
            cls: 'metadata-menu-textarea-buttons'
        })
        const saveButton = new ButtonComponent(footerButtons)
        saveButton.setIcon("checkmark")
        saveButton.onClick(() => {
            this.app.vault.read(this.file).then(result => {
                let newContent: string[] = []
                if (this.top) {
                    newContent.push(`${nameInputEl.getValue()}${this.inFrontmatter ? ":" : "::"} ${valueInputEl.getValue()}`)
                    result.split("\n").forEach((line, _lineNumber) => newContent.push(line))
                } else {
                    result.split("\n").forEach((line, _lineNumber) => {
                        newContent.push(line)
                        if (_lineNumber == this.lineNumber) {
                            newContent.push(`${nameInputEl.getValue()}${this.inFrontmatter ? ":" : "::"} ${valueInputEl.getValue()}`)
                        }
                    })
                }
                this.app.vault.modify(this.file, newContent.join('\n'))
                this.close()
            })
        })
        const cancelButton = new ExtraButtonComponent(footerButtons)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => {
            this.close()
        })


    }
}