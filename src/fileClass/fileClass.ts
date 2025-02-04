import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { Notice, SuggestModal, TFile } from "obsidian";
import { capitalize } from "src/utils/textUtils";
import { postValues } from "src/commands/postValues";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { Note } from "src/note/note";
import FieldIndex from "src/index/FieldIndex";
import { MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import { SavedView } from "./views/tableViewComponents/saveViewModal";
import { insertMissingFields } from "src/commands/insertMissingFields";
import { compareArrays } from "src/utils/array";
import { FieldType, FieldType as IFieldType, MultiDisplayType } from "src/fields/Fields"
import { Field, getNewFieldId, stringToBoolean, FieldCommand } from "src/fields/Field";

//#region Fileclass, options

interface ShortId {
	id: string
	path: string
}

const options: Record<string, { name: string, toValue: (value: any) => any }> = {
	"limit": { name: "limit", toValue: (value: any) => value },
	"mapWithTag": { name: "mapWithTag", toValue: (value: boolean) => value },
	"icon": { name: "icon", toValue: (value: any) => `${value || "file-spreadsheet"}` },
	"tagNames": { name: "tagNames", toValue: (values: string[]) => values.length ? values : null },
	"filesPaths": { name: "filesPaths", toValue: (values: string[]) => values.length ? values : null },
	"bookmarksGroups": { name: "bookmarksGroups", toValue: (values: string[]) => values.length ? values : null },
	"excludes": { name: "excludes", toValue: (values: FileClassAttribute[]) => values.length ? values.map(attr => attr.name) : null },
	"parents": { name: "extends", toValue: (values: FileClass[]) => values.length ? values : null },
	"savedViews": { name: "savedViews", toValue: (value: SavedView[]) => value },
	"favoriteView": { name: "favoriteView", toValue: (value?: string) => value || null },
	"fieldsOrder": { name: "fieldsOrder", toValue: (value?: Field['id'][]) => value || [] }
}

export interface FileClassChild {
	name: string,
	path: string[],
	fileClass: FileClass
}

export interface FileClassOptions {
	limit: number,
	icon: string,
	parents: string[];
	excludes?: Array<FileClassAttribute>;
	tagNames?: string[],
	mapWithTag: boolean,
	filesPaths?: string[],
	bookmarksGroups?: string[],
	savedViews?: SavedView[],
	favoriteView?: string | null
	fieldsOrder?: Field['id'][]
}

export class FileClassOptions {

	constructor(
		public limit: number,
		public icon: string,
		public parents: string[],
		public excludes?: Array<FileClassAttribute>,
		public tagNames?: string[],
		public mapWithTag: boolean = false,
		public filesPaths?: string[],
		public bookmarksGroups?: string[],
		public savedViews?: SavedView[],
		public favoriteView?: string | null,
		public fieldsOrder?: Field['id'][]
	) {

	}
}

interface FileClass extends FileClassOptions {
	attributes: Array<FileClassAttribute>;
	errors: string[];
	options: FileClassOptions;
}

export class AddFileClassToFileModal extends SuggestModal<string> {

	constructor(
		private plugin: MetadataMenu,
		private file: TFile
	) {
		super(plugin.app)
	}

	getSuggestions(query: string): string[] | Promise<string[]> {
		const fileClasses = [...this.plugin.fieldIndex.fileClassesName.keys()]
			.filter(fileClassName => !this.plugin.fieldIndex.filesFileClasses
				.get(this.file.path)?.map(fileClass => fileClass.name)
				.includes(fileClassName)
			)
			.filter(fileClassName => fileClassName.toLocaleLowerCase().contains(query.toLowerCase()))
			.sort();
		return fileClasses
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.setText(value);
		el.setAttr("id", `fileclass-${value}-add-choice`)
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		this.insertFileClassToFile(item)
	}
	async insertFileClassToFile(value: string) {
		const fileClassAlias = this.plugin.settings.fileClassAlias
		const currentFileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path)
		const newValue = currentFileClasses ? [...currentFileClasses.map(fc => fc.name), value].join(", ") : value
		await postValues(this.plugin, [{ indexedPath: `fileclass-field-${fileClassAlias}`, payload: { value: newValue } }], this.file, -1)
		if (this.plugin.settings.autoInsertFieldsAtFileClassInsertion) {
			insertMissingFields(this.plugin, this.file, -1)
		}
	}
}
class FileClass {
	constructor(public plugin: MetadataMenu, public name: string) {
		this.attributes = [];
	}

