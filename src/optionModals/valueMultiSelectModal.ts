import {App, Modal, ToggleComponent, TFile, ButtonComponent, ExtraButtonComponent, parseFrontMatterStringArray} from "obsidian"
import Field from "src/Field"
import { replaceValues } from "src/options/replaceValues"
import FieldSetting from "src/settings/FieldSetting"

export default class valueMultiSelectModal extends Modal {
    app: App
    file: TFile
    name: string
    settings: Field
    values: Array<string>
    lineNumber: number
    inFrontmatter: boolean
    top: boolean

    constructor(app: App, file: TFile, name: string, initialValues: string, settings: Field, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false){
        super(app)
        this.app = app
        this.file = file
        this.name = name
        this.settings = settings
        this.values = initialValues ? initialValues.toString().replace(/^\[(.*)\]$/,"$1").split(",").map(item => item.trim()) : []
        this.lineNumber = lineNumber
        this.inFrontmatter = inFrontMatter
        this.top = top
    }   

    onOpen(){
        const valueGrid = this.contentEl.createDiv({
            cls: "frontmatter-values-grid"
        })
        FieldSetting.getValuesListFromNote(this.settings.valuesListNotePath, this.app).then(listNoteValues => {
            this.populateValuesGrid(valueGrid, listNoteValues)
        })
    }

    buildValueToggler(valueGrid: HTMLDivElement,presetValue: string){
        const valueSelectorContainer = valueGrid.createDiv({
            cls: "frontmatter-value-selector-container"
        })
        const valueTogglerContainer = valueSelectorContainer.createDiv({
            cls: "frontmatter-value-selector-toggler"
        })
        const valueToggler = new ToggleComponent(valueTogglerContainer)
        this.values.forEach(value => {
            if (value == presetValue){
                valueToggler.setValue(true)
            }
        })
        valueToggler.onChange(value => {
            if(value && !this.values.includes(presetValue)){
                this.values.push(presetValue)
            }
            if(!value){
                this.values.remove(presetValue)
            }
        })
        const valueLabel = valueSelectorContainer.createDiv({
            cls: "frontmatter-value-selector-label"
        })
        valueLabel.setText(presetValue)
    }

    populateValuesGrid(valueGrid: HTMLDivElement, listNoteValues: string[]){
        Object.keys(this.settings.values).forEach(key => {
            const presetValue = this.settings.values[key]
            this.buildValueToggler(valueGrid, presetValue)
        })
        listNoteValues.forEach(value => {
            this.buildValueToggler(valueGrid, value)
        })
        const footer = this.contentEl.createDiv({
            cls: "frontmatter-value-grid-footer"
        })
        const saveButton = new ButtonComponent(footer)
        saveButton.setIcon("checkmark")
        saveButton.onClick(() => {
            if(this.lineNumber == -1){
                replaceValues(this.app, this.file, this.name, this.values.join(","))
            }else{
                this.app.vault.read(this.file).then(result => {
                    let newContent: string[] = []
                    if(this.top){
                        newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${this.values.join(",")}`)
                        result.split("\n").forEach((line, _lineNumber) => newContent.push(line))
                    } else {
                        result.split("\n").forEach((line, _lineNumber) => {
                            newContent.push(line)
                            if(_lineNumber == this.lineNumber){
                                newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${this.values.join(",")}`)
                            }
                        })
                    }
                    
                    this.app.vault.modify(this.file, newContent.join('\n'))
                    this.close()
                })
            }
            
            this.close()
        })
        const cancelButton = new ExtraButtonComponent(footer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
    }
}