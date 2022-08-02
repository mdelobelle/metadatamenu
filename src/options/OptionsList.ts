import MetadataMenu from "main";
import { App, TFile, Menu } from "obsidian";
import Field from "src/fields/Field";
import { FieldType, FieldManager } from "src/types/fieldTypes";
import chooseSectionModal from "../optionModals/chooseSectionModal";
import SelectModal from "src/optionModals/SelectModal";
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { getPropertySettings } from "src/commands/getPropertySettings";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import { genericFieldRegex } from "../utils/parser";
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

	constructor(plugin: MetadataMenu, file: TFile, category: Menu | SelectModal) {
		this.file = file;
		this.plugin = plugin;
		this.category = category;
	};

	public async createExtraOptionList(): Promise<void> {
		const frontmatter = this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter;
		if (frontmatter) {
			const { position, ...attributes } = frontmatter;
			Object.keys(attributes).forEach(key => {
				if (this.plugin.settings.globallyIgnoredFields.includes(key)) {
					delete attributes[key];
				};
			});
			if (isMenu(this.category)) { this.category.addSeparator(); };
			let fileClassForFields = false;
			let fileClassFields: string[] = [];
			const fileClassAlias = this.plugin.settings.fileClassAlias;
			if (Object.keys(attributes).includes(fileClassAlias)) {
				const fileClass = attributes[fileClassAlias];
				try {
					const _fileClass = await createFileClass(this.plugin, fileClass)
					this.fileClass = _fileClass;
					fileClassFields = _fileClass.attributes.map(attr => attr.name);
					fileClassForFields = true;
					Object.keys(attributes).forEach(key => {
						if (!fileClassFields.includes(key) && key != fileClassAlias) {
							delete attributes[key];
						};
					});
					const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, this.fileClass.getClassFile());
					if (isMenu(this.category)) {
						this.category.addSeparator();
						this.category.addItem((item) => {
							item.setIcon("gear");
							item.setTitle(`Manage <${this.fileClass.name}> fields`);
							item.onClick((evt) => {
								fileClassAttributeSelectModal.open();
							});
						});
					} else {
						this.category.addOption("manage_fileClass_attributes", `Manage <${this.fileClass.name}> fields`);
						this.category.modals["manage_fileClass_attributes"] = () => fileClassAttributeSelectModal.open();
					};

					this.buildExtraOptionsList(attributes); // frontmatter
					await this.createExtraOptionsListForInlineFields(this.file, fileClassForFields, fileClassFields);
					if (isMenu(this.category)) { this.category.addSeparator() };
					this.addSectionSelectModalOption();
				} catch (error) {
					this.buildExtraOptionsList(attributes); // frontmatter
					await this.createExtraOptionsListForInlineFields(this.file)
					if (isMenu(this.category)) { this.category.addSeparator(); };
					this.addSectionSelectModalOption();
				};
			} else {
				this.buildExtraOptionsList(attributes); // frontmatter
				await this.createExtraOptionsListForInlineFields(this.file)
				if (isMenu(this.category)) { this.category.addSeparator(); };
				this.addSectionSelectModalOption();
			};
		} else {
			await this.createExtraOptionsListForInlineFields(this.file)
			if (isMenu(this.category)) { this.category.addSeparator(); };
			this.addSectionSelectModalOption();
		};
	};

	private async createExtraOptionsListForInlineFields(
		file: TFile,
		fileClassForFields: boolean = false,
		fileClassFields: string[] = []
	): Promise<void> {
		let attributes: Record<string, string> = {};
		const regex = new RegExp(`^${genericFieldRegex}::\s*(?<values>.+)?`, "u");
		const result = await this.plugin.app.vault.read(file)
		result.split('\n').map(line => {
			const regexResult = line.match(regex);
			const { attribute, values } = regexResult?.groups || {}
			if (attribute && !this.plugin.settings.globallyIgnoredFields.includes(attribute.trim())) {
				if (fileClassForFields) {
					if (fileClassFields.includes(attribute.trim())) {
						attributes[attribute.trim()] = values ? values.trim() : "";
					};
				} else {
					attributes[attribute.trim()] = values ? values.trim() : "";
				};
			};
		});
		if (Object.keys(attributes).length > 0) {
			if (isMenu(this.category)) { this.category.addSeparator(); };
			this.buildExtraOptionsList(attributes);
		};
	};

	private buildExtraOptionsList(attributes: Record<string, string>) {
		Object.keys(attributes).forEach((key: string) => {
			const value = attributes[key];
			const propertySettings = getPropertySettings(this.plugin, key, this.fileClass);
			if (propertySettings) {
				const fieldManager = new FieldManager[propertySettings.type](propertySettings);
				fieldManager.addMenuOption(key, value, this.plugin.app, this.file, this.category);
			} else {
				const defaultField = new Field(key)
				defaultField.type = FieldType.Input
				const fieldManager = new Managers.Input(defaultField)
				fieldManager.addMenuOption(key, value, this.plugin.app, this.file, this.category)
			}
		});
	};

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
