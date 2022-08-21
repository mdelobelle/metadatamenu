import MetadataMenu from "main";
import { App, TFile, Menu, MarkdownView } from "obsidian";
import Field from "src/fields/Field";
import { FieldType, FieldManager } from "src/types/fieldTypes";
import chooseSectionModal from "../optionModals/chooseSectionModal";
import SelectModal from "src/optionModals/SelectModal";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { getField } from "src/commands/getField";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import { getLineFields } from "../utils/parser";
import Managers from "src/fields/fieldManagers/Managers";
import { FieldManager as F } from "src/fields/FieldManager";
import FileClassQuery from "src/fileClass/FileClassQuery";

function isMenu(category: Menu | SelectModal | "Command"): category is Menu {
	return (category as Menu).addItem !== undefined;
};

function isSelect(category: Menu | SelectModal | "Command"): category is SelectModal {
	return (category as SelectModal).modals !== undefined;
};

function isPaletteCommand(category: Menu | SelectModal | "Command"): category is "Command" {
	return (category as string) === "Command";
}

export default class OptionsList {

	// adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette

	app: App;
	file: TFile;
	plugin: MetadataMenu;
	path: string;
	category: Menu | SelectModal | "Command";
	fileClass: FileClass;
	attributes: Record<string, string>;
	fileClassForFields: boolean;
	fileClassFields: string[];

	constructor(plugin: MetadataMenu, file: TFile, category: Menu | SelectModal | "Command") {
		this.file = file;
		this.plugin = plugin;
		this.category = category;
		this.attributes = {};
		this.fileClassFields = [];
		this.fileClassForFields = false;
	};

	private async getGlobalFileClassForFields(): Promise<void> {
		const fileClass = this.plugin.settings.globalFileClass as string;
		try {
			const _fileClass = await createFileClass(this.plugin, fileClass);
			this.fileClass = _fileClass;
			this.fileClassFields = _fileClass.attributes.map(attr => attr.name);
			this.fileClassForFields = true;
		} catch (error) {
			//do nothing
		}
	}

	private async getQueryFileClassForFields(): Promise<void> {
		const fileClassQueries = this.plugin.settings.fileClassQueries.map(fcq => fcq)
		while (!this.fileClassForFields && fileClassQueries.length > 0) {
			const fileClassQuery = new FileClassQuery();
			Object.assign(fileClassQuery, fileClassQueries.pop() as FileClassQuery)
			if (fileClassQuery.matchFile(this.file)) {
				this.fileClassForFields = true;
				this.fileClass = await createFileClass(this.plugin, fileClassQuery.fileClassName)
				this.fileClassFields = this.fileClass.attributes.map(attr => attr.name)
			}
		}
	}

