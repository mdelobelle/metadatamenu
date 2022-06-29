import {TextAreaComponent, Modal, ButtonComponent, ExtraButtonComponent, DropdownComponent, App, TFile} from "obsidian" 

export default class sectionContentModal extends Modal {
    file: TFile
    startLine: number
    endLine: number

    constructor(app: App, file: TFile,startLine: number, endLine: number){
        super(app)
        this.file = file
        this.startLine = startLine
        this.endLine = endLine
    }

    onOpen(){
        this.titleEl.setText('Select the line before the field to add')
        const contentDiv = this.contentEl.createDiv()
        const inputDiv = contentDiv.createDiv()
        const inputEl = new TextAreaComponent(inputDiv)
        inputEl.inputEl.setAttr("cols", "50")
        inputEl.inputEl.setAttr("rows", "5")
        const footerDiv = contentDiv.createDiv({
            cls: "frontmatter-textarea-buttons"
        })
        const positionSelectorContainer = footerDiv.createDiv({
            cls: "position-selector-container"
        })
        const positionDropdown = new DropdownComponent(positionSelectorContainer)
        positionDropdown.addOption("1", "begining")
        positionDropdown.addOption("2", "end")
        positionDropdown.setValue("2")
        const saveButton = new ButtonComponent(footerDiv)
        saveButton
        .setIcon("checkmark")
        .onClick(() => {
            this.app.vault.read(this.file).then(result => {
                let newContent: string[] = []
                result.split("\n").forEach((line, lineNumber) =>{
                    newContent.push(line)
                    if(lineNumber == this.startLine && positionDropdown.getValue() == "1"){
                        newContent.push(inputEl.getValue())
                    }
                    if(lineNumber == this.startLine && positionDropdown.getValue() == "1"){
                        newContent.push(inputEl.getValue())
                    }
                })
            })
        })
        const cancelButton = new ExtraButtonComponent(footerDiv)
        cancelButton
        .setIcon("cross")
        .onClick(() => this.close())
    }
}