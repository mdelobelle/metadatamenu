import { TFile } from "obsidian"
import { replaceValues } from "./replaceValues"
import MetadataMenu from "main"

export function fieldWithMenu(plugin: MetadataMenu, dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }): HTMLElement {
    /* fieldContainer*/
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", "metadata-menu-dv-field-container")

    /* field */
    const field = dv.el('span', p[fieldName], attrs)

    /* end spacer */
    const spacer = document.createElement("div")
    spacer.setAttr("class", "metadata-menu-dv-field-spacer")

    /* input with buttons */
    const inputContainer = document.createElement("div")
    const input = document.createElement("input")
    input.setAttr("class", "metadata-menu-dv-input")
    inputContainer.appendChild(input)
    input.value = p[fieldName]
    inputContainer.appendChild(input)

    const validateIcon = document.createElement("a")
    validateIcon.textContent = "✅"
    validateIcon.setAttr("class", "metadata-menu-dv-field-button")
    validateIcon.onclick = (e) => {
        const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        if (file instanceof TFile && file.extension == "md") {
            replaceValues(plugin.app, file, fieldName, input.value)
        }
        fieldContainer.removeChild(inputContainer)
    }
    inputContainer?.appendChild(validateIcon)
    const cancelIcon = document.createElement("a")
    cancelIcon.setAttr("class", "metadata-menu-dv-field-button")
    cancelIcon.textContent = "❌"
    cancelIcon.onclick = (e) => {
        fieldContainer.removeChild(inputContainer)
        fieldContainer.appendChild(button)
        fieldContainer.appendChild(field)
        fieldContainer.appendChild(spacer)
    }
    inputContainer.appendChild(cancelIcon)
    input.focus()

    /* button to display input */
    const button = document.createElement("button")
    button.setText("🖍")
    button.setAttr('class', "metadata-menu-dv-field-button")
    button.hide()
    spacer.show()
    fieldContainer.onmouseover = () => {
        button.show()
        spacer.hide()
    }
    fieldContainer.onmouseout = () => {
        button.hide()
        spacer.show()
    }

    input.onkeydown = (e) => {
        if (e.key === "Enter") {
            const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
            if (file instanceof TFile && file.extension == "md") {
                replaceValues(plugin.app, file, fieldName, input.value)
            }
            fieldContainer.removeChild(inputContainer)
        }
        if (e.key === 'Escape') {
            fieldContainer.removeChild(inputContainer)
            fieldContainer.append(button)
            fieldContainer.append(field)
        }
    }

    /* manage */
    /* initial state */
    fieldContainer.appendChild(button)
    fieldContainer.appendChild(field)
    fieldContainer.appendChild(spacer)

    /* button on click : remove button and field and display input field*/
    button.onclick = (e) => {
        fieldContainer.removeChild(field)
        fieldContainer.removeChild(button)
        fieldContainer.removeChild(spacer)
        fieldContainer.appendChild(inputContainer)
        input.focus()
    }


    return fieldContainer
}; 