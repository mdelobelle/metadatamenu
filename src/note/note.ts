import MetadataMenu from "main";
import { CachedMetadata, FrontMatterCache, parseYaml, TFile } from "obsidian";
import { FieldPayload } from "src/commands/postValues";
import Field from "src/fields/Field";
import { objectTypes, FieldType, ReservedMultiAttributes, MultiDisplayType } from "src/types/fieldTypes";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { Node } from "./node";

export class Note {
    public nodes: Node[] = []
    public fileFields: { id: string, field: Field, header: string }[] = []
    public cache: CachedMetadata | null

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
    ) {
        const fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || []
        this.cache = this.plugin.app.metadataCache.getFileCache(file)
        fields.forEach(field => {
            const fieldHeader = this.getFieldHeader(field);
            this.fileFields.push({
                id: field.id,
                header: fieldHeader,
                field: field
            })
        })
    }

    public getField(fieldName: string): Field | undefined {
        return this.fileFields.find(fF => fF.field.name === fieldName)?.field
    }

    public renderField(
        fieldName: string,
        rawValue: string,
        location: "yaml" | "inline"
    ): any {
        const field = this.getField(fieldName)
        const parseFieldValue = (_rawValue: string) => {
            if (_rawValue) {
                if (_rawValue.startsWith("[[")) {
                    return `"${_rawValue}"`
                } else if (_rawValue.startsWith("#")) {
                    return `${_rawValue}`;
                } else if (field?.type && objectTypes.includes(field?.type)) {
                    return `\n  ${_rawValue.split("\n").join("\n  ")}`;
                } else {
                    return parseYaml(_rawValue);
                };
            } else {
                return ""
            }
        }
        const renderMultiFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
            const values = rawValue
                .replace(/(\,\s+)/g, ',')
                .split(',')
                .filter(v => !!v)
                .map(value => itemRendering(value));
            return values.length ? values : ""
        }
        switch (location) {
            case "yaml":
                switch (field?.type) {
                    case FieldType.Lookup: return renderMultiFields(rawValue, (item) => parseFieldValue(item));
                    case FieldType.Multi: return renderMultiFields(rawValue, (item) => parseFieldValue(item));
                    case FieldType.MultiFile: return renderMultiFields(rawValue, (item) => `"${item}"`);
                    case FieldType.Canvas: return renderMultiFields(rawValue, (item) => item ? `${item}` : "");
                    case undefined: if ([...ReservedMultiAttributes, this.plugin.settings.fileClassAlias].includes(fieldName)) {
                        return renderMultiFields(rawValue, (item) => `${item}`)
                    } else {
                        return parseFieldValue(rawValue);
                    };
                    default: return parseFieldValue(rawValue);
                }
            case "inline":
                switch (field?.type) {
                    case FieldType.JSON: return JSON.stringify(JSON.parse(rawValue))
                    case FieldType.YAML: return rawValue; break;
                    default: return rawValue;
                }
        }
    }

    public getFieldHeader = (field: Field): string => {
        const ancestors = field.getAncestors(this.plugin);
        const level = ancestors.length
        return `${"  ".repeat(level)}${field.name}`
    }

    public async buildNodes() {
        const content = await app.vault.read(this.file)
        content.split("\n").forEach(async (line, i) => {
            const node = new Node(this.plugin, this, line)
            await node.buildNode()
            this.nodes.push(node)
        })
    }
    public indentAncestor = (field: Field, ancestor: string, level: number) => {
        const ancestorName = Field.getFieldFromId(this.plugin, ancestor, field.fileClassName)?.name || "unknown";
        return `${"  ".repeat(level)}${ancestorName}:`
    }
    public nestFieldName = (field: Field): [string, number | undefined] => {
        let insertLine: number | undefined
        let levelToInclude: number = 0
        const ancestors = field.getAncestors(this.plugin);
        const ancestorsToInclude: string[] = []
        ancestors.forEach((id, level) => {
            //check if a node exists with the ancestor if so: get the line
            const node = this.nodes.find(node => node.field?.field.id === id)
            if (node) {
                insertLine = this.nodes.indexOf(node) + 1
                levelToInclude = level
            } else {
                ancestorsToInclude.push(id)
            }
        })
        const level = ancestors.length
        return [`${ancestorsToInclude.map((ancestor, i) =>
            this.indentAncestor(field, ancestor, levelToInclude + 1 + i)).join("\n")
            }${level === 0 ? "" : "\n"
            }${"  ".repeat(level)
            }${field.name}`, insertLine]
    }
    public nestItem = (field: Field, value: any) => {
        const ancestors = field.getAncestors(this.plugin);
        const level = ancestors.length
        return `${"  ".repeat(level)}- ${value}`
    }

    public createNodeContent(fieldName: string, payload: FieldPayload, location: "yaml" | "inline"): [string[], number | undefined] {
        const field = this.getField(fieldName)
        let insertLine: number | undefined
        let newContent = []
        if (field) {
            const [fieldHeader, _insertLine] = this.nestFieldName(field)
            insertLine = _insertLine
            const newValue = this.renderField(fieldName, payload.value, location)

            if (Array.isArray(newValue)) {
                if (field?.getDisplay(this.plugin) === MultiDisplayType.asList) {
                    newContent.push(`${fieldHeader}:`)
                    newValue.filter(v => !!v).forEach(item => {
                        newContent.push(this.nestItem(field, item))
                    });
                } else {
                    newContent.push(`${fieldHeader}: [${newValue.join(", ")}]`);
                }
            } else {
                newContent.push(`${fieldHeader}: ${newValue}`);
            }
        } else {
            newContent.push(`${fieldName}: ${payload.value}`);
        }
        return [newContent, insertLine]
    }

    public updateNode(fieldName: string, payload: FieldPayload, location: "yaml" | "inline") {

    }

    public createOrUpdateNodeInFrontmatter(fields: Record<string, FieldPayload>) {
        Object.entries(fields).forEach(([fieldName, payload]) => {
            const node = this.nodes.find(node => node.field?.field.name === fieldName)
            if (node && node.field) {
                const newValue = this.renderField(fieldName, payload.value, "yaml")
                node.rawContent = `${node.field.header}: ${newValue}`
            } else {
                const [nodeContent, insertLine] = this.createNodeContent(fieldName, payload, "yaml")
                const newNode = new Node(this.plugin, this, nodeContent.join("\n"))
                const frontmatterEndLine = getFrontmatterPosition(this.plugin, this.file).end!.line
                if (frontmatterEndLine) {
                    this.nodes.splice(insertLine || frontmatterEndLine, 0, newNode)
                } else {

                }
            }
        })
    }

    public renderNode() {
        return this.nodes.map(node => node.rawContent).join("\n")
    }
}