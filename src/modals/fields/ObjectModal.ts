import MetadataMenu from "main";
import { TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";
import { cleanActions } from "src/utils/modals";
import BaseModal from "../baseModal";
import { EditorView, basicSetup } from "codemirror"
import { lintGutter } from "@codemirror/lint";
import { StateField, EditorState } from "@codemirror/state"
import { FieldManager } from "src/types/fieldTypes";


export default class InputModal extends BaseModal {

    private editor: EditorView;
    private positionContainer: HTMLDivElement;

    constructor(
        public plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private value: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
    ) { super(plugin); };

    onOpen() {
        super.onOpen()
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter") {
                e.preventDefault()
            }
        }

        this.buildPositionContainer();
        this.buildInputEl(this.contentEl.createDiv({ cls: "field-container" }));
        cleanActions(this.contentEl, ".footer-actions")
        this.buildSaveBtn(this.contentEl.createDiv({ cls: "footer-actions" }));
        this.containerEl.addClass("metadata-menu")
    };
    private buildPositionContainer() {
        this.positionContainer = this.contentEl.createDiv({ cls: "field-container" })
        this.positionContainer.textContent = "Position: "
    }
    private buildInputEl(container: HTMLDivElement): void {
        const manager = new FieldManager[this.field.type](this.plugin, this.field)

        const getPosition = (state: EditorState) => {
            const range = state.selection.ranges.filter(range => range.empty).first()
            const position = range?.from || 0
            const line = state.doc.lineAt(range?.head || 0)
            const col = (range?.head || 0) - line.from
            this.positionContainer.textContent = `Line: ${line.number} | Col: ${col} | Position: ${position}`
        }

        const positionChange = StateField.define<void>({
            create: (state: EditorState) => getPosition(state),
            update(value, tr) { getPosition(tr.state) }
        })

        const gutter = lintGutter()

        this.editor = new EditorView({
            doc: manager.dumpValue(manager.loadValue(this.value)),
            extensions: [
                basicSetup,
                gutter,
                positionChange,
                manager.getExtraExtensions()
            ],
            parent: container,
        });

    };

    public async save(): Promise<void> {
        const newContent = this.editor.state.doc.toString()
        await postValues(this.plugin, [{ name: this.field.name, payload: { value: newContent } }], this.file, this.lineNumber, this.after, this.asList, this.asComment)
        this.close();
    }
};