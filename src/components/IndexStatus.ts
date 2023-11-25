import MetadataMenu from "main";
import { ButtonComponent, Component, FileView, MarkdownEditView, TFile, View } from "obsidian";
import { updateFormulas } from "src/commands/updateFormulas";
import { updateLookups } from "src/commands/updateLookups";
import { FieldType } from "src/types/fieldTypes";
import { Status } from "src/types/lookupTypes";


enum Statuses {
    "indexing" = "indexing",
    "indexed" = "indexed",
    "update" = "update",
}

const statusIcon: Record<keyof typeof Statuses, string> = {
    "indexing":
        `<svg class="svg-icon sync" xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" viewBox="0 0 24 24" fill="none">
            <path
                d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1" />
            <path class="rotating" id="arrow"
                d="M12 10v4h4 m-4 0 1.5-1.5c.9-.9 2.2-1.5 3.5-1.5s2.6.6 3.5 1.5c.4.4.8 1 1 1.5 M22 22v-4h-4 m4 0-1.5 1.5c-.9.9-2.1 1.5-3.5 1.5s-2.6-.6-3.5-1.5c-.4-.4-.8-1-1-1.5" />

            <animateTransform href="#arrow" attributeName="transform" type="rotate" from="0 17 16" to="-180 17 16"
                begin="0s" dur="1s" repeatCount="indefinite" />
        </svg>`,
    "indexed":
        `<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" viewBox="0 0 24 24" fill="none">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            <path class="check-mark" d="m9 13 2 2 4-4"/>
        </svg>`,
    "update":
        `<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke="red" d="M8.42 10.61a2.1 2.1 0 1 1 2.97 2.97L5.95 19 2 20l.99-3.95 5.43-5.44Z"/>
            <path d="M2 11.5V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"/>
        </svg>`
}

const statusTooltip: Record<keyof typeof Statuses, string> = {
    "indexing": "Metadata Menu: indexing fields",
    "indexed": "Metadata Menu: field index complete",
    "update": "Click to update lookups and formulas"
}

export default class IndexStatus extends Component {

    public statusBtn: ButtonComponent;
    public statusIcon: HTMLSpanElement;
    public state: keyof typeof Statuses = Statuses.indexed;
    public file: TFile | undefined

    constructor(private plugin: MetadataMenu) {
        super()
    };

    public setState(state: keyof typeof Statuses) {
        this.state = state;
        this.statusBtn.setTooltip(statusTooltip[state], { placement: "top" })
        for (const status in Statuses) {
            this.statusIcon.removeClass(status)
        }
        this.statusIcon.addClass(state)
        this.statusIcon.innerHTML = statusIcon[state]
    }

    onload(): void {
        const indexStatus = this.plugin.addStatusBarItem()
        const container = indexStatus.createEl("div", { cls: "status-bar-item-segment" })

        this.statusBtn = new ButtonComponent(container)
        this.statusBtn.setClass("status-item-btn")
        this.statusIcon = this.statusBtn.buttonEl.createEl("span", { cls: "status-bar-item-icon sync-status-icon" })
        this.setState("indexed")
        this.statusBtn.onClick(async () => {
            let updatesToApply = false
            if (this.state === "update") {
                const dvQFields = this.getdvQFieldsToUpdate()
                await Promise.all(dvQFields.map(async field => {
                    if (this.file) {
                        if (field.type === FieldType.Lookup) {
                            await updateLookups(this.plugin, { file: this.file, fieldName: field.name });
                            updatesToApply = true
                        } else if (field.type === FieldType.Formula) {
                            await updateFormulas(this.plugin, { file: this.file, fieldName: field.name })
                        }
                    }
                })
                )
            }
            if (updatesToApply) this.plugin.fieldIndex.applyUpdates()
        })
    }

    onunload(): void {
        const indexStatusEl = document.querySelector(".status-bar-item.plugin-metadata-menu")
        if (indexStatusEl) this.plugin.app.statusBar.containerEl.removeChild(indexStatusEl)
    }

    public getdvQFieldsToUpdate() {
        if (this.file) {
            const index = this.plugin.fieldIndex
            const fileDVQFields = index.filesLookupsAndFormulasFields.get(this.file.path) || []
            return fileDVQFields.filter(field => [FieldType.Lookup, FieldType.Formula].includes(field.type))
        }
        return []
    }

    public checkForUpdate(view: View | undefined) {
        if (view && view instanceof FileView && view.file) {
            const file = this.plugin.app.vault.getAbstractFileByPath(view.file.path)
            if (file instanceof TFile && file.extension === 'md') {
                this.file = file
                if (this.plugin.fieldIndex.dvQFieldChanged(file.path)) {
                    this.setState("update")
                } else {
                    this.setState("indexed")
                }
            } else {
                this.file = undefined
            }
        } else {
            this.file = undefined
        }
    }
}