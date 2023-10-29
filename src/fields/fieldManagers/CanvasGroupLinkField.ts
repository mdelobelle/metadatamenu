import MetadataMenu from "main"
import { TFile, Menu, TextComponent } from "obsidian"
import { postValues } from "src/commands/postValues"
import { FieldOptions } from "src/components/NoteFields"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import FieldSettingsModal from "src/settings/FieldSettingsModal"
import { FieldType } from "src/types/fieldTypes"
import { ExistingField } from "../existingField"
import Field from "../Field"
import { SettingLocation } from "../FieldManager"
import AbstractCanvasBasedField from "./AbstractCanvasBasedField"

export default class CanvasGroupLinkField extends AbstractCanvasBasedField {

    canvasPathInput: TextComponent;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.CanvasGroupLink)
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        //no field option to add for this field, it is automatically updated
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, eF?: ExistingField,
        indexedPath?: string, lineNumber?: number, asList?: boolean, asComment?: boolean): Promise<void> {
        await postValues(this.plugin, [{ id: indexedPath || this.field.id, payload: { value: "" } }], file, lineNumber, asList, asComment)
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined }): void {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        fieldContainer.appendChild(fieldValue);
    }

    createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {

        //options
        //init values
        const options = this.field.options
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

    getOptionsStr(): string {
        return ""
    }

    validateOptions(): boolean {
        let error = false;
        if (!(this.field.options.canvasPath as string)?.endsWith(".canvas")) {
            error = true;
            FieldSettingsModal.setValidationError(
                this.canvasPathInput,
                "This is not a canvas file"
            );
        }
        return !error
    }
}