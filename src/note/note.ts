import MetadataMenu from "main";
import { CachedMetadata, parseYaml, TFile } from "obsidian";
import { FieldPayload, FieldsPayload } from "src/commands/postValues";
import Field from "src/fields/Field";
import { objectTypes, FieldType, ReservedMultiAttributes, MultiDisplayType } from "src/types/fieldTypes";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { Line } from "./line";
import { Node } from "./node";
import * as Lookup from "src/types/lookupTypes";

export class Note {
    public lines: Line[] = []
    public fields: Field[] = []
    public cache: CachedMetadata | null

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
    ) {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || []
        this.cache = this.plugin.app.metadataCache.getFileCache(file)
    }

    public getField(fieldName: string): Field | undefined {
        return this.fields.find(field => field.name === fieldName)
    }

    public parseFieldValue(_rawValue: string, fieldType?: FieldType): string {
        if (_rawValue) {
            if (_rawValue.startsWith("[[")) {
                return `"${_rawValue}"`
            } else if (_rawValue.startsWith("#")) {
                return `${_rawValue}`;
            } else if (fieldType && objectTypes.includes(fieldType)) {
                return `\n  ${_rawValue.split("\n").join("\n  ")}`;
            } else {
                return parseYaml(_rawValue);
            };
        } else {
            return ""
        }
    }

    public renderMultiFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
        const values = rawValue
            .replace(/(\,\s+)/g, ',')
            .split(',')
            .filter(v => !!v)
            .map(value => itemRendering(value));
        return values.length ? values : ""
    }

    public renderFieldValue(
        fieldName: string,
        rawValue: string,
        location: "yaml" | "inline"
    ): any {
        const field = this.getField(fieldName)
        const type = field?.type
        switch (location) {
            case "yaml":
                switch (type) {
                    case FieldType.Lookup: return this.renderMultiFields(rawValue, (item) => this.parseFieldValue(item, type));
                    case FieldType.Multi: return this.renderMultiFields(rawValue, (item) => this.parseFieldValue(item, type));
                    case FieldType.MultiFile: return this.renderMultiFields(rawValue, (item) => `"${item}"`);
                    case FieldType.Canvas: return this.renderMultiFields(rawValue, (item) => item ? `${item}` : "");
                    case undefined: if ([...ReservedMultiAttributes, this.plugin.settings.fileClassAlias].includes(fieldName)) {
                        return this.renderMultiFields(rawValue, (item) => `${item}`)
                    } else {
                        return this.parseFieldValue(rawValue, type);
                    };
                    default: return this.parseFieldValue(rawValue, type);
                }
            case "inline":
                switch (type) {
                    case FieldType.Lookup: {
                        if (field &&
                            Lookup.bulletListLookupTypes.includes(field.options.outputType as Lookup.Type)
                        ) {
                            return this.renderMultiFields(rawValue, (item) => item);
                        } else {
                            return rawValue;
                        }
                    }
                    case FieldType.JSON: return JSON.stringify(JSON.parse(rawValue))
                    case FieldType.YAML: return rawValue;
                    default: return rawValue;
                }
        }
    }

    public async buildLines() {
        const content = await app.vault.read(this.file)
        const { end: frontMatterEnd } = getFrontmatterPosition(this.plugin, this.file)
        content.split("\n").forEach((rawLine, i) => {
            const position = !!frontMatterEnd?.line && i <= frontMatterEnd?.line ? "yaml" : "inline"
            new Line(this.plugin, this, position, rawLine, i)
        })
    }

    public getNodeForFieldName(fieldName: string): Node | undefined {
        for (const line of this.lines) {
            const node = line.nodes.find(_node => _node.field?.name === fieldName)
            if (node) return node
        }
        return undefined
    }

    public getNodeForFieldId(fieldId: string): Node | undefined {
        for (const line of this.lines) {
            const node = line.nodes.find(_node => _node.field?.id === fieldId)
            if (node) return node
        }
        return undefined
    }

    public insertField(fieldName: string, payload: FieldPayload, lineNumber?: number): void {

        const frontMatterEnd = getFrontmatterPosition(this.plugin, this.file)?.end?.line

        let insertLineNumber =
            (lineNumber ? Math.max(lineNumber, 0) : undefined) ||
            frontMatterEnd ||
            this.lines.last()?.number ||
            0

        const position = frontMatterEnd && (insertLineNumber <= frontMatterEnd) ? "yaml" : "inline"

        const createLine = (fieldName: string, value: string, position: "yaml" | "inline", lineNumber: number) => {
            const newLine = new Line(this.plugin, this, position, "", lineNumber)
            const newNode = new Node(this.plugin, newLine)
            newNode.createFieldNodeContent(fieldName, value, position);
            newLine.renderLine()
        }

        const field = this.getField(fieldName)
        if (field) {
            //look for ancestors
            const ancestors = field.getAncestors(this.plugin)
            ancestors.forEach((id, level) => {
                const node = this.getNodeForFieldId(id)
                if (node) {
                    insertLineNumber = node.line.number! + 1
                } else {
                    const ancestorField = this.fields.find(field => field.id === id)!
                    createLine(ancestorField.name, "", position, insertLineNumber)
                    insertLineNumber += 1
                }
            })

        }
        createLine(fieldName, payload.value, position, insertLineNumber)
    }


    public createOrUpdateFields(fields: FieldsPayload, lineNumber?: number): void {
        //TODO tester les JSON fields et YAML fields et Lookup fields
        fields.forEach(field => {
            const node = this.getNodeForFieldName(field.name)
            if (node && node.field) {
                //update : on déconstruit et reconstruit le node
                node.createFieldNodeContent(field.name, field.payload.value, node.line.position)
                node.line.renderLine()
            } else {
                //insert
                this.insertField(field.name, field.payload, lineNumber)
            }
        })
        this.plugin.fileTaskManager.pushTask(async () => { await this.plugin.app.vault.modify(this.file, this.renderNote()) })
    }

    public renderNote(): string {
        return this.lines.map(line => line.rawContent).join("\n")
    }
}