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
import { inlineMultipleFieldRegex } from "../utils/parser";

interface IValueCompletion {
    value: string;
};

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private app: App;
    private fileClass: FileClass;
    private inFrontmatter: boolean = false;
    private fieldLocation: string = null;
    private didSelect: boolean = false;
    private metaStart: number = null;
    private metaEnd: number = null;
    private startSuggesting: boolean = false;

    constructor(app: App, plugin: MetadataMenu) {
        super(app);
        this.app = app;
        this.plugin = plugin;
        this.setInstructions([{ command: "Shift", purpose: "Select multiple" }]);

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
        const fullLine = editor.getLine(cursor.line);
        this.startSuggesting = false;
        let regex;
        regex = new RegExp(`${inlineMultipleFieldRegex}::`, "u");
        if (this.inFrontmatter) {
          regex = new RegExp(`^${genericFieldRegex}:\\s*?(?<values>.*)?`, "u");
          this.fieldLocation = "frontmatter";
        } else if (!fullLine.match(regex)) {
          regex = new RegExp(`^${genericFieldRegex}:\\s*?(?<values>.*)?`, "u");
          this.fieldLocation = "inlineSingle";
        } else if (fullLine.match(regex)) {
          regex = new RegExp(`^${inlineMultipleFieldRegex}::\\s*?(?<values>[^\\]\\)\\n]*)(?<endField>[\\]\\)]*)(?<tail>.)*`, "u");
          this.fieldLocation = "inlineMultiple";
        }
        ;
        const lineLength = fullLine.length;
        const character = cursor.ch;
        const line = cursor.line;
        const currentRegex = null;
        if(this.fieldLocation == "inlineMultiple") {
          for(let i = character; i >= 0; i--){
            if(fullLine.substring(i, character).match(regex) && !Boolean(fullLine.substring(i-1, character).match(regex)) && !Boolean(fullLine.substring(i, character).match(regex).groups.tail) && !Boolean(fullLine.substring(i, character).match(regex).groups.endField)){
              this.metaStart = i;
              this.startSuggesting = true;
              break;
            }
          }
          if (!this.startSuggesting) {
            this.metaStart = null;
            this.metaEnd = null;
            return null;
          }
        } else if (!regex.test(fullLine)) {
          return null 
        }
        return {
          start: cursor,
          end: cursor,
          query: fullLine
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
        const lineLength = context.query.length;
        let regex;
        let regexResult;
        switch(this.fieldLocation){
          case "frontmatter":
            regex = new RegExp(`^${genericFieldRegex}:\\s*?(?<values>.*)`, "u");
            break;
          case "inlineSingle":
            regex = new RegExp(`^${genericFieldRegex}::\\s*?(?<values>.*)`, "u");
            break;
          case "inlineMultiple":
            regex = new RegExp(`^${inlineMultipleFieldRegex}::\\s*?(?<values>[^\\]\\)\\n]*)(?<endField>[\\]\\)]*)(?<tail>.)*`, "u");
            break;
        };
        if(this.fieldLocation == "inlineMultiple"){
          for(let i = context.start.ch; i <= lineLength; i++){
            if(context.query.substring(this.metaStart, i).match(regex) && !context.query.substring(this.metaStart, i).match(regex).groups.tail){
              this.metaEnd = i;
              break;
            }
          }
        }
        switch(this.fieldLocation){
          case "frontmatter":
            regexResult = context.query.match(regex);
            break;
          case "inlineSingle":
            regexResult = context.query.match(regex);
            break;
          case "inlineMultiple":
            regexResult = context.query.substring(this.metaStart, this.metaEnd).match(regex);
            break;
        };
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
            //if this note has a fileClass, check if field values are defined in the FileClass
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
                //else check if there are global preset values
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
                    const values = Object.entries(presetFieldMatch[0].values).map(option => option[1])
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
        switch(this.fieldLocation){
            case "frontmatter":
              this.metaEnd = editor.end;
              break;
            case "inlineSingle":
              this.metaEnd = editor.end;
              break;
        };
        const activeLine = editor.getRange({ line: this.context.start.line, ch: this.metaStart }, {line: this.context.start.line, ch: this.metaEnd});

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
            editor.replaceRange(`${cleanedLine} ` + suggestion.value + `${event.shiftKey ? "," : ""}`, { line: this.context.start.line, ch: this.metaStart }, 
                {line: this.context.start.line, ch: this.metaEnd});
        }
        this.didSelect = true
        this.close()
    };
};