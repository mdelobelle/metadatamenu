
import { Constructor } from "src/typings/types";
import { getLink } from "src/utils/parser";
import { IFieldManager, Target, isSingleTargeted } from "../Field";
import { BaseOptions, IFieldBase } from "../base/BaseField";
import { ISettingsModal } from "../base/BaseSetting";
import * as AbstractCanvas from "./abstractModels/AbstractCanvas";

export class Base implements IFieldBase {
    type = <const>"CanvasGroup"
    tagName = "canvas-links"
    icon = "box-select"
    tooltip = "Updates with groups in canvas"
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
    groupColors: string[]
    groupLabels: string[]

}

export const DefaultOptions: DefaultedOptions = {
    ...AbstractCanvas.DefaultOptions,
    groupColors: [],
    groupLabels: [],
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
            //initial values
            const container = this.optionsContainer
            const options = this.field.options as DefaultedOptions
            options.groupColors = (options.groupColors as string[] | undefined) || []
            options.nodeColors = (options.nodeColors as string[] | undefined) || []
            options.edgeColors = (options.edgeColors as string[] | undefined) || []
            options.edgeFromSides = (options.edgeFromSides as string[] | undefined) || []
            options.edgeToSides = (options.edgeToSides as string[] | undefined) || []
            options.groupLabels = (options.groupLabels as string[] | undefined) || []
            options.edgeLabels = (options.edgeLabels as string[] | undefined) || []
            options.direction = (options.direction as "incoming" | "outgoing" | "bothsides") || "bothsides"

            //containers layout
            const canvasPathContainer = container.createDiv({ cls: "field-container" });
            const groupColorsContainer = container.createDiv({ cls: "field-container colors" });
            const groupLabelsContainer = container.createDiv({ cls: "field-container labels" });
            const newGroupLabelContainer = container.createDiv({ cls: "field-container" })
            container.createEl("hr");
            const directionContainer = container.createDiv({ cls: "field-container" });
            const edgeColorsContainer = container.createDiv({ cls: "field-container colors" });
            const edgeFromSidesContainer = container.createDiv({ cls: "field-container edges" });
            container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
            const edgeToSidesContainer = container.createDiv({ cls: "field-container egdes" })
            container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
            const edgeLabelsContainer = container.createDiv({ cls: "field-container labels" });
            const newEdgeLabelContainer = container.createDiv({ cls: "field-container" })
            container.createEl("hr");
            const nodeColorsContainer = container.createDiv({ cls: "field-container colors" });
            const filesFromDVQueryTopContainer = container.createDiv({ cls: "vstacked" });

            //builders
            const groupLabelsTitle = "Groups matching labels: "
            const edgeLabelsTitle = "Edges matching labels: "

            this.createCanvasPathContainer(canvasPathContainer)
            this.createDirectionContainer(directionContainer, `Direction of the edges pointing to those groups`)
            this.createDvQueryContainer(filesFromDVQueryTopContainer, "Matching files connected to those groups")
            this.buildColorsContainer(groupColorsContainer, options.groupColors, "Groups matching colors:");
            this.buildColorsContainer(nodeColorsContainer, options.nodeColors, "Groups' connected nodes matching colors:");
            this.buildColorsContainer(edgeColorsContainer, options.edgeColors, "Groups' edges matching colors:")
            this.buildLabelsContainer(groupLabelsContainer, options.groupLabels, groupLabelsTitle);
            this.buildLabelsContainer(edgeLabelsContainer, options.edgeLabels, edgeLabelsTitle);
            this.buildEdgeSideContainer(edgeFromSidesContainer, options.edgeFromSides, "Groups' edges matchin From side:")
            this.buildEdgeSideContainer(edgeToSidesContainer, options.edgeToSides, "Groups' edges matchin To side:")
            this.buildNewLabelContainer(groupLabelsContainer, groupLabelsTitle, newGroupLabelContainer, options.groupLabels, "Add a new matching group name")
            this.buildNewLabelContainer(edgeLabelsContainer, edgeLabelsTitle, newEdgeLabelContainer, options.edgeLabels, "Add a new matching edge label")
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return AbstractCanvas.valueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractCanvas.displayValue(managedField, container, onClicked)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractCanvas.validateValue(managedField)
}
