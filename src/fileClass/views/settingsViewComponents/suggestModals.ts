import { ButtonComponent, setIcon, SuggestModal, TAbstractFile, TFolder } from "obsidian"
import { FileClassSettingsView } from "../fileClassSettingsView"
import MetadataMenu from "main"
import { cleanActions } from "src/utils/modals";
import { BookmarkItem } from "src/typings/types"

export class ParentMultiSelectModal extends SuggestModal<string>{
	private selectedChildren: Array<string>;
	private view: FileClassSettingsView;

	constructor(
		private _view: FileClassSettingsView
	) {
		super(_view.plugin.app);
		this.view = _view;
		this.containerEl.setAttr("id", `${this.view.fileClass.name}-extends-suggest-modal`);
		this.containerEl.addClass("metadata-menu");
		const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
		inputContainer.appendChild(this.inputEl)
		this.containerEl.find(".prompt").prepend(inputContainer)
		cleanActions(this.containerEl, ".footer-actions")
		const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
		this.buildFooterActions(footerActionsContainer)
		this.selectedChildren = this.view.fileClass.getFileClassOptions().parents || [];
		this.containerEl.onkeydown = (e) => {
			if (e.key == "Enter" && e.altKey) {
				const options = this.view.fileClass.getFileClassOptions()
				options.parents = []
				this.selectedChildren.forEach(p => {
					const pn = this.view.plugin.fieldIndex.fileClassesName.get(p)
					if (pn)
						options.parents.push(pn.name)
				});
				options.parents = options.parents.reverse()
				this.view.fileClass.updateOptions(options)
				this.close();
			}
		}
	}

	private isSelected(value: string) {
		return this.selectedChildren.map(c => c.toLocaleLowerCase()).includes(value.toLocaleLowerCase())
	}

	getSuggestions(query: string): string[] {
		const children = [...this.view.plugin.fieldIndex.fileClassesName.values()]
			.filter(c => !query || c.name.toLocaleLowerCase() !== query.toLocaleLowerCase())
			.filter(c => c.name !== this.view.fileClass.name)
		const sortedChildren = children.sort((c1, c2) => c1.getClassFile().path.toLocaleLowerCase() < c2.getClassFile().path.toLocaleLowerCase() ? -1 : 1)
		return sortedChildren.map(c => c.name)
	}

	buildFooterActions(footerActionsContainer: HTMLDivElement) {
		footerActionsContainer.createDiv({ cls: "spacer" })
		//confirm button
		this.buildConfirm(footerActionsContainer)
		//cancel button
		const cancelButton = new ButtonComponent(footerActionsContainer)
		cancelButton.setIcon("cross")
		cancelButton.onClick(() => this.close())
		cancelButton.setTooltip("Cancel")
		this.modalEl.appendChild(footerActionsContainer)
	}

	buildConfirm(footerActionsContainer: HTMLDivElement) {
		const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
		infoContainer.setText("Alt+Enter to save")
		const confirmButton = new ButtonComponent(footerActionsContainer)
		confirmButton.setIcon("checkmark")
		confirmButton.onClick(async () => {
			const options = this.view.fileClass.getFileClassOptions()
			options.parents = []
			this.selectedChildren.forEach(p => {
				const pn = this.view.plugin.fieldIndex.fileClassesName.get(p)
				if (pn)
					options.parents.push(pn.name)
			});
			options.parents = options.parents.reverse()
			this.view.fileClass.updateOptions(options)
			this.close();
		})
	}

	renderSelected() {
		//@ts-ignore
		const chooser = this.chooser
		const suggestions: HTMLDivElement[] = chooser.suggestions
		const values: string[] = chooser.values
		suggestions.forEach((s, i) => {
			if (this.isSelected(values[i])) {
				s.addClass("value-checked")
				if (s.querySelectorAll(".icon-container").length == 0) {
					const iconContainer = s.createDiv({ cls: "icon-container" })
					setIcon(iconContainer, "check-circle")
				}
			} else {
				s.removeClass("value-checked")
				s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
			}
		})
	}

	renderSuggestion(value: string, el: HTMLElement) {
		const labelContainer = el.createDiv({ cls: "label-with-icon-container" })
		const icon = labelContainer.createDiv({ cls: "icon" })
		const fc = this.view.plugin.fieldIndex.fileClassesName.get(value)
		if (fc) setIcon(icon, fc.getIcon())
		const label = labelContainer.createDiv({ cls: "label" })
		label.setText(`${value}`)
		el.addClass("value-container")
		const spacer = this.containerEl.createDiv({ cls: "spacer" })
		el.appendChild(spacer)
		if (this.isSelected(value)) {
			el.addClass("value-checked")
			const iconContainer = el.createDiv({ cls: "icon-container" })
			setIcon(iconContainer, "check-circle")
		}
		this.inputEl.focus()
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		if (this.isSelected(value)) {
			const child = this.selectedChildren.find(c => c === value)
			if (child) this.selectedChildren.remove(child)
		} else {
			this.selectedChildren.push(value)
		}
		this.renderSelected()
	}
	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) { }
}
// export class ParentSuggestModal extends SuggestModal<string> {
//
// 	constructor(private view: FileClassSettingsView) {
// 		super(view.plugin.app)
// 		this.containerEl.setAttr("id", `${this.view.fileClass.name}-extends-suggest-modal`)
// 	}
//
// 	getSuggestions(query: string): string[] {
// 		const fileClassesNames = [...this.view.plugin.fieldIndex.fileClassesName.keys()] as string[]
// 		const currentName = this.view.fileClass.name
// 		return fileClassesNames
// 			.sort()
// 			.filter(name => name !== currentName && name.toLowerCase().includes(query.toLowerCase()))
// 	}
//
// 	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
// 		const options = this.view.fileClass.getFileClassOptions()
// 		const parent = this.view.plugin.fieldIndex.fileClassesName.get(item)
// 		if (parent) {
// 			options.parents = parent
// 			this.view.fileClass.updateOptions(options)
// 		}
// 	}
//
// 	renderSuggestion(value: string, el: HTMLElement) {
// 		el.setText(value)
// 	}
// }

