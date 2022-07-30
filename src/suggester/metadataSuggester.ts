import MetadataMenu from "main";
import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    TFile,
    parseYaml,
    Notice
} from "obsidian";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { genericFieldRegex } from "../utils/parser";

interface IValueCompletion {
    value: string;
};

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private app: App;
    private fileClass: FileClass;
    private inFrontmatter: boolean = false;
    private didSelect: boolean = false

    constructor(app: App, plugin: MetadataMenu) {
        super(app);
        this.app = app;
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
        //@ts-ignore
        const frontmatter = this.plugin.app.metadataCache.getFileCache(file).frontmatter;

        this.inFrontmatter = frontmatter !== undefined && frontmatter.position.start.line < cursor.line && cursor.line < frontmatter.position.end.line
        const regex = this.inFrontmatter ? new RegExp(`^${genericFieldRegex}:(?<values>.*)`, "u") : new RegExp(`^${genericFieldRegex}::(?<values>.*)`, "u")
        const fullLine = editor.getLine(editor.getCursor().line)
        if (!regex.test(fullLine)) {
            return null
        }
        return {
            start: cursor,
            end: cursor,
            query: editor.getLine(cursor.line),
        };
    };

    private filterOption = (firstValues: string[] | undefined, lastValue: string | undefined, option: string): boolean => {
        return !firstValues || !firstValues?.contains(option) && (!lastValue || !!lastValue && option.contains(lastValue))
    }

    async getSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const suggestions = await this.getValueSuggestions(context);
        if (suggestions.length) {
            return suggestions;
        }
        return [];
    };

    async getValueSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const line = context.start.line;
        let regex;
        if (!this.inFrontmatter) {
            regex = new RegExp(`^${genericFieldRegex}::(?<values>.+)?`, "u");
        } else {
            regex = new RegExp(`^${genericFieldRegex}:(?<values>.+)?`, "u");
        };
        const regexResult = context.editor.getRange({ line: line, ch: 0 }, context.end).match(regex);

        if (regexResult && regexResult.groups?.attribute) {
            const fieldName = regexResult.groups.attribute;
            const valuesList = regexResult.groups.values?.replace(/^\[|^\s\[/, '').replace(/\]$/, '').split(",").map(o => o.trim())
            const lastValue = valuesList?.last()
            const firstValues = valuesList?.slice(0, -1)
            //tags specific cas
            if (fieldName === "tags" && this.inFrontmatter) {
                //@ts-ignore
                return Object.keys(this.app.metadataCache.getTags())
                    .filter(t => lastValue ? t.contains(lastValue) : t)
                    .sort()
                    .map(tag => Object({ value: tag.replace(/^#/, "") }))
            }
            //if this note has a fileClass, check if field options are defined in the FileClass
            const cache = this.plugin.app.metadataCache.getCache(context.file.path);
            let tryWithPresetField = !cache?.frontmatter;
            if (cache?.frontmatter) {
                const { position, ...attributes } = cache.frontmatter;
                const fileClassAlias = this.plugin.settings.fileClassAlias;
                if (Object.keys(attributes).contains(fileClassAlias)) {
                    const fileClassValue = attributes[fileClassAlias];
                    try {
                        const fileClass = await createFileClass(this.plugin, fileClassValue);
                        this.fileClass = fileClass;
                        const fileClassAttributes = this.fileClass.attributes;
                        if (fileClassAttributes.map(attr => attr.name).contains(fieldName)) {
                            const options = fileClassAttributes
                                .filter(attr => attr.name == fieldName)[0]
                                .options
                                .filter(option => this.filterOption(firstValues, lastValue, option))
                            return options
                                .map(option => Object({ value: option }));
                        }
                    } catch (error) {
                        tryWithPresetField = true;
                    };
                } else {
                    tryWithPresetField = true;
                };
            };
            if (tryWithPresetField) {
                //else check if there are global preset voptiosalues
                const presetFieldMatch = this.plugin.settings.presetFields.filter(field => field.name == fieldName);
                if (presetFieldMatch.length > 0) {
                    const presetField = presetFieldMatch[0];

                    if (presetField.valuesListNotePath) {
                        //override presetValues if there is a valuesList
                        const valuesFile = this.plugin.app.vault.getAbstractFileByPath(presetField.valuesListNotePath);
                        if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                            const values: { value: string }[] = await (await this.plugin.app.vault.read(valuesFile)).split("\n")
                                .filter(option => this.filterOption(firstValues, lastValue, option))
                                .map(_value => Object({ value: _value }))
                            return values;
                        };
                    };
                    const values = Object.entries(presetFieldMatch[0].options).map(option => option[1])
                        .filter(option => this.filterOption(firstValues, lastValue, option))
                    return values
                        .map(_value => Object({ value: _value }))
                };
            };
        };
        return [];
    };

    renderSuggestion(suggestion: IValueCompletion, el: HTMLElement): void {
        el.setText(suggestion.value);
    };

    selectSuggestion(suggestion: IValueCompletion, event: KeyboardEvent | MouseEvent): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
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
        } else {
            //clean line by removing everything after , or ::
            let cleanedLine = activeLine
            while (![',', ':'].contains(cleanedLine.charAt(cleanedLine.length - 1))) {
                cleanedLine = cleanedLine.slice(0, -1)
            }
            editor.replaceRange(`${cleanedLine}${event.shiftKey ? " " : ""}` + suggestion.value,
                { line: this.context!.start.line, ch: 0 }, this.context!.end);
        }
        this.didSelect = true
        this.close()
    };
};