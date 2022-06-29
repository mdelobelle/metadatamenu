import {App, Modal, TextComponent, TFile} from "obsidian"
import { replaceValues } from "src/options/replaceValues"

export default class valueTextInputModal extends Modal {
    app: App
    file: TFile
    name: string
    value: string
    lineNumber: number
    inFrontmatter: boolean
    top: boolean

    constructor(app: App, file: TFile, name: string, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false){
        super(app)
        this.app = app
        this.file = file
        this.name = name
        this.value = value
        this.lineNumber = lineNumber
        this.inFrontmatter = inFrontMatter
        this.top = top
    }

    onOpen(){
        const inputDiv = this.contentEl.createDiv({
            cls: "frontmatter-modal-value"
        })
        this.buildInputEl(inputDiv)
    }

    buildInputEl(inputDiv: HTMLDivElement): void{
        const form = inputDiv.createEl("form")
        form.type = "submit";
        form.onsubmit = (e: Event) => {
            e.preventDefault()
            if(this.lineNumber == -1){
                replaceValues(this.app, this.file, this.name, inputEl.getValue())
            }
            else {
                this.app.vault.read(this.file).then(result => {
                    let newContent: string[] = []
                    if(this.top){
                        newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${inputEl.getValue()}`)
                        result.split("\n").forEach((line, _lineNumber) => newContent.push(line))
                    } else {
                        result.split("\n").forEach((line, _lineNumber) => {
                            newContent.push(line)
                            if(_lineNumber == this.lineNumber){
                                newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${inputEl.getValue()}`)
                            }
                        })
                    }
                    this.app.vault.modify(this.file, newContent.join('\n'))
                    this.close()
                })
            }
            this.close()
        }
        const inputEl = new TextComponent(form)
        inputEl.inputEl.focus()
        inputEl.setValue(this.value)
        inputEl.inputEl.addClass("frontmatter-prompt-input")

    }
}