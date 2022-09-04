import MetadataMenu from "main";
import { App, MarkdownView, Menu, TFile } from "obsidian";
import { getField } from "src/commands/getField";
import Field from "src/fields/Field";
import { FieldManager as F } from "src/fields/FieldManager";
import Managers from "src/fields/fieldManagers/Managers";
import { FileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import InputModal from "src/optionModals/fields/InputModal";
import { FieldIcon, FieldManager, FieldType } from "src/types/fieldTypes";
import { genuineKeys } from "src/utils/dataviewUtils";
import chooseSectionModal from "../optionModals/chooseSectionModal";
import FieldCommandSuggestModal from "./FieldCommandSuggestModal";
import FileClassOptionsList from "./FileClassOptionsList";

function isMenu(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is Menu {
	return (location as Menu).addItem !== undefined;
};

function isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is "InsertFieldCommand" {
	return (location as string) === "InsertFieldCommand";
}

function isSuggest(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is FieldCommandSuggestModal {
	return (location as FieldCommandSuggestModal).getItems !== undefined;
};

export default class OptionsList {

	// adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette

	app: App;
	file: TFile;
	plugin: MetadataMenu;
	path: string;
	location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal;
	fileClass: FileClass;
	attributes: Record<string, string>;
	fileClassForFields: boolean;
	fileClassFields: string[];
	includedFields: string[];

	constructor(plugin: MetadataMenu, file: TFile, location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal, includedFields?: string[]) {
		this.file = file;
		this.plugin = plugin;
		this.location = location;
		this.attributes = {};
		this.fileClassFields = [];
		this.fileClassForFields = false;
		this.includedFields = includedFields ? [this.plugin.settings.fileClassAlias, ...includedFields] : [this.plugin.settings.fileClassAlias];
	};

	private addAttribute(key: string, value: any): void {
		const includedFields = this.includedFields.filter(f => f !== this.plugin.settings.fileClassAlias)
		if (includedFields.length > 0) {
			if (
				this.includedFields.includes(key)
				&&
				!this.plugin.settings.globallyIgnoredFields.includes(key)
			) {
				this.attributes[key] = value
			}
		} else if (!this.plugin.settings.globallyIgnoredFields.includes(key)) {
			this.attributes[key] = value
		}
	}

	private getGlobalFileClassForFields(): void {
		const fileClass = this.plugin.settings.globalFileClass as string;
		try {
			const _fileClass = FileClass.createFileClass(this.plugin, fileClass);
			this.fileClass = _fileClass;
			this.fileClassFields = _fileClass.attributes.map(attr => attr.name);
			this.fileClassForFields = true;
		} catch (error) {
			//do nothing
		}
	}

	private getQueryFileClassForFields(): void {
		const fileClassQueries = this.plugin.settings.fileClassQueries.map(fcq => fcq)
		while (!this.fileClassForFields && fileClassQueries.length > 0) {
			const fileClassQuery = new FileClassQuery();
			Object.assign(fileClassQuery, fileClassQueries.pop() as FileClassQuery)
			if (fileClassQuery.matchFile(this.file)) {
				this.fileClassForFields = true;
				this.fileClass = FileClass.createFileClass(this.plugin, fileClassQuery.fileClassName)
				this.fileClassFields = this.fileClass.attributes.map(attr => attr.name)
			}
		}
	}

	private fetchFrontmatterFields(): void {
		const frontmatter = this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter;
		if (frontmatter) {
			const { position, ...attributes } = frontmatter;
			Object.entries(attributes).forEach(attr => this.addAttribute(...attr));
			const fileClassAlias = this.plugin.settings.fileClassAlias;
			if (Object.keys(this.attributes).includes(fileClassAlias)) {
				const fileClass = this.attributes[fileClassAlias];
				try {
					const _fileClass = FileClass.createFileClass(this.plugin, fileClass);
					this.fileClass = _fileClass;
					this.fileClassFields = _fileClass.attributes.map(attr => attr.name);
					this.fileClassForFields = true;
					Object.keys(attributes).forEach(key => {
						if (!this.fileClassFields.includes(key) && key != fileClassAlias) {
							delete this.attributes[key];
						};
					});
				} catch (error) {
					//do nothing
				}
			}
		}
	}

	private fetchInlineFields(): void {
		const dataview = app.plugins.plugins["dataview"]
		//@ts-ignore
		if (dataview) {
			const dvFile = dataview.api.page(this.file.path)
			try {
				genuineKeys(dvFile).forEach(key => this.addAttribute(key, dvFile[key]))
			} catch (error) {
				throw (error);
			}
		}
	}

	public createExtraOptionList(openAfterCreate: boolean = true): void {
		this.getGlobalFileClassForFields();
		this.getQueryFileClassForFields();
		this.fetchFrontmatterFields();
		this.fetchInlineFields();
		if (isMenu(this.location)) { this.location.addSeparator(); };
		if (isInsertFieldCommand(this.location)) {
			this.addFieldAtCurrentPositionOption();
		} else if (isSuggest(this.location)) {
			this.buildFieldOptions();
			this.addFieldAtCurrentPositionOption();
			this.addSectionSelectModalOption();
			this.addFieldAtTheEndOfFrontmatterOption();
			if (this.fileClass) {
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
				const optionsList = new FileClassOptionsList(this.plugin, this.fileClass.getClassFile(), fieldCommandSuggestModal);
				optionsList.createExtraOptionList(false);
				this.location.options.push({
					id: "manage_fileClass_attributes",
					actionLabel: `<span>Manage <b>${this.fileClass.name}</b> fileClass fields</span>`,
					action: () => { fieldCommandSuggestModal.open() },
					icon: "wrench"
				})
			}
			if (openAfterCreate) this.location.open();
		} else {
			this.buildFieldOptions();
			this.addSectionSelectModalOption();
			this.addFieldAtCurrentPositionOption();
			this.addFieldAtTheEndOfFrontmatterOption();
			if (this.fileClass) {
				const fileClassOptionsList = new FileClassOptionsList(this.plugin, this.fileClass.getClassFile(), this.location)
				fileClassOptionsList.createExtraOptionList(false);
			}
		}
	}

	private buildFileClassFieldOptions(field: Field, value: string): void {
		const modal = new InputModal(app, this.file, field, value);
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

	private buildFieldOptions(): void {
		Object.keys(this.attributes).forEach((key: string) => {
			const value = this.attributes[key];
			const field = getField(this.plugin, key, this.fileClass);
			if (field) {
				const fieldManager = new FieldManager[field.type](field);
				fieldManager.addFieldOption(key, value, this.plugin.app, this.file, this.location);
			} else if (key !== "file" && (isSuggest(this.location) || isMenu(this.location))) {
				const defaultField = new Field(key)
				defaultField.type = FieldType.Input
				if (key === this.plugin.settings.fileClassAlias) {
					this.buildFileClassFieldOptions(defaultField, value)
				} else {
					const fieldManager = new Managers.Input(defaultField)
					fieldManager.addFieldOption(key, value, this.plugin.app, this.file, this.location)
				}
			}
		});
	}

	private addSectionSelectModalOption(): void {
		const modal = new chooseSectionModal(this.plugin, this.file, this.fileClass);
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

	private addFieldAtTheEndOfFrontmatterOption(): void {
		if (this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter) {
			const lineNumber = this.plugin.app.metadataCache.getCache(this.file.path)!.frontmatter!.position.end.line - 1
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("pin");
					item.setTitle("Add field in frontmatter");
					item.onClick(async (evt: MouseEvent) => {
						F.openFieldModal(this.plugin, this.file, undefined, "", lineNumber + 1, true, false)
					});
					item.setSection("metadata-menu");
				});
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_in_frontmatter",
					actionLabel: "Add a field in frontmatter...",
					action: () => F.openFieldModal(
						this.plugin, this.file, undefined, "", lineNumber + 1, true, false, this.fileClass),
					icon: "pin"
				})
			}
		}
	}

	private addFieldAtCurrentPositionOption(): void {
		const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
		const lineNumber = currentView?.editor.getCursor().line;
		if (lineNumber !== undefined && this.file.path == currentView?.file.path) {
			let inFrontmatter: boolean = false;
			const frontmatter = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatter
			if (frontmatter) {
				const { position: { start, end } } = frontmatter
				if (lineNumber >= start.line && lineNumber < end.line) inFrontmatter = true
			}
			if (isMenu(this.location)) {
				this.location.addItem((item) => {
					item.setIcon("pin");
					item.setTitle("Add field at cursor");
					item.onClick((evt: MouseEvent) => {
						F.openFieldModal(
							this.plugin, this.file, undefined, "", lineNumber, inFrontmatter, false, this.fileClass)
					});
					item.setSection("metadata-menu");
				});
			} else if (isInsertFieldCommand(this.location)) {
				F.openFieldModal(
					this.plugin, this.file, undefined, "", lineNumber, inFrontmatter, false, this.fileClass);
			} else if (isSuggest(this.location)) {
				this.location.options.push({
					id: "add_field_at_cursor",
					actionLabel: "Add field at cursor...",
					action: () => F.openFieldModal(
						this.plugin, this.file, undefined, "", lineNumber, inFrontmatter, false, this.fileClass),
					icon: "pin"
				})
			};
		}
	}
};
