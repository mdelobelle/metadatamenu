import MetadataMenu from "main";
import Field from "src/fields/Field";
import { Note } from "./note";

export class Node {

    constructor(
        public plugin: MetadataMenu,
        public note: Note,
        public rawContent: string = "",
        public level: number = 0,
        public field?: { id: string, field: Field, header: string },
        public value?: string,
        public position?: "yaml" | "inline"
    ) { }

    public async buildNode() {
        for (const fileField of this.note.fileFields) {
            const yamlRegex = new RegExp(`^${fileField.header}:`, 'u');
            const r = this.rawContent.match(yamlRegex);
            if (r && r.length > 0) {
                this.field = fileField
                this.position = "yaml"
                break;
            }
        }
    }
}