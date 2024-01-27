
import { Constructor } from "src/typings/types";
import { getLink } from "src/utils/parser";
import { IFieldManager, Target, isSingleTargeted } from "../Field";
import { IFieldBase } from "../base/BaseField";
import { ISettingsModal } from "../base/BaseSetting";
import * as AbstractCanvas from "./abstractModels/AbstractCanvas";

export class Base implements IFieldBase {
    type = <const>"Canvas"
    tagName = "canvas-links"
    icon = "layout-dashboard"
    tooltip = "Updates with links in canvas"
    colorClass = "file"
}

export interface Options extends AbstractCanvas.Options {
}

export interface DefaultedOptions extends Options {
    direction: AbstractCanvas.Direction
    nodeColors: string[]
    edgeColors: string[]
    edgeFromSides: string[]
    edgeToSides: string[]
    edgeLabels: string[]
}

export const DefaultOptions: AbstractCanvas.DefaultedOptions = {
    ...AbstractCanvas.DefaultOptions,
    direction: "bothsides",
    nodeColors: [],
    edgeColors: [],
    edgeFromSides: [],
    edgeToSides: [],
    edgeLabels: []
}

export function settingsModal(Base: Constructor<ISettingsModal<AbstractCanvas.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractCanvas.settingsModal(Base)
    return class SettingModal extends base {
        //options
        //initial values
        createSettingContainer(): void {
            const container = this.optionsContainer
            const options = this.field.options as DefaultedOptions
            options.direction = (options.direction as "incoming" | "outgoing" | "bothsides") || "bothsides"
            options.nodeColors = (options.nodeColors as string[] | undefined) || []
            options.edgeColors = (options.edgeColors as string[] | undefined) || []
            options.edgeFromSides = (options.edgeFromSides as string[] | undefined) || []
            options.edgeToSides = (options.edgeToSides as string[] | undefined) || []
            options.edgeLabels = (options.edgeLabels as string[] | undefined) || []

            //layout
            const canvasPathContainer = container.createDiv({ cls: "field-container" });
            container.createEl("hr");
            const directionContainer = container.createDiv({ cls: "field-container" });
            const edgeColorsContainer = container.createDiv({ cls: "field-container colors" });
            const edgeFromSidesContainer = container.createDiv({ cls: "field-container edges" })
            container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
            const edgeToSidesContainer = container.createDiv({ cls: "field-container egdes" })
            container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
            const edgeLabelsContainer = container.createDiv({ cls: "field-container labels" });
            const newEdgeLabelContainer = container.createDiv({ cls: "field-container" });
            container.createEl("hr");
            const nodeColorsContainer = container.createDiv({ cls: "field-container colors" });
            const filesFromDVQueryTopContainer = container.createDiv({ cls: "vstacked" })

            //builders
            this.createCanvasPathContainer(canvasPathContainer)
            this.createDirectionContainer(directionContainer, `Direction of the edges pointing to those nodes`)
            this.createDvQueryContainer(filesFromDVQueryTopContainer, "Matching files")
            this.buildColorsContainer(nodeColorsContainer, options.nodeColors, "Node matching colors:");
            this.buildColorsContainer(edgeColorsContainer, options.edgeColors, "Edge matching colors:")
            this.buildEdgeSideContainer(edgeFromSidesContainer, options.edgeFromSides, "Edges matchin From side:")
            this.buildEdgeSideContainer(edgeToSidesContainer, options.edgeToSides, "Edges matchin To side:")
            this.buildLabelsContainer(edgeLabelsContainer, options.edgeLabels, "Edges matching labels: ");
            this.buildNewLabelContainer(edgeLabelsContainer, "Edges matching labels: ", newEdgeLabelContainer, options.edgeLabels, "Add a new matching edge label")
        }
    }
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    if (!isSingleTargeted(managedField)) return
    const value = managedField.value
    const values = Array.isArray(value) ? value : [value]
    values.forEach((value, i) => {
        const link = getLink(value, managedField.target)
        if (link?.path) {
            const linkText = link.path.split("/").last() || ""
            const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
            linkEl.onclick = () => {
                managedField.plugin.app.workspace.openLinkText(value.path, managedField.target.path, true)
                onClicked()
            }
        } else {
            container.createDiv({ text: value });
        }
        if (i < values.length - 1) {
            container.createEl('span', { text: " | " })
        }
    })
    container.createDiv()
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractCanvas.validateValue(managedField)
}
