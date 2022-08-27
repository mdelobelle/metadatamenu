import { TFile, App, FuzzySuggestModal } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { FieldManager } from "src/types/fieldTypes";
import FileField from "src/fields/fieldManagers/FileField";

export default class FileFuzzySuggester extends FuzzySuggestModal<TFile> {

    private file: TFile;
    private field: Field;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(app: App, file: TFile, field: Field, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    }

    getItems(): TFile[] {
        try {
            const fileManager = new FieldManager[this.field.type](this.field);
            return fileManager.getFiles();
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    onChooseItem(item: TFile): void {
        if (this.lineNumber == -1) {
            replaceValues(
                this.app,
                this.file,
                this.field.name,
                FileField.buildMarkDownLink(this.app, this.file, item.basename)
            );
        } else {
            insertValues(
                this.app,
                this.file,
                this.field.name,
                FileField.buildMarkDownLink(this.app, this.file, item.basename),
                this.lineNumber,
                this.inFrontmatter,
                this.after
            );
        };
    }

}