	public getFileClassOptions(): FileClassOptions {
		const {
			extends: _parents,
			limit: _limit,
			excludes: _excludes,
			mapWithTag: _mapWithTag,
			tagNames: _tagNames,
			filesPaths: _filesPaths,
			bookmarksGroups: _bookmarksGroups,
			icon: _icon,
			savedViews: _savedViews,
			favoriteView: _favoriteView,
			fieldsOrder: _fieldsOrder
		} = this.plugin.app.metadataCache.getFileCache(this.getClassFile())?.frontmatter as Record<string, any> || {}
		const index = this.plugin.fieldIndex
		const parents = _parents || [];
		const excludedNames = getExcludedFieldsFromFrontmatter(_excludes);

		const excludes: FileClassAttribute[] = []
		index.fileClassesAncestors.get(this.getClassFile().basename)?.forEach(ancestorName => {
			index.fileClassesName.get(ancestorName)?.attributes.forEach(attr => {
				if (excludedNames.includes(attr.name) && !excludes.map(attr => attr.name).includes(attr.name)) excludes.push(attr)
			})
		})
		const limit = typeof (_limit) === 'number' ? _limit : this.plugin.settings.tableViewMaxRecords
		const mapWithTag = stringToBoolean(_mapWithTag);
		const tagNames = getTagNamesFromFrontMatter(_tagNames);
		const filesPaths = getFilesPathsFromFrontMatter(_filesPaths);
		const bookmarksGroups = getBookmarksGroupsFromFrontMatter(_bookmarksGroups);
		const icon = typeof (_icon) === 'string' ? _icon : this.plugin.settings.fileClassIcon
		const savedViews: SavedView[] = _savedViews || [];
		const favoriteView: string | null = (typeof _favoriteView === "string" && _favoriteView !== "") ? _favoriteView : null
		const fieldsOrder: Field['id'][] = _fieldsOrder || []
		return new FileClassOptions(limit, icon, parents, excludes, tagNames, mapWithTag, filesPaths, bookmarksGroups, savedViews, favoriteView, fieldsOrder);
	}

	public isMappedWithTag(): boolean {
		try {
			const fileClassFile = this.getClassFile();
			const mapWithTag = this.plugin.app.metadataCache.getFileCache(fileClassFile)?.frontmatter?.mapWithTag;
			return !!mapWithTag;
		} catch (error) {
			return false
		}
	}

	public getClassFile(): TFile {
		const filesClassPath = this.plugin.settings.classFilesPath;
		const file = this.plugin.app.vault.getAbstractFileByPath(`${filesClassPath}${this.name}.md`);
		if (file instanceof TFile && file.extension == "md") {
			return file;
		} else {
			const error = new Error(
				`no file named <${this.name}.md> in <${filesClassPath}> folder to match <${this.plugin.settings.fileClassAlias}: ${this.name}> in one of these notes`
			);
			throw error;
		}
	}

	public getIcon(): string {
		const parents = [this.name, ...this.plugin.fieldIndex.fileClassesAncestors.get(this.name) || []]
		let icon: string | undefined;
		parents.some((fileClassName) => {
			const fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
			if (fileClass) {
				const file = fileClass.getClassFile();
				const _icon = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.icon
				if (_icon) {
					icon = _icon
					return true;
				}
			}
		})
		return icon || this.plugin.settings.fileClassIcon
	}

	public async missingFieldsForFileClass(file: TFile): Promise<boolean> {

		const note = await Note.buildNote(this.plugin, file)
		const currentFieldsIds: string[] = note.existingFields.map(_f => _f.field.id)

		const missingFields = this && file ?
			!this.plugin.fieldIndex.fileClassesFields.get(this.name)?.map(f => f.id).every(id => currentFieldsIds.includes(id)) :
			false
		return missingFields
	}

