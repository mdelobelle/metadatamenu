import { TFile } from "obsidian"
import { replaceValues } from "./replaceValues"
import MetadataMenu from "main"
import { createFileClass } from "src/fileClass/fileClass";
import { getPropertySettings } from "src/commands/getPropertySettings";

function createInputField(
    plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldName: string,
    fieldContainer: HTMLElement,
    attrs?: { cls: string, attr: Record<string, string> }
): void {

    const fieldValue = dv.el('span', p[fieldName], attrs)
    const inputContainer = document.createElement("div")
    const input = document.createElement("input")
    input.setAttr("class", "metadata-menu-dv-input")
    inputContainer.appendChild(input)
    input.value = p[fieldName]
    /* end spacer */
    const spacer = document.createElement("div")
    spacer.setAttr("class", "metadata-menu-dv-field-spacer")
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
        fieldContainer.appendChild(fieldValue)
        fieldContainer.appendChild(spacer)
    }
    inputContainer.appendChild(cancelIcon)
    input.focus()

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
            fieldContainer.appendChild(button)
            fieldContainer.appendChild(fieldValue)
            fieldContainer.appendChild(spacer)
        }
    }
    /* button on click : remove button and field and display input field*/
    button.onclick = (e) => {
        fieldContainer.removeChild(fieldValue)
        fieldContainer.removeChild(button)
        fieldContainer.removeChild(spacer)
        fieldContainer.appendChild(inputContainer)
        input.focus()
    }
    /* initial state */
    fieldContainer.appendChild(button)
    fieldContainer.appendChild(fieldValue)
    fieldContainer.appendChild(spacer)
}

function createBooleanField(
    plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldName: string,
    fieldContainer: HTMLElement,
    attrs?: { cls: string, attr: Record<string, string> }
): void {
    const checkbox: HTMLInputElement = dv.el("input", "", { ...attrs, "type": "checkbox" })
    checkbox.checked = p[fieldName]
    fieldContainer.appendChild(checkbox)
    checkbox.onchange = (value) => {
        const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        if (file instanceof TFile && file.extension == "md") {
            replaceValues(plugin.app, file, fieldName, checkbox.checked.toString())
        }
    }
}

export async function fieldModifier(plugin: MetadataMenu, dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }): Promise<HTMLElement> {

    /* fieldContainer*/
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", "metadata-menu-dv-field-container")

    /* create fieldModifier depending on fileClass type or preset value*/

    if (p[fieldName] === undefined) {
        const emptyField = dv.el("span", null, attrs)
        fieldContainer.appendChild(emptyField)
    } else {
        const fileClassAlias = plugin.settings.fileClassAlias
        if (p[fileClassAlias]) {
            const fileClass = await createFileClass(plugin, p[fileClassAlias])
            const field = getPropertySettings(plugin, fieldName, fileClass)
            if (field?.isBoolean) {
                createBooleanField(plugin, dv, p, fieldName, fieldContainer, attrs)
            } else {
                createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
            }
        } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
            const field = getPropertySettings(plugin, fieldName)
            if (field?.isBoolean) {
                createBooleanField(plugin, dv, p, fieldName, fieldContainer, attrs)
            } else {
                createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
            }
        } else {
            createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
        }
    }
    return fieldContainer
}; 