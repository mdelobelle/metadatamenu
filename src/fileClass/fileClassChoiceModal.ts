import MetadataMenu from "main";
import { SuggestModal } from "obsidian";
import { FileClassViewManager } from "../components/FileClassViewManager";
import { FILECLASS_VIEW_TYPE } from "./views/fileClassView";

export class FileClassChoiceModal extends SuggestModal<string> {

    constructor(
        private plugin: MetadataMenu,
        private fileClassManager: FileClassViewManager,
        private tagsAndFileClasses: string[]
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");
    }

    getSuggestions(query: string): string[] {
        const index = this.plugin.fieldIndex;
        const values: string[] = [...new Set(
            [...index.fileClassesName.keys(), ...index.tagsMatchingFileClasses.keys()]
        )]
            .filter(name => name.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => a.localeCompare(b))
        if (this.tagsAndFileClasses.length) {
            return values.filter(value => this.tagsAndFileClasses.includes(value))
        } else {
            return values
        }
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("value-container");
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const index = this.plugin.fieldIndex;
        const fileClass = index.fileClassesName.get(item) || index.tagsMatchingFileClasses.get(item)
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (fileClass && dvApi) {
            this.fileClassManager.name = item
            this.fileClassManager.fileClass = fileClass
            const viewType = FILECLASS_VIEW_TYPE + "__" + fileClass.name
            this.fileClassManager.fileClassViewType = viewType
            await this.fileClassManager.openFileClassView();
            this.plugin.indexDB.fileClassViews.editElement(viewType,
                {
                    id: viewType,
                    leafId: this.fileClassManager.fileClassView.leaf.id
                })
        }
        this.close()
    }
}