	public moveField(thisId: string, direction: "upwards" | "downwards") {
		const thisPath = getFileClassAttributes(this.plugin, this).find(attr => attr.id === thisId)?.path
		const sortedPaths: ShortId[] = []
		for (const attr of buildSortedAttributes(this.plugin, this)) {
			sortedPaths.push({ id: attr.id, path: attr.getField().path })
		}
		const compareShortId = (a: ShortId) => a.id === thisId && a.path === thisPath
		const thisIndex = sortedPaths.findIndex(compareShortId)
		let newIndex = thisIndex
		const testPath = (j: number) => {
			if (sortedPaths[j].path === thisPath) {
				newIndex = j;
				return true
			}
			return false
		}
		if (direction === "upwards" && thisIndex > 0) {
			for (let j = thisIndex - 1; j >= 0; j--) if (testPath(j)) break
		} else if (direction === "downwards" && thisIndex < sortedPaths.length) {
			for (let j = thisIndex + 1; j < sortedPaths.length; j++) if (testPath(j)) break
		}
		[sortedPaths[thisIndex], sortedPaths[newIndex]] = [sortedPaths[newIndex], sortedPaths[thisIndex]]
		this.options.fieldsOrder = sortedPaths.map(p => p.id)
		this.updateOptions(this.options)
	}

	public getViewChildren(name?: string): FileClassChild[] {
		if (!name) return []
		const childrenNames = this.getFileClassOptions().savedViews?.find(_view => _view.name === name)?.children || []
		return this.getChildren().filter(c => childrenNames.includes(c.name))
	}


	public getAttributes(): void {
		try {
			const file = this.getClassFile();
			const ancestors = this.plugin.fieldIndex.fileClassesAncestors.get(this.name);
			const _excludedFields = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.excludes
			const excludedFields = getExcludedFieldsFromFrontmatter(_excludedFields);

			const ancestorsAttributes: Map<string, FileClassAttribute[]> = new Map();
			ancestorsAttributes.set(this.name, getFileClassAttributes(this.plugin, this, excludedFields))

			ancestors?.forEach(ancestorName => {
				const ancestorFile = this.plugin.app.vault.getAbstractFileByPath(`${this.plugin.settings.classFilesPath}${ancestorName}.md`)
				const ancestor = new FileClass(this.plugin, ancestorName);
				ancestorsAttributes.set(ancestorName, getFileClassAttributes(this.plugin, ancestor, excludedFields))
				if (ancestorFile instanceof TFile && ancestorFile.extension === "md") {
					const _excludedFields = this.plugin.app.metadataCache.getFileCache(ancestorFile)?.frontmatter?.excludes
					excludedFields.push(...getExcludedFieldsFromFrontmatter(_excludedFields));
				}
			})
			for (const [fileClassName, fileClassAttributes] of ancestorsAttributes) {
				this.attributes.push(...fileClassAttributes.filter(attr => !this.attributes.map(_attr => _attr.name).includes(attr.name)))
			}
		} catch (error) {
			throw (error);
		}
	}

	public getVersion(): string | undefined {
		return this.plugin.app.metadataCache.getFileCache(this.getClassFile())?.frontmatter?.version
	}

	public getMajorVersion(): number | undefined {
		const version = this.getVersion();
		if (version) {
			//in v1 of fileClass, version was a number; in newer versions it is a string x.y
			const [x, y] = `${version}`.split(".")
			if (!y) return undefined
			return parseInt(x)
		} else {
			return undefined
		}
	}

