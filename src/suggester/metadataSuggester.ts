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
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { genericFieldRegex, getLineFields, encodeLink } from "../utils/parser";
import FileField from "src/fields/fieldManagers/FileField";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";
import Field from "src/fields/Field";
import { postValues } from "src/commands/postValues";

interface IValueCompletion {
    attr: string;
    value: string;
};

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private inFrontmatter: boolean = false;
    private inFullLine: boolean = false;
    private inSentence: boolean = false;
    private didSelect: boolean = false;
    private field?: Field;
    private lastValue: string = ""

    constructor(plugin: MetadataMenu) {
        super(plugin.app);
        this.plugin = plugin;
        this.setInstructions([{ command: "Shift", purpose: "put a space after::" }]);

        // @ts-ignore
        this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
            // @ts-ignore
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    };

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
        const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
        const fullLine = editor.getLine(editor.getCursor().line)
        this.inFrontmatter = !!frontmatter &&
            frontmatter.position.start.line < cursor.line &&
            cursor.line < frontmatter.position.end.line
        if (this.inFrontmatter) {
            const regex = new RegExp(`^${genericFieldRegex}:(?<values>.*)`, "u");
            if (!regex.test(fullLine)) {
                return null
            } else {
                //make sure we have a space after ':'
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
        const matchField: { attribute?: string, values?: string } = { attribute: undefined, values: "" }
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (!this.inFrontmatter) {
            const lineFields = getLineFields(encodeLink(context.editor.getLine(lineNumber)));
            const position = context.editor.getCursor().ch
            const activeLineField = lineFields.find(lineField => lineField.index <= position && lineField.index + lineField.length >= position)
            if (activeLineField) {
                this.inSentence = activeLineField.index > 0;
                this.inFullLine = activeLineField.index === 0;
                matchField.attribute = activeLineField.attribute;
                matchField.values = activeLineField.values;
            }
        } else {
            const regex = new RegExp(`^${genericFieldRegex}:(?<values>.+)?`, "u");
            const regexResult = context.editor.getRange({ line: lineNumber, ch: 0 }, context.end).match(regex);
            if (regexResult?.groups) {
                matchField.attribute = regexResult.groups.attribute;
                matchField.values = regexResult.groups.values;
            }
        };

        if (matchField.attribute) {
            const fieldName = matchField.attribute;
            this.field = this.plugin.fieldIndex.filesFields.get(context.file.path)?.find(f => f.name === fieldName);
            const valuesList = matchField.values?.replace(/^\[|^\s\[|^\(|^\s\(/, '')
                .replace(/\]$|\)$/, '')
                .split(",").map(o => encodeLink(o.trim()))
            const lastValue = valuesList?.last()
            this.lastValue = lastValue || "";
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
                const fieldManager = new FieldManager[this.field.type](this.plugin, this.field)

                return (fieldManager as AbstractListBasedField)
                    .getOptionsList(dvApi.page(this.context?.file.path))
                    .filter(option => this.filterOption(firstValues, lastValue, option))
                    .map(_value => Object({ attr: fieldName, value: _value }))
            } else if (this.field && [FieldType.File, FieldType.MultiFile].includes(this.field.type)) {
                const sortingMethod = new Function("a", "b", `return ${this.field.options.customSorting}`) || function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
                const fieldManager: FileField = new FieldManager[this.field.type](this.plugin, this.field)
                const files = fieldManager.getFiles(this.context?.file).sort(sortingMethod as (a: TFile, b: TFile) => number);
                if (lastValue) {
                    return files
                        .filter(f => f.basename.toLowerCase().includes(lastValue) || this.getAlias(f)?.toLowerCase().includes(lastValue))
                        .map(f => {
                            return Object({ attr: fieldName, value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, this.getAlias(f)) })
                        });
                } else {
                    return files
                        .map(f => {
                            let alias: string | undefined = undefined;
                            if (dvApi && this.field?.options.customRendering) {
                                alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(f.path))
                            }
                            return Object({ attr: fieldName, value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, alias) })
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
        const [rawValue, alias] = suggestion.value.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")
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
        if (this.inFrontmatter && file) {
            try {
                const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter
                //very edge case where when typing on the line, the frontmatter value of a list gets tampered as "a - non - indented - list" but as a string, let's split that
                const currentValues: string[] = frontmatter?.[fieldName] ? Array.isArray(frontmatter[fieldName]) ? frontmatter[fieldName] : frontmatter[fieldName].split(" - ") : []
                const filteredTags = currentValues.filter(t => t !== this.lastValue)

                const value = [...filteredTags, suggestion.value].join(",")
                await postValues(this.plugin, [{ name: fieldName, payload: { value: value, addToCurrentValues: false } }], file)
                editor.replaceRange(
                    "",
                    { line: this.context!.start.line, ch: position - this.lastValue.length },
                    { line: this.context!.start.line, ch: position }
                )
                editor.setCursor({ line: this.context!.start.line, ch: editor.getLine(this.context!.start.line).length })
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
            editor.replaceRange(`${cleanedLine}${event.shiftKey ? " " : ""}` + suggestion.value,
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