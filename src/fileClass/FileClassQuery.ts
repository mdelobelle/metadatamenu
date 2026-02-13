import { Notice, TFile } from "obsidian";

class FileClassQuery {
    private cachedResults: Set<string> | null = null;

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
        //@ts-ignore
        const dataview = app.plugins.plugins.dataview
        //@ts-ignore
        if (this.query && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            try {
                if (!this.cachedResults) {
                    const results = this.getResults(dataview.api);
                    const filesPath = results.values.map((v: any) => v.file.path) as string[];
                    this.cachedResults = new Set(filesPath);
                }
                return this.cachedResults.has(file.path);
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    }

    public invalidateCache() {
        this.cachedResults = null;
    }

    static copyProperty(target: FileClassQuery, source: FileClassQuery) {
        target.id = source.id;
        target.name = source.name;
        target.query = source.query;
        target.fileClassName = source.fileClassName
    };
};

export default FileClassQuery;