	private async incrementVersion(): Promise<void> {
		const file = this.getClassFile()
		const currentVersion = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.version
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			if (currentVersion) {
				const [x, y] = currentVersion.split(".");
				fm.version = `${x}.${parseInt(y) + 1}`
			} else {
				fm.version = "2.0"
			}
		})
	}

	public async updateOptions(newOptions: FileClassOptions): Promise<void> {
		const file = this.getClassFile()
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			Object.keys(options).forEach(async (key: keyof typeof options) => {
				const { name, toValue } = options[key]
				fm[name] = toValue(newOptions[key as keyof FileClassOptions])
			})
		})
		await this.incrementVersion();
	}

	public getChildren(): FileClassChild[] {
		const childrenNames: FileClassChild[] = [];
		[...this.plugin.fieldIndex.fileClassesAncestors].forEach(([_fName, ancestors]) => {
			if (ancestors.includes(this.name)) {
				const path = [...ancestors.slice(0, ancestors.indexOf(this.name)).reverse(), _fName]
				const fileClass = this.plugin.fieldIndex.fileClassesName.get(_fName)
				if (fileClass) {
					childrenNames.push({
						name: _fName,
						path: path,
						fileClass: fileClass
					})
				}
			}
		})
		return childrenNames
	}

	public async updateAttribute(
		newType: FieldType,
		newName: string,
		newOptions?: string[] | Record<string, string>,
		attr?: FileClassAttribute,
		newCommand?: FieldCommand,
		newDisplay?: MultiDisplayType,
		newStyle?: Record<keyof typeof FieldStyleLabel, boolean>,
		newPath?: string
	): Promise<void> {
		const fileClass = attr ? this.plugin.fieldIndex.fileClassesName.get(attr.fileClassName)! : this
		const file = fileClass.getClassFile();
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			fm.fields = fm.fields || []
			if (attr) {
				const field = fm.fields.find((f: FileClassAttribute) => f.id === attr.id)
				field.type = newType;
				if (newOptions) field.options = newOptions;
				if (newCommand) field.command = newCommand;
				if (newDisplay) field.display = newDisplay;
				if (newStyle) field.style = newStyle;
				if (newName) field.name = newName;
				if (newPath !== undefined) field.path = newPath
			} else {
				fm.fields.push({
					name: newName,
					type: newType,
					options: newOptions,
					command: newCommand,
					display: newDisplay,
					style: newStyle,
					path: newPath,
					id: getNewFieldId(this.plugin)
				})
			}
		})
		await this.incrementVersion();
	}

	public async updateIAttribute(
		attr: Field,
		newType: IFieldType,
		newName: string,
		newOptions?: string[] | Record<string, string>,
		newCommand?: FieldCommand,
		newDisplay?: MultiDisplayType,
		newStyle?: Record<keyof typeof FieldStyleLabel, boolean>,
		newPath?: string
	): Promise<void> {
		const fileClass = attr && attr.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(attr.fileClassName)! : this
		const file = fileClass.getClassFile();
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			fm.fields = fm.fields || []
			const field = fm.fields.find((f: FileClassAttribute) => f.id === attr.id)
			if (field) {
				field.type = newType;
				if (newOptions) field.options = newOptions;
				if (newCommand) field.command = newCommand;
				if (newDisplay) field.display = newDisplay;
				if (newStyle) field.style = newStyle;
				if (newName) field.name = newName;
				if (newPath !== undefined) field.path = newPath
			} else {
				fm.fields.push({
					name: newName,
					type: newType,
					options: newOptions,
					command: newCommand,
					display: newDisplay,
					style: newStyle,
					path: newPath,
					id: getNewFieldId(this.plugin)
				})
			}
		})
		await this.incrementVersion();
	}

	public async removeAttribute(attr: FileClassAttribute): Promise<void> {
		const file = this.getClassFile();
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			fm.fields = fm.fields.filter((f: any) => f.id !== attr.id)
		})
	}

	public async removeIAttribute(attr: Field): Promise<void> {
		const file = this.getClassFile();
		await this.plugin.app.fileManager.processFrontMatter(file, fm => {
			fm.fields = fm.fields.filter((f: any) => f.id !== attr.id)
		})
	}
}

export { FileClass }
//#endregion
//#region methods