export class TagSuggestModal extends SuggestModal<string> {

	constructor(private view: FileClassSettingsView) {
		super(view.plugin.app)
		this.containerEl.setAttr("id", `${this.view.fileClass.name}-tagNames-suggest-modal`)
	}

	getSuggestions(query: string): string[] {
		//@ts-ignore
		const tags = Object.keys(this.view.plugin.app.metadataCache.getTags())
		return tags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		const options = this.view.fileClass.getFileClassOptions()
		const tagNames = options.tagNames || []
		tagNames.push(item.replace(/^#(.*)/, "$1"))
		options.tagNames = tagNames
		this.view.fileClass.updateOptions(options)

	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.setText(value)
	}
}

export class FieldSuggestModal extends SuggestModal<string> {

	constructor(private view: FileClassSettingsView) {
		super(view.plugin.app)
		this.containerEl.setAttr("id", `${this.view.fileClass.name}-excludes-suggest-modal`)
	}

	getSuggestions(query: string): string[] {
		const fileClassName = this.view.fileClass.name
		const fileClassFields = this.view.plugin.fieldIndex.fileClassesFields.get(fileClassName) || []
		const excludedFields = this.view.fileClass.getFileClassOptions().excludes

		return fileClassFields
			.filter(fCA =>
				fCA.fileClassName !== fileClassName
				&& fCA.fileClassName?.toLowerCase().includes(query.toLowerCase())
				&& !excludedFields?.map(attr => attr.name).includes(fCA.name)
			)
			.map(fCA => fCA.name)
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		const options = this.view.fileClass.getFileClassOptions()
		const excludedFields = options.excludes || []
		const excludedField = this.view.fileClass.attributes.find(field => field.name === item)
		if (excludedField) {
			excludedFields.push(excludedField)
			options.excludes = excludedFields
			this.view.fileClass.updateOptions(options)
		}
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.setText(value)
	}
}

export class PathSuggestModal extends SuggestModal<string> {
	private plugin: MetadataMenu
	constructor(private view: FileClassSettingsView) {
		super(view.plugin.app)
		this.plugin = view.plugin
		this.containerEl.setAttr("id", `${this.view.fileClass.name}-filesPaths-suggest-modal`)
	}

	getSuggestions(query: string): string[] {
		const abstractFiles = this.plugin.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];

		abstractFiles.forEach((folder: TAbstractFile) => {
			if (
				folder instanceof TFolder &&
				folder.path.toLowerCase().contains(query.toLowerCase())
			) {
				folders.push(folder);
			}
		});

		return folders.map(f => f.path);
	}


	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		const options = this.view.fileClass.getFileClassOptions()
		const filesPaths = options.filesPaths || []
		filesPaths.push(item)
		options.filesPaths = filesPaths
		this.view.fileClass.updateOptions(options)
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.setText(value)
	}
}

export class BookmarksGroupSuggestModal extends SuggestModal<string> {
	private plugin: MetadataMenu
	constructor(private view: FileClassSettingsView) {
		super(view.plugin.app)
		this.plugin = view.plugin
		this.containerEl.setAttr("id", `${this.view.fileClass.name}-bookmarksGroups-suggest-modal`)
	}

	private getGroups = (items: BookmarkItem[], groups: string[] = [], path = "") => {
		for (const item of items) {
			if (item.type === "group") {
				const subPath = `${path}${path ? "/" : ""}${item.title}`
				groups.push(subPath)
				if (item.items) this.getGroups(item.items, groups, subPath)
			}
		}
	}

	getSuggestions(query: string): string[] {
		//@ts-ignore

		const bookmarks = this.plugin.fieldIndex.bookmarks
		const groups: string[] = ["/"]
		if (bookmarks.enabled) this.getGroups(bookmarks.instance.items, groups)
		return groups
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		const cache = this.plugin.app.metadataCache.getFileCache(this.view.fileClass.getClassFile())?.frontmatter as Record<string, any> || {}
		const options = this.view.fileClass.getFileClassOptions()
		const bookmarksGroups = options.bookmarksGroups || []
		bookmarksGroups.push(item)
		options.bookmarksGroups = bookmarksGroups
		this.view.fileClass.updateOptions(options)

	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.setText(value)
	}
}
