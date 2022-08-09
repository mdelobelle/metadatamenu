import MetadataMenu from "main";
import { App, TFile, Menu } from "obsidian";
import Field from "src/fields/Field";
import { FieldType, FieldManager } from "src/types/fieldTypes";
import chooseSectionModal from "../optionModals/chooseSectionModal";
import SelectModal from "src/optionModals/SelectModal";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { getField } from "src/commands/getField";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import { getLineFields } from "../utils/parser";
import Managers from "src/fields/fieldManagers/Managers";

function isMenu(category: Menu | SelectModal): category is Menu {
	return (category as Menu).addItem !== undefined;
};

function isSelect(category: Menu | SelectModal): category is SelectModal {
	return (category as SelectModal).modals !== undefined;
};

export default class OptionsList {

	// adds options to context menu or to a dropdown modal trigger with "Field: Options" command in command pallette

	app: App;
	file: TFile;
	plugin: MetadataMenu;
	path: string;
	category: Menu | SelectModal;
	fileClass: FileClass;
	attributes: Record<string, string>;
	fileClassForFields: boolean;
	fileClassFields: string[];

	constructor(plugin: MetadataMenu, file: TFile, category: Menu | SelectModal) {
		this.file = file;
		this.plugin = plugin;
		this.category = category;
		this.attributes = {};
		this.fileClassFields = [];
		this.fileClassForFields = false;
	};

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
			if (Object.keys(this.attributes).includes(fileClassAlias) || this.plugin.settings.globalFileClass) {
				const fileClass = this.attributes[fileClassAlias] || this.plugin.settings.globalFileClass as string;
				try {
					const _fileClass = await createFileClass(this.plugin, fileClass)
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
			} else {
				this.category.addOption("manage_fileClass_attributes", `Manage <${this.fileClass.name}> fields`);
				this.category.modals["manage_fileClass_attributes"] = () => fileClassAttributeSelectModal.open();
			};
		}
		if (isMenu(this.category)) { this.category.addSeparator(); };
		this.buildFieldOptions();
		this.addSectionSelectModalOption();
	}

	private buildFieldOptions(): void {
		Object.keys(this.attributes).forEach((key: string) => {
			const value = this.attributes[key];
			const field = getField(this.plugin, key, this.fileClass);
			if (field) {
				const fieldManager = new FieldManager[field.type](field);
				fieldManager.addMenuOption(key, value, this.plugin.app, this.file, this.category);
			} else {
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
				item.setIcon("pencil");
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
};