export function buildSortedAttributes(plugin: MetadataMenu, fileClass: FileClass): FileClassAttribute[] {
	const attributes = getFileClassAttributes(plugin, fileClass);
	const options = fileClass.getFileClassOptions()
	const presetOrder = options.fieldsOrder || []
	//1 sort according to preset order
	attributes.sort((a, b) =>
		presetOrder.indexOf(a.id) > presetOrder.indexOf(b.id) ? 1 : -1
	)
	//2. rebuild a clean herarchy
	const sortedAttributes = attributes.filter(attr => !attr.path)
	let hasError = false
	while (sortedAttributes.length < attributes.length) {
		const _initial = [...sortedAttributes]
		sortedAttributes.forEach((sAttr, parentIndex) => {
			for (const attr of attributes) {
				if (
					attr.path?.split("____").last() === sAttr.id &&
					!sortedAttributes.includes(attr)
				) {
					//insert before next field at same or lower level as parent
					const parentLevel = sAttr.getLevel()
					const parentSibling = sortedAttributes.slice(parentIndex + 1).find(oAttr => oAttr.getLevel() <= parentLevel)
					const parentSiblingIndex = parentSibling ? sortedAttributes.indexOf(parentSibling) : sortedAttributes.length
					sortedAttributes.splice(parentSiblingIndex, 0, attr)
					break
				}
			}
		})
		if (_initial.length === sortedAttributes.length) {
			console.error("Impossible to restore field hierarchy, check you fileclass configuration")
			new Notice("Impossible to restore field hierarchy, check you fileclass configuration")
			hasError = true
			return getFileClassAttributes(plugin, fileClass);
		}
	}
	//3. update the fieldsOrder to store a clean hierarchy
	options.fieldsOrder = sortedAttributes.map(sAttr => sAttr.id)
	if (!compareArrays(presetOrder, options.fieldsOrder)) fileClass.updateOptions(options)
	//4. return the sortedAttributes
	return sortedAttributes
}

export function createFileClass(plugin: MetadataMenu, name: string): FileClass {
	const fileClass = new FileClass(plugin, name);
	fileClass.options = fileClass.getFileClassOptions()
	fileClass.getAttributes();
	return fileClass
}

export function getBookmarksGroupsFromFrontMatter(_bookmarksGroups: string[] | string | undefined): string[] {
	if (Array.isArray(_bookmarksGroups)) {
		return _bookmarksGroups;
	} else if (_bookmarksGroups) {
		return _bookmarksGroups.split(",")
	} else {
		return []
	}
}

export function getExcludedFieldsFromFrontmatter(excludedFields: string[] | string | undefined): string[] {
	if (Array.isArray(excludedFields)) {
		return excludedFields;
	} else if (excludedFields) {
		return excludedFields.split(",")
	} else {
		return []
	}
}

export function getFileClassAttributes(plugin: MetadataMenu, fileClass: FileClass, excludes?: string[]): FileClassAttribute[] {
	const file = fileClass.getClassFile();
	const rawAttributes = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.fields || []
	const attributes: FileClassAttribute[] = [];
	rawAttributes.forEach((attr: any) => {
		const { name, id, type, options, command, display, style, path } = attr;
		const fieldType = capitalize(type) as FieldType;
		attributes.push(new FileClassAttribute(plugin, name, id, fieldType, options, fileClass.name, command, display, style, path))
	})
	if (excludes) {
		return attributes.filter(attr => !excludes.includes(attr.name))
	} else {
		return attributes
	}
}

export function getFileClassNameFromPath(settings: MetadataMenuSettings, path: string): string | undefined {
	const fileClassNameRegex = new RegExp(`${settings.classFilesPath}(?<fileClassName>.*).md`);
	return path.match(fileClassNameRegex)?.groups?.fileClassName
}

export function getFilesPathsFromFrontMatter(_filesPaths: string[] | string | undefined): string[] {
	if (Array.isArray(_filesPaths)) {
		return _filesPaths;
	} else if (_filesPaths) {
		return _filesPaths.split(",")
	} else {
		return []
	}
}

