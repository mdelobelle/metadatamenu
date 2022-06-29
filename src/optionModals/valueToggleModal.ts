import {App, Modal, ToggleComponent, TFile} from "obsidian"
import { replaceValues } from "src/options/replaceValues"

export default class valueToggleModal extends Modal {
    app: App
    file: TFile
    name: string
    value: boolean

    constructor(app: App, file: TFile, name: string, value: boolean){
        super(app)
        this.app = app
        this.file = file
        this.name = name
        this.value = value
    }

    onOpen(){
        const inputDiv = this.contentEl.createDiv({
            cls: "frontmatter-toggler"
        })
        this.buildInputEl(inputDiv)
    }

    buildInputEl(inputDiv: HTMLDivElement): void{
        const inputEl = new ToggleComponent(inputDiv)
        inputEl.setValue(this.value)
        inputEl.onChange(v => {
            replaceValues(this.app, this.file, this.name, v ? "true" : "false")
        })
    }
}