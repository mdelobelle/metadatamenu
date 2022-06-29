import {DropdownComponent} from "obsidian"

export default class SelectModal extends DropdownComponent {
    modals: Record<string, any>

    constructor(containerEl: HTMLElement){
        super(containerEl)
        this.modals = {}
    }
}