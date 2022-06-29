import {App, DropdownComponent, Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TextAreaComponent} from "obsidian"
import {FileClassAttribute, types} from "src/fileClass/fileClassAttribute"
import {FileClass} from "src/fileClass/fileClass"
import { stringify } from "querystring"

export default class FileClassAttributeModal extends Modal {

    attr: FileClassAttribute
    fileClass: FileClass
    type: string = "input"
    options: string[] = []
    name: string = ""

    constructor(app: App, fileClass: FileClass, attr?: FileClassAttribute){
        super(app)
        this.attr = attr
        this.fileClass = fileClass
        if(this.attr){
            this.type = this.attr.type || "input"
            this.options = this.attr.options
            this.name = this.attr.name
        }
    }

    onOpen(){
        //title
        this.titleEl.setText(this.attr ? `Manage ${this.attr.name}` : `Create a new attribute for ${this.fileClass.name}`)
        
        //name input
        const nameInputContainer = this.contentEl.createDiv()
        nameInputContainer.setText("name")
        const nameInput = new TextComponent(nameInputContainer)
        this.attr ? nameInput.setValue(this.attr.name) : nameInput.setPlaceholder("Type a name for this attribute")

        //header for select
        const typeSelectHeader = this.contentEl.createDiv()
        const attrLine = typeSelectHeader.createEl("div")
        const attrName = attrLine.createEl("strong")
        attrName.setText(`<${this.name}>`)
        attrLine.append(" fields in files with:")
        String(`---\nfileClass: ${this.fileClass.name}\n...\n---`).split('\n').forEach(line => {
            typeSelectHeader.createEl("div", "yaml-frontmatter-red").setText(line)
        })

        // type select
        const typeSelectContainer = this.contentEl.createDiv({cls: 'frontmatter-value-selector-container'})
        const typeSelectLabel = typeSelectContainer.createDiv({cls: 'frontmatter-value-selector-inline-label'})
        typeSelectLabel.setText("will: ")
        const typeSelectDropDown = typeSelectContainer.createDiv({cls: 'frontmatter-value-selector-toggler'})
        const typeSelect = new DropdownComponent(typeSelectDropDown)
        Object.keys(types).forEach(key => {
            typeSelect.addOption(key, types[key])
        })
        if(this.attr){
            typeSelect.setValue(this.type)
        }

        // options input
        const optionsInputContainer = this.contentEl.createDiv({cls: 'frontmatter-value-selector-container'})
        const optionsInputLabel = optionsInputContainer.createDiv({cls: 'frontmatter-value-selector-inline-label-top'})
        optionsInputLabel.setText("Values")
        const optionsInput = new TextAreaComponent(optionsInputContainer)
        optionsInput.inputEl.rows = 3
        optionsInput.inputEl.cols = 26
        this.attr ? optionsInput.setValue(this.type == "input" ? "" : this.options.join(", ")) : optionsInput.setPlaceholder("insert values, comma separated")
        !this.attr || this.type == "input" ? optionsInputContainer.hide() : optionsInputContainer.show()

        // event handlers
        typeSelect.onChange(type => {
            type == "input" ? optionsInputContainer.hide() : optionsInputContainer.show()
            this.type = type
        })
        optionsInput.onChange(value => this.options = value.split(",").map(item => item.trim()))
        nameInput.onChange(value => {this.name = value; attrName.setText(`<${value}>`)})

        // footer buttons
        const footer = this.contentEl.createDiv({cls: "frontmatter-value-grid-footer"})
        const saveButton = new ButtonComponent(footer)
        saveButton.setIcon("checkmark")
        saveButton.onClick(() => {
            this.fileClass.updateAttribute(this.type, this.options, this.name, this.attr)
            this.close()
        })
        if(this.attr){
            const removeButton = new ButtonComponent(footer)
            removeButton.setIcon("trash")
            removeButton.onClick(() => {
                const confirmModal = new Modal(this.app)
                confirmModal.titleEl.setText("Please confirm")
                confirmModal.contentEl.createDiv().setText(`Do you really want to remove ${this.attr.name} attribute from ${this.fileClass.name}?`)
                const confirmFooter = confirmModal.contentEl.createDiv({cls: "frontmatter-value-grid-footer"})
                const confirmButton = new ButtonComponent(confirmFooter)
                confirmButton.setIcon("checkmark")
                confirmButton.onClick(() => {
                    this.fileClass.removeAttribute(this.attr)
                    confirmModal.close()
                    this.close()
                })
                const dismissButton = new ExtraButtonComponent(confirmFooter)
                dismissButton.setIcon("cross")
                dismissButton.onClick(() => this.close())
                confirmModal.open()
            })
        }
        const cancelButton = new ExtraButtonComponent(footer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
    }
}