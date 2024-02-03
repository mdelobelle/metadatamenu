import MetadataMenu from "main";
import { Component, Menu, Platform, requireApiVersion, TAbstractFile, TFile } from "obsidian";
import OptionsList from "src/options/OptionsList";
import FileClassOptionsList from "../options/FileClassOptionsList";
import FieldCommandSuggestModal from "../options/FieldCommandSuggestModal";
import { FileClass, getFileClassNameFromPath } from "src/fileClass/fileClass";

export default class ContextMenu extends Component {
	fileContextMenuOpened: boolean = false
	constructor(private plugin: MetadataMenu) {
		super()
	};

	onload(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', async (menu, abstractFile, source) => {
				this.fileContextMenuOpened = true
				const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path);
				this.buildOptions(file, menu);
				menu.onHide = () => {
					this.fileContextMenuOpened = false
				}

			})
		);

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (!this.fileContextMenuOpened) {
					const file = this.plugin.app.workspace.getActiveFile();
					this.buildOptions(file, menu);
				}
			})
		)
	}

	private buildOptions(file: TFile | TAbstractFile | null, menu: Menu): void {

		const classFilesPath = this.plugin.settings.classFilesPath
		if (file instanceof TFile && file.extension === 'md') {
			if (!Platform.isMobile && requireApiVersion("0.16.0")) {
				if (classFilesPath && file.path.startsWith(classFilesPath)) {
					const fileClassName = getFileClassNameFromPath(this.plugin.settings, file.path)
					menu.setSectionSubmenu(
						`metadata-menu-fileclass.${fileClassName}.fileclass-fields`,
						{ title: "Manage fields", icon: "wrench" }
					);
				} else {
					const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(file.path) || [];
					fileClasses.forEach(fileClass => {
						menu.setSectionSubmenu(
							`metadata-menu-fileclass.${fileClass.name}.fileclass-fields`,
							{ title: `Manage ${fileClass.name} fields`, icon: "wrench" }
						)
					})
				}
			}
			if (this.plugin.settings.displayFieldsInContextMenu) {
				//If fileClass
				if (classFilesPath && file.path.startsWith(classFilesPath)) {
					const fileClassOptionsList = new FileClassOptionsList(this.plugin, file, menu)
					fileClassOptionsList.createExtraOptionList();
				} else {
					const optionsList = new OptionsList(this.plugin, file, menu);
					optionsList.createContextMenuOptionsList();
				};
			} else {
				menu.addItem((item) => {
					item.setIcon("list")
					item.setTitle("Field Options")
					item.onClick(async () => {
						const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
						const optionsList = new OptionsList(this.plugin, file, fieldCommandSuggestModal);
						await optionsList.createExtraOptionList();
					})
				})
			}
		};

	}
};