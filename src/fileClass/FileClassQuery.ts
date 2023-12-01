import { Notice, TFile } from "obsidian";

class FileClassQuery {

    constructor(
        public name: string = "",
        public id: string = "",
        public query: string = "",
        public fileClassName: string = ""
    ) { };

    //@ts-ignore
    public getResults(api: DataviewPlugin["api"]): any {
        try {
            return (new Function("dv", `return ${this.query}`))(api)
        } catch (error) {
            new Notice(` for <${this.name}>. Check your settings`);
            return []
        }
    };

    public matchFile(file: TFile): boolean {

        const dataview = app.plugins.plugins.dataview
        //@ts-ignore
        if (this.query && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            try {
                const filesPath = this.getResults(dataview.api).values.map((v: any) => v.file.path) as string[]
                return filesPath.includes(file.path);
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    }

    static copyProperty(target: FileClassQuery, source: FileClassQuery) {
        target.id = source.id;
        target.name = source.name;
        target.query = source.query;
        target.fileClassName = source.fileClassName
    };
};

export default FileClassQuery;