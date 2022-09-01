import MetadataMenu from "main";
import { Menu, Platform, TAbstractFile, TFile } from "obsidian";
import OptionsList from "src/options/OptionsList";
import FileClassOptionsList from "./FileClassOptionsList";

export default class linkContextMenu {
	private plugin: MetadataMenu;

	constructor(plugin: MetadataMenu) {
		this.plugin = plugin;
		this.createContextMenu();
	};

	private buildOptions(file: TFile | TAbstractFile | null, menu: Menu): void {
		if (file instanceof TFile && file.extension === 'md') {
			if (!Platform.isMobile) {
				//@ts-ignore
				menu.setSectionSubmenu("metadata-menu.fields", { title: "Manage Fields", icon: "pencil" })
				//@ts-ignore
				menu.setSectionSubmenu("metadata-menu-fileclass.fileclass-fields", { title: "Manage Fileclass Fields", icon: "wrench" })
			}
			//If fileClass
			if (file.parent.path + "/" == this.plugin.settings.classFilesPath) {
				const fileClassOptionsList = new FileClassOptionsList(this.plugin, file, menu)
				fileClassOptionsList.createExtraOptionList();
			} else {
				const optionsList = new OptionsList(this.plugin, file, menu);
				optionsList.createExtraOptionList();
			};

		};
	}

	private createContextMenu(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, abstractFile, source) => {
				const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path);
				this.buildOptions(file, menu)
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu, editor, view) => {
				const file = this.plugin.app.workspace.getActiveFile()
				this.buildOptions(file, menu)
			})
		)
	};
};