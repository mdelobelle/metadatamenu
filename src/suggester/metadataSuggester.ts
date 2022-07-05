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
} from "obsidian";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { genericFieldRegex } from "../utils/parser";

interface IValueCompletion {
    value: string;
};

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private app: App;
    private triggerPhraseOutsideFrontmatter: string = ":::";
    private triggerPhraseInFrontmatter: string = "::";
    private triggerPhrase: string;
    private fileClass: FileClass

    constructor(app: App, plugin: MetadataMenu) {
        super(app);
        this.app = app;
        this.plugin = plugin;
        this.triggerPhrase = this.triggerPhraseInFrontmatter

        this.setInstructions([{ command: "Shift", purpose: "put a space after::" }]);

        // @ts-ignore
        this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
            // @ts-ignore
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    };

    async getSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const suggestions = await this.getValueSuggestions(context);
        if (suggestions.length) {
            return suggestions;
        }
        // catch-all if there are no matches
        return [{ value: context.query }];
    };

    async getValueSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const line = context.start.line;
        let regex;
        if (this.triggerPhrase === this.triggerPhraseOutsideFrontmatter) {
            regex = new RegExp(`${genericFieldRegex}::(.+)?`, "u");
        } else {
            regex = new RegExp(`${genericFieldRegex}:(.+)?`, "u");
        };
        const regexResult = context.editor.getRange({ line: line, ch: 0 }, { line: line, ch: -1 }).match(regex);

        if (regexResult && regexResult.length > 0) {
            const fieldName = regexResult[1];
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
                            const options = fileClassAttributes.filter(attr => attr.name == fieldName)[0].options;
                            return options.map(option => Object({ value: option }));
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
                            const values: { value: string }[] = await (await this.plugin.app.vault.read(valuesFile)).split("\n").map(_value => Object({ value: _value }));
                            return values.filter(item => item.value.startsWith(context.query));
                        };
                    };
                    const values = Object.entries(presetFieldMatch[0].values);
                    return values.map(_value => Object({ value: _value[1] })).filter(item => item.value.startsWith(context.query));
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
        const includeSpace = event.shiftKey || this.triggerPhrase === this.triggerPhraseInFrontmatter;
        const separator = this.triggerPhrase.slice(0, this.triggerPhrase.length - 1);
        activeView.editor.replaceRange(`${includeSpace ? separator + " " : separator}` + suggestion.value,
            this.context!.start,
            this.context!.end);
    };

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile
    ): EditorSuggestTriggerInfo | null {
        if (!this.plugin.settings.isAutosuggestEnabled) {
            return null;
        };
        //@ts-ignore
        const frontmatter = this.plugin.app.metadataCache.metadataCache[app.metadataCache.fileCache[file.path].hash].frontmatter;
        if (frontmatter && frontmatter.position.start.line < cursor.line && cursor.line < frontmatter.position.end.line) {
            this.triggerPhrase = this.triggerPhraseInFrontmatter;
        } else {
            this.triggerPhrase = this.triggerPhraseOutsideFrontmatter;
        };
        const startPos = this.context?.start || {
            line: cursor.line,
            ch: cursor.ch - this.triggerPhrase.length,
        };

        if (!editor.getRange(startPos, cursor).startsWith(this.triggerPhrase)) {
            return null;
        }
        return {
            start: startPos,
            end: cursor,
            query: editor.getRange(startPos, cursor).substring(this.triggerPhrase.length),
        };
    };
};