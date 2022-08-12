import { Modal, TFile, App, FuzzySuggestModal, FuzzyMatch, apiVersion, Setting } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";
import { cp } from "fs";
import { insertValues } from "src/commands/insertValues";

export default class FileFuzzySuggester extends FuzzySuggestModal<TFile> {

    private file: TFile;
    private value: string;
    private field: Field;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.value = value;
        this.field = field;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
    }

    buildMarkDownLink(path: string): string {
        const destFile = this.app.metadataCache.getFirstLinkpathDest(path, this.file.path)
        if (destFile) {
            return this.app.fileManager.generateMarkdownLink(
                destFile,
                this.file.path,
                undefined,
                destFile.basename
            )
        }
        return ""
    }

    getItems(): TFile[] {
        //@ts-ignore
        const getResults = (api: DataviewPlugin["api"]) => {
            return (new Function("dv", `return ${this.field.options.dvQueryString}`))(api)
        };
        const dataview = app.plugins.plugins["dataview"]
        //@ts-ignore
        if (this.field.options.dvQueryString && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            const filesPath = getResults(dataview.api).values.map((v: any) => v.file.path)
            return this.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
        } else {
            return this.app.vault.getMarkdownFiles();
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    onChooseItem(item: TFile): void {
        if (this.lineNumber == -1) {
            replaceValues(this.app, this.file, this.field.name, this.buildMarkDownLink(item.basename));
        } else {
            insertValues(this.app, this.file, this.field.name, this.buildMarkDownLink(item.basename), this.lineNumber, this.inFrontmatter, this.top);
        };
    }

}