	private async fetchFrontmatterFields(): Promise<void> {
		const frontmatter = this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter;
		if (frontmatter) {
			const { position, ...attributes } = frontmatter;
			Object.keys(attributes).forEach(key => {
				if (!this.plugin.settings.globallyIgnoredFields.includes(key)) {
					this.attributes[key] = attributes[key];
				};
			});
			const fileClassAlias = this.plugin.settings.fileClassAlias;
			if (Object.keys(this.attributes).includes(fileClassAlias)) {
				const fileClass = this.attributes[fileClassAlias];
				try {
					const _fileClass = await createFileClass(this.plugin, fileClass);
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

	private async fetchInlineFields(): Promise<void> {
		const result = await this.plugin.app.vault.read(this.file);
		result.split('\n').map(line => {
			const lineFields = getLineFields(line);
			lineFields.forEach(({ attribute, values }) => {
				if (attribute && !this.plugin.settings.globallyIgnoredFields.includes(attribute.trim())) {
					if (this.fileClassForFields) {
						if (this.fileClassFields.includes(attribute.trim())) {
							this.attributes[attribute.trim()] = values ? values.trim() : "";
						};
					} else {
						this.attributes[attribute.trim()] = values ? values.trim() : "";
					};
				};

			})
		});
	}

	public async createExtraOptionList(): Promise<void> {
		await this.getGlobalFileClassForFields();
		await this.getQueryFileClassForFields();
		await this.fetchFrontmatterFields();
		await this.fetchInlineFields();
		if (this.fileClass) {
			const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, this.fileClass.getClassFile());
			if (isMenu(this.category)) {
				this.category.addSeparator();
				this.category.addItem((item) => {
					item.setIcon("gear");
					item.setTitle(`Manage <${this.fileClass.name}> fields`);
					item.onClick(() => fileClassAttributeSelectModal.open())
				});
			} else if (isSelect(this.category)) {
				this.category.addOption("manage_fileClass_attributes", `Manage <${this.fileClass.name}> fields`);
				this.category.modals["manage_fileClass_attributes"] = () => fileClassAttributeSelectModal.open();
			};
		}
		if (isMenu(this.category)) { this.category.addSeparator(); };
		if (isPaletteCommand(this.category)) {
			this.addFieldAtCurrentPositionOption();
		} else {
			this.buildFieldOptions();
			this.addSectionSelectModalOption();
			this.addFieldAtCurrentPositionOption();
		}
	}

	private buildFieldOptions(): void {
		Object.keys(this.attributes).forEach((key: string) => {
			const value = this.attributes[key];
			const field = getField(this.plugin, key, this.fileClass);
			if (field) {
				const fieldManager = new FieldManager[field.type](field);
				fieldManager.addMenuOption(key, value, this.plugin.app, this.file, this.category);
			} else if (isSelect(this.category)) {
				const defaultField = new Field(key)
				defaultField.type = FieldType.Input
				const fieldManager = new Managers.Input(defaultField)
				fieldManager.addMenuOption(key, value, this.plugin.app, this.file, this.category)
			}
		});
	}

	private addSectionSelectModalOption(): void {
		const modal = new chooseSectionModal(this.plugin, this.file, this.fileClass);
		if (isMenu(this.category)) {
			this.category.addItem((item) => {
				item.setIcon("enter");
				item.setTitle("Add field at section...");
				item.onClick((evt: MouseEvent) => {
					modal.open();
				});
				item.setSection("target-metadata");
			});
		} else if (isSelect(this.category)) {
			this.category.addOption("add_field_at_section", "Add field at section...");
			this.category.modals["add_field_at_section"] = () => modal.open();
		};
	};

	private async addFieldAtCurrentPositionOption(): Promise<void> {
		const lineNumber = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor.getCursor().line;
		const result = await this.plugin.app.vault.read(this.file)
		if (lineNumber) {
			let inFrontmatter: boolean = false;
			const frontmatter = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatter
			if (frontmatter) {
				const { position: { start, end } } = frontmatter
				if (lineNumber >= start.line && lineNumber < end.line) inFrontmatter = true
			}
			if (isMenu(this.category)) {
				this.category.addItem((item) => {
					item.setIcon("pin");
					item.setTitle("Add field at cursor");
					item.onClick((evt: MouseEvent) => {
						F.openFieldOrFieldSelectModal(
							this.plugin, this.file, undefined, lineNumber, result.split('\n')[lineNumber], inFrontmatter, false, this.fileClass)
					});
					item.setSection("target-metadata");
				});
			} else if (isSelect(this.category)) {
				this.category.addOption("add_field_at_cursor", "Add field at cursor...");
				this.category.modals["add_field_at_cursor"] = () => F.openFieldOrFieldSelectModal(
					this.plugin, this.file, undefined, lineNumber, result.split('\n')[lineNumber], inFrontmatter, false, this.fileClass);
			} else if (isPaletteCommand(this.category)) {
				F.openFieldOrFieldSelectModal(
					this.plugin, this.file, undefined, lineNumber, result.split('\n')[lineNumber], inFrontmatter, false, this.fileClass);
			};
		}
	}
};
