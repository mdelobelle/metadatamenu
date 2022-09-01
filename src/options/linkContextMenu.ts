import MetadataMenu from "main";
import { TFile } from "obsidian";
import OptionsList from "src/options/OptionsList";
import FileClassOptionsList from "./FileClassOptionsList";

export default class linkContextMenu {
	private plugin: MetadataMenu;
	private file: TFile;
	private optionsList: OptionsList;
	private fileClassOptionsList: FileClassOptionsList

	constructor(plugin: MetadataMenu) {
		this.plugin = plugin;
		this.createContextMenu();
	};

	private createContextMenu(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, abstractFile, source) => {
				menu.addSeparator();
				//@ts-ignore
				menu.setSectionSubmenu("metadata-menu.fields", { title: "Manage Fields", icon: "pencil" })
				//@ts-ignore
				menu.setSectionSubmenu("metadata-menu.fileclass-fields", { title: "Manage Fileclass Fields", icon: "wrench" })
				const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path);

				if (file instanceof TFile && file.extension === 'md') {
					this.file = file;

					//If fileClass
					if (file.parent.path + "/" == this.plugin.settings.classFilesPath) {
						this.fileClassOptionsList = new FileClassOptionsList(this.plugin, this.file, menu)
						this.fileClassOptionsList.createExtraOptionList();
					} else {
						this.optionsList = new OptionsList(this.plugin, this.file, menu);
						this.optionsList.createExtraOptionList();
					};

				};
			})
		);
	};
};