import MetadataMenu from "main";
import {
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    TFile,
    parseYaml,
    Notice,
} from "obsidian";
import { FieldManager, FieldType, MultiDisplayType } from "src/types/fieldTypes";
import { genericFieldRegex, getLineFields, encodeLink } from "../utils/parser";
import FileField from "src/fields/fieldManagers/FileField";
import AbstractListBasedField from "src/fields/abstractFieldManagers/AbstractListBasedField";
import Field from "src/fields/Field";

interface IValueCompletion {
    attr: string;
    value: string;
};

export const listPrefix = "  - "

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private inFrontmatter: boolean = false;
    private inFullLine: boolean = false;
    private inSentence: boolean = false;
    private didSelect: boolean = false;
    private field?: Field;

    constructor(plugin: MetadataMenu) {
        super(plugin.app);
        this.plugin = plugin;
        this.setInstructions([{ command: "Shift", purpose: "remove space after::" }]);

        // @ts-ignore
        this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
            // @ts-ignore
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    };

    isInFrontmatter(editor: Editor, cursor: EditorPosition): boolean {
        let frontmatterEnd: number | undefined = undefined
        if (editor.getLine(0) === "---") {
            for (let i = 1; i <= editor.lastLine(); i++) {
                if (editor.getLine(i) === "---") {
                    frontmatterEnd = i;
                    break
                }
            }
        }
        return !!frontmatterEnd && cursor.line < frontmatterEnd
    }


    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile
    ): EditorSuggestTriggerInfo | null {
        if (this.didSelect) {
            this.didSelect = false
            return null
        }
        if (!this.plugin.settings.isAutosuggestEnabled) {
            return null;
        };
        if (file?.extension !== "md") return null
        if (editor.editorComponent?.table) return null
        const fullLine = editor.getLine(editor.getCursor().line)
        if (fullLine.startsWith("|")) return null
        this.inFrontmatter = this.isInFrontmatter(editor, cursor)
        if (this.inFrontmatter) {
            const regex = new RegExp(`^${genericFieldRegex}:(?<values>.*)`, "u");
            if (!regex.test(fullLine) && !fullLine.startsWith(listPrefix)) {
                return null
            } else {
                //make sure we have a space after ':'
                //find field
                const line = editor.getLine(cursor.line)
                const separatorPos = line.indexOf(":")
                if (!["", " "].includes(line.slice(separatorPos + 1, separatorPos + 2))) {
                    editor.replaceRange(" ", { line: cursor.line, ch: separatorPos + 1 }, { line: cursor.line, ch: separatorPos + 1 })
                }
            };
        } else if (getLineFields(fullLine).length === 0) {
            return null;
        }
        return {
            start: cursor,
            end: cursor,
            query: editor.getLine(cursor.line),
        };
    };

    private filterOption = (firstValues: string[] | undefined, lastValue: string | undefined, option: string): boolean => {
        return !firstValues ||
            !firstValues?.contains(encodeLink(option)) && (!lastValue ||
                !!lastValue && encodeLink(option).includes(lastValue))
    }

    private getAlias(tFile: TFile): string | undefined {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let alias: string | undefined = undefined;
        if (dvApi && this.field?.options.customRendering) {
            alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(tFile.path))
        }
        return alias
    }

    async getSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const suggestions = await this.getValueSuggestions(context);
        if (suggestions.length) {
            return suggestions;
        }
        return [];
    };

    async getValueSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const lineNumber = context.start.line;
        const matchField: { attribute?: string, values?: string[] } = { attribute: undefined, values: [] }
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api

        const splitValues = (values: string | undefined) => {
            return values?.replace(/^\[|^\s\[|^\(|^\s\(/, '')
                .replace(/\]$|\)$/, '')
                .split(",")
                .map(o => encodeLink(o.trim())) || ['']
        }

        const getFilteredOptionsList = (field: Field, firstValues: string[] | undefined, lastValue: string | undefined) => {
            const fieldManager = new FieldManager[field.type](this.plugin, this.field)
            const suggestions = (fieldManager as AbstractListBasedField)
                .getOptionsList(dvApi.page(this.context?.file.path))
                .filter(option => {
                    return this.filterOption(firstValues, lastValue, option)
                })
                .map(_value => Object({ attr: field.name, value: _value }))
            return suggestions
        }

        if (!this.inFrontmatter) {
            const lineFields = getLineFields(encodeLink(context.editor.getLine(lineNumber)));
            const position = context.editor.getCursor().ch
            const activeLineField = lineFields.find(lineField => lineField.index <= position && lineField.index + lineField.length >= position)
            if (activeLineField) {
                this.inSentence = activeLineField.index > 0;
                this.inFullLine = activeLineField.index === 0;
                matchField.attribute = activeLineField.attribute;
                matchField.values = splitValues(activeLineField.values);
            }
        } else {
            const fieldRegex = new RegExp(`^${genericFieldRegex}:(?<values>.+)?`, "u");
            const listItemRegex = new RegExp(`^${listPrefix}(?<values>.+)?`, "u");
            let fieldLine = lineNumber;
            while (!context.editor.getLine(fieldLine).includes(":") && fieldLine > 0) fieldLine = fieldLine - 1
            const regexResult = context.editor.getRange({ line: fieldLine, ch: 0 }, context.end).match(fieldRegex);
            if (regexResult?.groups) {
                matchField.attribute = regexResult.groups.attribute;
                matchField.values = splitValues(regexResult.groups.values)
            }
            let i = 1;
            while (context.editor.getLine(fieldLine + i).startsWith(listPrefix) && fieldLine + i <= context.editor.lastLine()) {
                const regexResult = context.editor.getLine(fieldLine + i).match(listItemRegex);
                if (regexResult?.groups) matchField.values?.push(...splitValues(regexResult.groups.values))
                i += 1;
            }
        };

        if (matchField.attribute) {
            const fieldName = matchField.attribute;
            this.field = this.plugin.fieldIndex.filesFields.get(context.file.path)?.find(f => f.name === fieldName);
            const valuesList = matchField.values
            const lastValue = valuesList?.last()
            const firstValues = valuesList?.slice(0, -1)

            //tags specific case
            if (fieldName === "tags" && this.inFrontmatter) {
                //@ts-ignore
                return Object.keys(this.plugin.app.metadataCache.getTags())
                    .filter(t => lastValue ? t.contains(lastValue) : t)
                    .sort()
                    .map(tag => Object({ attr: fieldName, value: tag.replace(/^#/, "") }))
            }
            if (this.field && [FieldType.Cycle, FieldType.Multi, FieldType.Select].contains(this.field.type)) {
                return getFilteredOptionsList(this.field, firstValues, lastValue)
            } else if (this.field && [FieldType.File, FieldType.MultiFile].includes(this.field.type)) {
                const sortingMethod = new Function("a", "b", `return ${this.field.options.customSorting}`) ||
                    function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
                const fieldManager: FileField = new FieldManager[this.field.type](this.plugin, this.field)
                const files = fieldManager.getFiles(this.context?.file).sort(sortingMethod as (a: TFile, b: TFile) => number);
                if (lastValue) {
                    const results = files
                        .filter(f => f.basename.toLowerCase().includes(lastValue.toLowerCase())
                            || this.getAlias(f)?.toLowerCase().includes(lastValue.toLowerCase()))
                        .map(f => {
                            return Object({
                                attr: fieldName,
                                value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, undefined, this.getAlias(f))
                            })
                        });
                    return results;
                } else {
                    return files
                        .map(f => {
                            let alias: string | undefined = undefined;
                            if (dvApi && this.field?.options.customRendering) {
                                alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(f.path))
                            }
                            return Object({ attr: fieldName, value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, undefined, alias) })
                        });
                }
            } else {
                return []
            }
        };
        return [];
    };

    renderSuggestion(suggestion: IValueCompletion, el: HTMLElement): void {
        el.addClass("metadata-menu")
        el.addClass("suggester")
        const [rawValue, alias] = `${suggestion.value}`.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")
        const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(rawValue, this.context!.file.path)
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi && this.field && this.field.options.customRendering && targetFile) {
            if (alias) {
                const suggestionContainer = el.createDiv({ cls: "item-with-alias" });
                suggestionContainer.createDiv({ text: alias })
                const filePath = suggestionContainer.createDiv({ cls: "item-with-alias-filepath" })
                filePath.setText(rawValue)
            } else {
                el.setText(new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(targetFile.path)))
            }
        } else {
            el.setText(rawValue)
        }
    };

    async selectSuggestion(suggestion: IValueCompletion, event: KeyboardEvent | MouseEvent): Promise<void> {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        };
        const editor = activeView.editor;
        const activeLine = editor.getLine(this.context!.start.line);
        const file = this.context?.file
        const position = this.context?.editor.getCursor().ch || 0
        const fieldName = suggestion.attr
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api

        const clean = (item: string) => {
            return item?.replace(/\s?\,$/, "")
        }

        if (this.inFrontmatter && file) {
            try {
                let beginFieldLineNumber = this.context!.start.line
                let endFieldLineNumber = this.context!.start.line
                while (!editor.getLine(beginFieldLineNumber).startsWith(`${fieldName}:`)
                    && beginFieldLineNumber > 0)
                    beginFieldLineNumber = beginFieldLineNumber - 1
                while (!editor.getLine(endFieldLineNumber + 1).includes(':')
                    && !(editor.getLine(endFieldLineNumber + 1) === "---")
                    && endFieldLineNumber + 1 <= this.context!.editor.lastLine())
                    endFieldLineNumber = endFieldLineNumber + 1
                const serializedField = editor.getRange(
                    { line: beginFieldLineNumber, ch: 0 },
                    { line: endFieldLineNumber, ch: editor.getLine(endFieldLineNumber).length })
                let parsedField: Record<string, string | string[] | null> = parseYaml(serializedField)
                let [attr, pastValues] = Object.entries(parsedField)[0]
                let newField: string
                if (this.field && this.field.getDisplay() === MultiDisplayType.asList) {
                    const fieldManager = new FieldManager[this.field.type](this.plugin, this.field)
                    const options = (fieldManager as AbstractListBasedField)
                        .getOptionsList(dvApi.page(this.context?.file.path))
                    //clean the past values in case the user has typed a comma to insert a new value, and append the new value
                    let valuesArray: string[] = [suggestion.value]
                    if (typeof pastValues == 'string') {
                        valuesArray = [...new Set([clean(pastValues), ...valuesArray]
                            .filter(item => options.includes(item)))]
                    } else if (Array.isArray(pastValues)) {
                        valuesArray = [...new Set([
                            ...pastValues
                                .filter(v => !!v)
                                .map(value => clean(value)),
                            ...valuesArray
                        ].filter(item => options.includes(item)))]
                    }
                    newField = `${attr}: ${valuesArray.map(value => `\n  - ${clean(value)}`).join("")}`
                } else if (fieldName === "tags" && this.plugin.settings.frontmatterListDisplay === MultiDisplayType.asList) {
                    let valuesArray: string[] = [suggestion.value]
                    //@ts-ignore
                    const options = Object.keys(this.plugin.app.metadataCache.getTags()).map(t => t.replace(/^#/, ""))
                    if (typeof pastValues == 'string') {
                        valuesArray = [...new Set([clean(pastValues), ...valuesArray]
                            .filter(item => options.includes(item)))]
                    } else if (Array.isArray(pastValues)) {
                        valuesArray = [...new Set([
                            ...pastValues
                                .filter(v => !!v)
                                .map(value => clean(value)),
                            ...valuesArray
                        ].filter(item => options.includes(item)))]
                    }
                    newField = `${attr}: ${valuesArray.map(value => `\n  - ${clean(value)}`).join("")}`
                } else {
                    // display as an array
                    if (!pastValues) {
                        newField = attr + ": " + suggestion.value;
                    } else if (typeof pastValues == 'string') {
                        if (!pastValues.contains(",")) {
                            newField = attr + ": " + suggestion.value;
                        } else {
                            const pastValuesArray = pastValues.split(",").map(o => o.trim()).slice(0, -1)
                            newField = attr + ": [" + pastValuesArray.join(', ') + ", " + clean(suggestion.value) + "]";
                        }
                    } else if (Array.isArray(pastValues)) {
                        if (activeLine.endsWith(",]") || activeLine.endsWith(", ]")) {
                            //value can be directly added since parseYaml wont create an empty last item in pastValues
                            newField = attr + ": [" + [...pastValues, clean(suggestion.value)].join(", ") + "]";
                        } else {
                            //we have typed something that we ahve to remove to replace with selected value
                            newField = attr + ": [" + [...pastValues.slice(0, -1), clean(suggestion.value)].join(", ") + "]";
                        }
                    } else {
                        newField = attr + ": [" + [...pastValues].join(", ") + "]";
                    }
                }
                editor.replaceRange(newField, { line: beginFieldLineNumber, ch: 0 }, { line: endFieldLineNumber, ch: editor.getLine(endFieldLineNumber).length });

                if (!(this.field?.getDisplay() === MultiDisplayType.asList)
                    && !(fieldName === "tags" && this.plugin.settings.frontmatterListDisplay === MultiDisplayType.asList)
                    && (Array.isArray(pastValues) || typeof pastValues === 'string' && pastValues.contains(","))) {
                    editor.setCursor({ line: beginFieldLineNumber, ch: newField.length - 1 })
                } else {
                    let endFieldLineNumber = this.context!.start.line
                    while (!editor.getLine(endFieldLineNumber + 1).includes(':') && !(editor.getLine(endFieldLineNumber + 1) === "---")) {
                        editor.getLine(endFieldLineNumber); endFieldLineNumber = endFieldLineNumber + 1
                    }
                    editor.setCursor({ line: endFieldLineNumber, ch: editor.getLine(endFieldLineNumber).length })
                }
            } catch (error) {
                new Notice("Frontmatter wrongly formatted", 2000)
                this.close()
                return
            }
        } else if (this.inFullLine && this.field && file) {
            //replace directly in place to maintain cursor position
            let cleanedLine = activeLine
            while (![',', ':'].contains(cleanedLine.charAt(cleanedLine.length - 1))) {
                cleanedLine = cleanedLine.slice(0, -1)
            }
            editor.replaceRange(`${cleanedLine}${event.shiftKey ? "" : " "}` + suggestion.value,
                { line: this.context!.start.line, ch: 0 }, this.context!.end);
        } else if (this.inSentence && this.field && file) {
            //replace directly in place to maintain cursor position
            let beforeCursor = activeLine.slice(0, position)
            let afterCursor = activeLine.slice(position)
            let separatorPos = position;
            let currentValueLength = 0;
            while (!beforeCursor.endsWith("::") && !beforeCursor.endsWith(",") && beforeCursor.length) {
                separatorPos = separatorPos - 1;
                currentValueLength = currentValueLength + 1
                beforeCursor = beforeCursor.slice(0, -1);
            }
            let nextBracketPos = position;
            while (!encodeLink(afterCursor).match("(\\]|\\)).*") && afterCursor.length) {
                nextBracketPos = nextBracketPos + 1;
                afterCursor = afterCursor.slice(nextBracketPos - position);
            }
            editor.replaceRange(
                suggestion.value,
                { line: this.context!.start.line, ch: separatorPos },
                { line: this.context!.start.line, ch: nextBracketPos }
            )
            editor.setCursor({ line: this.context!.start.line, ch: nextBracketPos - currentValueLength + suggestion.value.length })
        }
        this.didSelect = true
        this.close()
    };
};