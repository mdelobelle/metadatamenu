import MetadataMenu from "main";
import { MarkdownView, Menu, Notice, TFile } from "obsidian";
import { insertMissingFields } from "src/commands/insertMissingFields";
import NoteFieldsComponent from "src/components/FieldsModal";
import { AddFileClassToFileModal } from "src/fileClass/fileClass";
import AddNewFileClassModal from "src/modals/AddNewFileClassModal";
import { LineNode } from "src/note/lineNode";
import { Note } from "src/note/note";
import { genuineKeys } from "src/utils/dataviewUtils";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import chooseSectionModal from "../modals/chooseSectionModal";
import FieldCommandSuggestModal from "./FieldCommandSuggestModal";
import FileClassOptionsList from "./FileClassOptionsList";
import { IFieldManager, fieldValueManager, openFieldModal, upperPath } from "src/fields/Field";
import { getActions } from "src/fields/Fields";
import { getNextOption, Options as CycleOptions } from "src/fields/models/Cycle";

function isMenu(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is Menu {
	return (location as Menu).addItem !== undefined;
};

function isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is "InsertFieldCommand" {
	return (location as string) === "InsertFieldCommand";
}

function isSuggest(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is FieldCommandSuggestModal {
	return (location as FieldCommandSuggestModal).getItems !== undefined;
};


function isEditor(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is FieldCommandSuggestModal {
	return (location as FieldCommandSuggestModal).getItems !== undefined;
};

export default class OptionsList {

	// adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette
	note?: Note

	constructor(
		private plugin: MetadataMenu,
		private file: TFile,
		private location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand",
		private path: string = ""
	) {
		this.file = file;
		this.location = location;

	};

	public async build(): Promise<void> {
		if (this.plugin.fieldIndex.isIndexed(this.file)) {
			this.note = await Note.buildNote(this.plugin, this.file)
		}
	}

	public createAndOpenNodeFieldModal(node: LineNode): void {
		const { field, value } = node
		const rootNode = node?.line?.getParentLineWithField()?.nodes[0]
		const indexedPath = !field ? rootNode?.indexedPath || node.indexedPath : node.indexedPath
		const rootField = rootNode?.field
		const mField = field || rootField
		//-----
		if (mField) {
			const fieldVM = fieldValueManager(this.plugin, mField.id, mField.fileClassName, this.file, undefined, indexedPath)
			if (!fieldVM) return
			fieldVM.value = value
			switch (fieldVM.type) {
				case "Boolean":
					fieldVM.save(`${!fieldVM.value}`)
					break;
				case "Cycle":
					const nextOption = getNextOption(fieldVM as IFieldManager<TFile, CycleOptions>);
					fieldVM.save(`${nextOption}`)
					break;
				default:
					const eF = node.line.note.getExistingFieldForIndexedPath(indexedPath)
					if (!eF) return
					const { field, file, indexedPath: _iPath, lineNumber } = eF
					fieldValueManager(this.plugin, field.id, field.fileClassName, file, eF, _iPath, lineNumber)?.openModal()
					break;
			}

		} else {
			new Notice("No field with definition at this position", 2000)
		}
	}

	public createContextMenuOptionsList() {
		const location = this.location
		if (isMenu(location)) {
			location.addSeparator();
			if (this.plugin.fieldIndex.isIndexed(this.file)) {
				this.openNoteFieldModalOption();
				this.buildFieldOptionsForMenu();
				this.addSectionSelectModalOption();
				this.addFieldAtCurrentPositionOption();
				this.addFieldAtTheEndOfFrontmatterOption();
				this.addAllMissingFieldsAtSection(); // we don't know if there are, but this way, no need for synchronous values fetching
			}
			const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path) || []
			fileClasses.forEach(fileClass => {
				const fileClassOptionsList = new FileClassOptionsList(this.plugin, fileClass.getClassFile(), location, this.file)
				fileClassOptionsList.createExtraOptionList(false);
			})
			this.addFileClassToFileOption();
			this.addNewFileClassOption();
		}
	}

	public async createExtraOptionList(openAfterCreate: boolean = true): Promise<void> {
		await this.build()
		const dvApi = this.plugin.app.plugins.plugins.dataview?.api
		const location = this.location
		const separator = {
			id: `__optionSeparator`,
			actionLabel: ``,
			action: () => { },
			icon: undefined
		}
		if (isInsertFieldCommand(location)) {
			this.addFieldAtCurrentPositionOption();
		} else if (isSuggest(location)) {
			if (this.plugin.fieldIndex.isIndexed(this.file)) {
				this.openNoteFieldModalOption();
				location.options.push(separator)
				this.buildFieldOptions();
				location.options.push(separator)
				this.addFieldAtCurrentPositionOption();
				this.addSectionSelectModalOption();
				this.addFieldAtTheEndOfFrontmatterOption();
				if (dvApi) {
					const currentFieldsNames = genuineKeys(dvApi.page(this.file.path))
					if (![...this.plugin.fieldIndex.filesFields.get(this.file.path) || []].map(field => field.name).every(fieldName => currentFieldsNames.includes(fieldName))) {
						this.addAllMissingFieldsAtSection();
					}
				}
			}
			const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path) || []
			if (fileClasses.length) location.options.push(separator)
			fileClasses.forEach(fileClass => {
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
				const fileClassOptionsList = new FileClassOptionsList(this.plugin, fileClass.getClassFile(), fieldCommandSuggestModal, this.file);
				fileClassOptionsList.createExtraOptionList(false);
				location.options.push({
					id: "manage_fileClass_attributes",
					actionLabel: `<span>Manage <b>${fileClass.name}</b> fileClass fields</span>`,
					action: () => { fieldCommandSuggestModal.open() },
					icon: "wrench"
				})
			})
			this.addFileClassToFileOption();
			this.addNewFileClassOption();
			if (openAfterCreate) location.open();
		}
	}


	private openNoteFieldModalOption(): void {
		const lastFileClassName = this.plugin.fieldIndex.filesFileClassesNames.get(this.file.path)?.last()
		if (lastFileClassName) {
			const fileClass = this.plugin.fieldIndex.fileClassesName.get(lastFileClassName)
			if (fileClass) {
				const icon = fileClass.getIcon()
				const noteFieldsComponent = new NoteFieldsComponent(this.plugin, "1", () => { }, this.file)
				const action = () => this.plugin.addChild(noteFieldsComponent);
				if (isMenu(this.location)) {
					this.location.addItem((item) => {
						item.setTitle(`Open fields modal`);
						item.setIcon(icon);
						item.onClick(action);
						item.setSection("metadata-menu");
					})
				} else if (isSuggest(this.location)) {
					this.location.options.push({
						id: `open_fields_modal`,
						actionLabel: `<span>Open fields modal</span>`,
						action: action,
						icon: icon
					});
				};
			}
		}

	}


	private buildFieldOptionsForMenu(): void {

		if (isMenu(this.location)) {
			this.location.addItem((item) => {
				item.setIcon("clipboard-list");
				item.setTitle("Manage all fields");
				item.onClick(async (evt: MouseEvent) => {
					const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
					const optionsList = new OptionsList(this.plugin, this.file, fieldCommandSuggestModal);
					await optionsList.createExtraOptionList();
				});
				item.setSection("metadata-menu");
			});
			const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
			if (view?.editor) {
				const action = async () => {
					if (!view.file || !(view.file instanceof TFile)) return
					const optionsList = new OptionsList(this.plugin, view.file, "ManageAtCursorCommand")
					const note = await Note.buildNote(this.plugin, view!.file!)
					const node = note.getNodeAtPosition(view.editor.getCursor())
					if (node) optionsList.createAndOpenNodeFieldModal(node)
					else new Notice("No field with definition at this position", 2000)
				}
				this.location.addItem((item) => {
					item.setIcon("map-pin");
					item.setTitle("Manage field at cursor");
					item.onClick(async () => await action());
					item.setSection("metadata-menu");
				});
			}
		}
	}

	private buildFieldOptions(): void {
		this.note?.existingFields
			.filter(eF => eF.indexedPath && upperPath(eF.indexedPath) === this.path)
			.forEach(eF => {
				const field = eF.field
				if (field) {
					const fieldVM = fieldValueManager(this.plugin, field.id, field.fileClassName, this.file, eF, eF.indexedPath)
					if (fieldVM) getActions(fieldVM?.type)(this.plugin, field, this.file, this.location, eF.indexedPath)
				}
			})
	}

	private addSectionSelectModalOption(): void {
		const modal = new chooseSectionModal(
			this.plugin,
			this.file,
			(
				lineNumber: number,
				asList: boolean,
				asBlockquote: boolean
			) => openFieldModal(
				this.plugin,
				this.file,
				undefined,
				lineNumber,
				asList,
				asBlockquote
			)
		);
		if (isMenu(this.location)) {
			this.location.addItem((item) => {
				item.setIcon("enter");
				item.setTitle("Add field at section...");
				item.onClick((evt: MouseEvent) => {
					modal.open();
				});
				item.setSection("metadata-menu");
			});
		} else if (isSuggest(this.location)) {
			this.location.options.push({
				id: "add_field_at_section",
				actionLabel: "Add field at section...",
				action: () => modal.open(),
				icon: "enter"
			})
		};
	};

	private addAllMissingFieldsAtSection(): void {
		const modal = new chooseSectionModal(
			this.plugin,
			this.file,
			(
				lineNumber: number,
				asList: boolean,
				asBlockquote: boolean
			) => insertMissingFields(
				this.plugin,
				this.file.path,
				lineNumber,
				asList,
				asBlockquote
			)
		);
		if (isMenu(this.location)) {
			this.location.addItem((item) => {
				item.setIcon("battery-full");
				item.setTitle("Add missing fields at section...");
				item.onClick((evt: MouseEvent) => {
					modal.open();
				});
				item.setSection("metadata-menu");
			});
		} else if (isSuggest(this.location)) {
			this.location.options.push({
				id: "add_missing_fields_at_section",
				actionLabel: "Add missing fields at section...",
				action: () => modal.open(),
				icon: "battery-full"
			})
		};
	};

	private addFieldAtTheEndOfFrontmatterOption(): void {
		if (this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter) {
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("align-vertical-space-around");
					item.setTitle("Add field in frontmatter");
					item.onClick(async (evt: MouseEvent) => {
						openFieldModal(this.plugin, this.file, undefined, -1, false, false)
					});
					item.setSection("metadata-menu");
				});
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_in_frontmatter",
					actionLabel: "Add a field in frontmatter...",
					action: () => openFieldModal(
						this.plugin, this.file, undefined, -1, false, false),
					icon: "align-vertical-space-around"
				})
			}
		}
	}

	private addFieldAtCurrentPositionOption(): void {
		const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
		const currentLineNumber = currentView?.editor.getCursor().line;
		if (currentLineNumber !== undefined && this.file.path == currentView?.file!.path) {
			const frontmatter = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatter
			let lineNumber = currentLineNumber
			if (frontmatter) {
				const { start, end } = getFrontmatterPosition(this.plugin, this.file)
				if (currentLineNumber >= start!.line && currentLineNumber < end!.line) lineNumber = -1
			}
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("list-plus");
					item.setTitle("Add field at cursor");
					item.onClick((evt: MouseEvent) => {
						openFieldModal(
							this.plugin, this.file, undefined, lineNumber, false, false)
					});
					item.setSection("metadata-menu");
				});
			} else if (isInsertFieldCommand(this.location)) {
				openFieldModal(
					this.plugin, this.file, undefined, lineNumber, false, false);
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_at_cursor",
					actionLabel: "Add field at cursor...",
					action: () => openFieldModal(
						this.plugin, this.file, undefined, lineNumber, false, false),
					icon: "list-plus"
				})
			};
		}
	}

	private addFileClassToFileOption(): void {
		const modal = new AddFileClassToFileModal(this.plugin, this.file)
		const action = () => modal.open();
		if (isMenu(this.location)) {
			this.location.addItem((item) => {
				item.setIcon("plus-square");
				item.setTitle(`Add ${this.plugin.settings.fileClassAlias} to ${this.file.basename}`);
				item.onClick(action);
				item.setSection("metadata-menu-fileclass");
			});
		} else if (isSuggest(this.location)) {
			this.location.options.push({
				id: "add_fileclass_to_file",
				actionLabel: `Add ${this.plugin.settings.fileClassAlias} to ${this.file.basename}`,
				action: action,
				icon: "package-plus"
			})
		};
	}

	private addNewFileClassOption(): void {
		const modal = new AddNewFileClassModal(this.plugin);
		const action = () => modal.open();
		if (this.plugin.settings.classFilesPath) {
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("file-plus-2");
					item.setTitle(`Add a new ${this.plugin.settings.fileClassAlias}`)
					item.onClick(action);
					item.setSection("metadata-menu-fileclass");
				})
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_new_fileclass",
					actionLabel: `Add a new ${this.plugin.settings.fileClassAlias}`,
					action: action,
					icon: "file-plus-2"
				})
			}
		}
	}
};

