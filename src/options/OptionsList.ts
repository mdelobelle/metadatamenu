import MetadataMenu from "main";
import { MarkdownView, Menu, TFile } from "obsidian";
import { insertMissingFields } from "src/commands/insertMissingFields";
import NoteFieldsComponent from "src/components/NoteFields";
import Field from "src/fields/Field";
import { FieldManager as F } from "src/fields/FieldManager";
import BooleanField from "src/fields/fieldManagers/BooleanField";
import CycleField from "src/fields/fieldManagers/CycleField";
import Managers from "src/fields/fieldManagers/Managers";
import { AddFileClassToFileModal } from "src/fileClass/fileClass";
import AddNewFileClassModal from "src/modals/addNewFileClassModal";
import InputModal from "src/modals/fields/InputModal";
import { FieldIcon, FieldManager, FieldType } from "src/types/fieldTypes";
import { genuineKeys } from "src/utils/dataviewUtils";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import chooseSectionModal from "../modals/chooseSectionModal";
import FieldCommandSuggestModal from "./FieldCommandSuggestModal";
import FileClassOptionsList from "./FileClassOptionsList";

function isMenu(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is Menu {
	return (location as Menu).addItem !== undefined;
};

function isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is "InsertFieldCommand" {
	return (location as string) === "InsertFieldCommand";
}

function isSuggest(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand"): location is FieldCommandSuggestModal {
	return (location as FieldCommandSuggestModal).getItems !== undefined;
};

export default class OptionsList {

	// adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette
	path: string;
	attributes: Record<string, string>;
	fieldsFromIndex: Record<string, Field> = {};

	constructor(
		private plugin: MetadataMenu,
		private file: TFile,
		private location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal | "ManageAtCursorCommand",
		private includedFields?: string[]
	) {
		this.file = file;
		this.location = location;
		this.attributes = {};
		this.includedFields = includedFields ? [this.plugin.settings.fileClassAlias, ...includedFields] : [this.plugin.settings.fileClassAlias];
		this.getFieldsFromIndex();
		this.getFieldsValues();
	};

	private getFieldsValues(): void {
		const dvApi = this.plugin.app.plugins.plugins["dataview"]?.api
		//@ts-ignore
		if (dvApi) {
			const dvFile = dvApi.page(this.file.path)
			try {
				genuineKeys(dvFile).forEach(key => this.addAttribute(key, dvFile[key]))
			} catch (error) {
				throw (error);
			}
		}
	}

	private addAttribute(key: string, value: any): void {
		const includedFields = this.includedFields!.filter(f => f !== this.plugin.settings.fileClassAlias)
		if (includedFields.length > 0) {
			if (
				this.includedFields!.includes(key)
				&&
				!this.plugin.settings.globallyIgnoredFields.includes(key)
			) {
				this.attributes[key] = value
			}
		} else if (!this.plugin.settings.globallyIgnoredFields.includes(key)) {
			this.attributes[key] = value
		}
	}

	private getFieldsFromIndex(): void {
		const index = this.plugin.fieldIndex
		const fields = index.filesFields.get(this.file.path)
		fields?.forEach(field => this.fieldsFromIndex[field.name] = field)
	}

	public createAndOpenFieldModal(fieldName: string): void {
		const field = this.fieldsFromIndex[fieldName]
		if (field) {
			const fieldManager = new FieldManager[field.type](this.plugin, field) as F;
			switch (fieldManager.type) {
				case FieldType.Boolean:
					(fieldManager as BooleanField).toggle(field.name, this.attributes[field.name], this.file)
					break;
				case FieldType.Cycle:
					(fieldManager as CycleField).next(field.name, this.attributes[field.name], this.file)
					break;
				default:
					fieldManager.createAndOpenFieldModal(this.file, field.name, this.attributes[field.name])
					break;
			}

		} else {
			const defaultField = new Field(fieldName)
			defaultField.type = FieldType.Input
			if (fieldName === this.plugin.settings.fileClassAlias) {
				this.buildFileClassFieldOptions(defaultField, this.attributes[fieldName])
			} else if (this.location === "ManageAtCursorCommand") {
				const fieldManager = new Managers.Input(this.plugin, defaultField) as F
				(fieldManager as F).createAndOpenFieldModal(this.file, fieldName, this.attributes[fieldName])
			}
		}
	}

	public createExtraOptionList(openAfterCreate: boolean = true): void {
		const dvApi = this.plugin.app.plugins.plugins.dataview?.api
		const location = this.location
		if (isMenu(location)) { location.addSeparator(); };
		if (isInsertFieldCommand(location)) {
			this.addFieldAtCurrentPositionOption();
		} else if (isSuggest(location)) {
			this.openNoteFieldModalOption();
			this.buildFieldOptions();
			this.addFieldAtCurrentPositionOption();
			this.addSectionSelectModalOption();
			this.addFieldAtTheEndOfFrontmatterOption();
			if (dvApi) {
				const currentFieldsNames = genuineKeys(dvApi.page(this.file.path))
				if (![...this.plugin.fieldIndex.filesFields.get(this.file.path) || []].map(field => field.name).every(fieldName => currentFieldsNames.includes(fieldName))) {
					this.addAllMissingFieldsAtSection();
				}
			}
			const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path) || []
			fileClasses.forEach(fileClass => {
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
				const optionsList = new FileClassOptionsList(this.plugin, fileClass.getClassFile(), fieldCommandSuggestModal, this.file);
				optionsList.createExtraOptionList(false);
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
		} else if (isMenu(location)) {
			this.openNoteFieldModalOption();
			this.buildFieldOptions();
			this.addSectionSelectModalOption();
			this.addFieldAtCurrentPositionOption();
			this.addFieldAtTheEndOfFrontmatterOption();
			if (dvApi) {
				const currentFieldsNames = genuineKeys(dvApi.page(this.file.path))
				if (![...this.plugin.fieldIndex.filesFields.get(this.file.path) || []].map(field => field.name).every(fieldName => currentFieldsNames.includes(fieldName))) {
					this.addAllMissingFieldsAtSection();
				}
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

	private buildFileClassFieldOptions(field: Field, value: string): void {
		const modal = new InputModal(this.plugin, this.file, field, value);
		modal.titleEl.setText(`Change Value for <${field.name}>`);
		if (isMenu(this.location)) {
			this.location.addItem((item) => {
				item.setTitle(`Update ${field.name}`);
				item.setIcon("wrench");
				item.onClick(() => modal.open());
				item.setSection("metadata-menu");
			})
		} else if (isSuggest(this.location)) {
			this.location.options.push({
				id: `update_${field.name}`,
				actionLabel: `<span>Update <b>${field.name}</b></span>`,
				action: () => modal.open(),
				icon: FieldIcon[FieldType.Input]
			});
		};
	}


	private openNoteFieldModalOption(): void {
		const lastFileClassName = this.plugin.fieldIndex.filesFileClassesNames.get(this.file.path)?.last()
		if (lastFileClassName) {
			const fileClass = this.plugin.fieldIndex.fileClassesName.get(lastFileClassName)
			if (fileClass) {
				const icon = fileClass.getIcon() || "clipboard-list"
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

	private buildFieldOptions(): void {
		Object.keys(this.attributes).forEach((key: string) => {
			const value = this.attributes[key];
			const field = this.fieldsFromIndex[key]

			if (field) {
				const fieldManager = new FieldManager[field.type](this.plugin, field);
				fieldManager.addFieldOption(key, value, this.file, this.location);
			} else if (key !== "file" && (isSuggest(this.location) || isMenu(this.location))) {
				const defaultField = new Field(key)
				defaultField.type = FieldType.Input
				if (key === this.plugin.settings.fileClassAlias) {
					this.buildFileClassFieldOptions(defaultField, value)
				} else {
					const fieldManager = new Managers.Input(this.plugin, defaultField)
					fieldManager.addFieldOption(key, value || "", this.file, this.location)
				}
			}

		});
	}

	private addSectionSelectModalOption(): void {
		const modal = new chooseSectionModal(
			this.plugin,
			this.file,
			(
				lineNumber: number,
				after: boolean,
				asList: boolean,
				asComment: boolean
			) => F.openFieldModal(
				this.plugin,
				this.file,
				undefined,
				"",
				lineNumber,
				after,
				asList,
				asComment
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
		const dvApi = this.plugin.app.plugins.plugins.dataview?.api
		if (dvApi) {
			const dvFile = dvApi.page(this.file.path);
			const modal = new chooseSectionModal(
				this.plugin,
				this.file,
				(
					lineNumber: number,
					after: boolean,
					asList: boolean,
					asComment: boolean
				) => insertMissingFields(
					this.plugin,
					dvFile.file.path,
					lineNumber,
					after,
					asList,
					asComment
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
		}
	};

	private addFieldAtTheEndOfFrontmatterOption(): void {
		if (this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter) {
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("pin");
					item.setTitle("Add field in frontmatter");
					item.onClick(async (evt: MouseEvent) => {
						F.openFieldModal(this.plugin, this.file, undefined, "", -1, false, false, false)
					});
					item.setSection("metadata-menu");
				});
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_in_frontmatter",
					actionLabel: "Add a field in frontmatter...",
					action: () => F.openFieldModal(
						this.plugin, this.file, undefined, "", -1, false, false, false),
					icon: "pin"
				})
			}
		}
	}

	private addFieldAtCurrentPositionOption(): void {
		const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
		const currentLineNumber = currentView?.editor.getCursor().line;
		if (currentLineNumber !== undefined && this.file.path == currentView?.file.path) {
			const frontmatter = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatter
			let lineNumber = currentLineNumber
			if (frontmatter) {
				const { start, end } = getFrontmatterPosition(this.plugin, this.file)
				if (currentLineNumber >= start.line && currentLineNumber < end.line) lineNumber = -1
			}
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("pin");
					item.setTitle("Add field at cursor");
					item.onClick((evt: MouseEvent) => {
						F.openFieldModal(
							this.plugin, this.file, undefined, "", lineNumber, false, false, false)
					});
					item.setSection("metadata-menu");
				});
			} else if (isInsertFieldCommand(this.location)) {
				F.openFieldModal(
					this.plugin, this.file, undefined, "", lineNumber, false, false, false);
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_at_cursor",
					actionLabel: "Add field at cursor...",
					action: () => F.openFieldModal(
						this.plugin, this.file, undefined, "", lineNumber, false, false, false),
					icon: "pin"
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
				icon: "plus-square"
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