export function getSortedRootFields(plugin: MetadataMenu, fileClass: FileClass): Field[] {
	const fieldsOrder = fileClass.fieldsOrder ||
		buildSortedAttributes(plugin, fileClass).map(attr => attr.id)
	const iFinder = (f: Field) => { return (id: string) => f.id === id }
	const fields = plugin.fieldIndex.fileClassesFields
		.get(fileClass.name)?.filter(_f => _f.isRoot()) || [];
	const sortedFields = fields.sort((f1, f2) => {
		return fieldsOrder.findIndex(iFinder(f1)) < fieldsOrder.findIndex(iFinder(f2)) ? -1 : 1
	})
	return sortedFields
}

export function sortFileFields(index: FieldIndex, file: TFile): Field[] {
	const fileClasses = index.filesFileClasses.get(file.path) || [];
	const sortedAttributes: Field[] = []
	for (const fileClass of fileClasses) {
		const fileClassFields = index.fileClassesFields.get(fileClass.name) || []
		const order = fileClass.options.fieldsOrder
		const sortedFields = order
			? fileClassFields.sort((f1, f2) => order.indexOf(f1.id) < order.indexOf(f2.id) ? -1 : 1)
			: fileClassFields
		sortedAttributes.push(...sortedFields)
	}
	return sortedAttributes
}

export function getTagNamesFromFrontMatter(_tagNames: string[] | string | undefined): string[] {
	if (Array.isArray(_tagNames)) {
		return _tagNames;
	} else if (_tagNames) {
		return _tagNames.split(",")
	} else {
		return []
	}
}

export function indexFileClass(index: FieldIndex, file: TFile): void {
	const fileClassName = getFileClassNameFromPath(index.plugin.settings, file.path)
	if (fileClassName) {
		try {
			const fileClass = createFileClass(index.plugin, fileClassName)
			index.fileClassesFields.set(
				fileClassName,
				fileClass.attributes
					.map(attr => attr.getIField())
					.filter(field =>
						field !== undefined
						/* in case getIField doesn't resolve the field won't be added and the error will be silent*/
					) as Field[]
			)
			index.fileClassesPath.set(file.path, fileClass)
			index.fileClassesName.set(fileClass.name, fileClass)
			const cache = index.plugin.app.metadataCache.getFileCache(file);
			if ((fileClass.getMajorVersion() === undefined || fileClass.getMajorVersion() as number < 2) && index.plugin.manifest.version < "0.6.0") {
				index.v1FileClassesPath.set(file.path, fileClass)
				index.remainingLegacyFileClasses = true
			}
			/*
			** Map with tags
			*/
			if (cache?.frontmatter?.mapWithTag) {
				if (!fileClassName.includes(" ")) {
					index.tagsMatchingFileClasses.set(fileClassName, fileClass)
				}
			}
			if (cache?.frontmatter?.tagNames) {
				const _tagNames = cache?.frontmatter?.tagNames as string | string[];
				const tagNames = Array.isArray(_tagNames) ? [..._tagNames] : _tagNames.split(",").map(t => t.trim())
				tagNames.forEach(tag => {
					if (!tag.includes(" ")) {
						index.tagsMatchingFileClasses.set(tag, fileClass)
					}
				})
			}
			/*
			** Map with files paths
			*/
			if (cache?.frontmatter?.filesPaths) {
				const _filesPaths = cache?.frontmatter?.filesPaths as string | string[];
				const filesPaths = Array.isArray(_filesPaths) ? [..._filesPaths] : _filesPaths.split(",").map(f => f.trim())
				filesPaths.forEach(path => index.filesPathsMatchingFileClasses.set(path, fileClass))
			}
			/*
			** Map with bookmarks groups
			*/
			if (cache?.frontmatter?.bookmarksGroups) {
				const _bookmarksGroups = cache?.frontmatter?.bookmarksGroups as string | string[];
				const bookmarksGroups = Array.isArray(_bookmarksGroups) ? [..._bookmarksGroups] : _bookmarksGroups.split(",").map(g => g.trim())
				bookmarksGroups.forEach(group => index.bookmarksGroupsMatchingFileClasses.set(group, fileClass))
			}
		} catch (error) {
			console.error(error)
		}
	}
}

//#endregion
