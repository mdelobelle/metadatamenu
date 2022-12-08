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

interface IValueCompletion {
    value: string;
};

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
            if (!regex.test(fullLine)) return null;
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
            const firstValues = valuesList?.slice(0, -1)
            //tags specific case
            if (fieldName === "tags" && this.inFrontmatter) {
                //@ts-ignore
                return Object.keys(this.plugin.app.metadataCache.getTags())
                    .filter(t => lastValue ? t.contains(lastValue) : t)
                    .sort()
                    .map(tag => Object({ value: tag.replace(/^#/, "") }))
            }
            if (this.field && [FieldType.Cycle, FieldType.Multi, FieldType.Select].contains(this.field.type)) {
                const fieldManager = new FieldManager[this.field.type](this.plugin, this.field)

                return (fieldManager as AbstractListBasedField)
                    .getOptionsList(dvApi.page(this.context?.file.path))
                    .filter(option => this.filterOption(firstValues, lastValue, option))
                    .map(_value => Object({ value: _value }))
            } else if (this.field && [FieldType.File, FieldType.MultiFile].includes(this.field.type)) {
                const sortingMethod = new Function("a", "b", `return ${this.field.options.customSorting}`) || function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
                const fieldManager: FileField = new FieldManager[this.field.type](this.plugin, this.field)
                const files = fieldManager.getFiles(this.context?.file).sort(sortingMethod as (a: TFile, b: TFile) => number);
                if (lastValue) {
                    return files
                        .filter(f => f.basename.toLowerCase().includes(lastValue) || this.getAlias(f)?.toLowerCase().includes(lastValue))
                        .map(f => {
                            return Object({ value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, this.getAlias(f)) })
                        });
                } else {
                    return files
                        .map(f => {
                            let alias: string | undefined = undefined;
                            if (dvApi && this.field?.options.customRendering) {
                                alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(f.path))
                            }
                            return Object({ value: FileField.buildMarkDownLink(this.plugin, context.file, f.basename, alias) })
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

    selectSuggestion(suggestion: IValueCompletion, event: KeyboardEvent | MouseEvent): void {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        };
        const editor = activeView.editor;
        const activeLine = editor.getLine(this.context!.start.line);

        if (this.inFrontmatter) {
            //format list if in frontmatter
            try {
                let parsedField: Record<string, string | string[] | null> = parseYaml(activeLine)
                let [attr, pastValues] = Object.entries(parsedField)[0]
                let newField: string
                if (!pastValues) {
                    newField = attr + ": " + suggestion.value;
                } else if (typeof pastValues == 'string') {
                    if (!pastValues.contains(",")) {
                        newField = attr + ": " + suggestion.value;
                    } else {
                        newField = attr + ": [" + pastValues.split(",").map(o => o.trim()).slice(0, -1).join(', ') + ", " + suggestion.value + "]";
                    }
                } else if (Array.isArray(pastValues)) {
                    if (activeLine.endsWith(",]") || activeLine.endsWith(", ]")) {
                        //value can be directly added since parseYaml wont create an empty last item in pastValues
                        newField = attr + ": [" + [...pastValues, suggestion.value].join(", ") + "]";
                    } else {
                        //we have typed something that we ahve to remove to replace with selected value
                        newField = attr + ": [" + [...pastValues.slice(0, -1), suggestion.value].join(", ") + "]";
                    }

                } else {
                    newField = attr + ": [" + [...pastValues].join(", ") + "]";
                }
                editor.replaceRange(newField, { line: this.context!.start.line, ch: 0 }, { line: this.context!.start.line, ch: activeLine.length });
                if (Array.isArray(pastValues) || typeof pastValues === 'string' && pastValues.contains(",")) {
                    editor.setCursor({ line: this.context!.start.line, ch: newField.length - 1 })
                } else {
                    editor.setCursor({ line: this.context!.start.line, ch: newField.length })
                }
            } catch (error) {
                new Notice("Frontmatter wrongly formatted", 2000)
                this.close()
                return
            }
        } else if (this.inFullLine) {
            let cleanedLine = activeLine
            while (![',', ':'].contains(cleanedLine.charAt(cleanedLine.length - 1))) {
                cleanedLine = cleanedLine.slice(0, -1)
            }
            editor.replaceRange(`${cleanedLine}${event.shiftKey ? " " : ""}` + suggestion.value,
                { line: this.context!.start.line, ch: 0 }, this.context!.end);
        } else if (this.inSentence) {
            const position = this.context?.editor.getCursor().ch || 0
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