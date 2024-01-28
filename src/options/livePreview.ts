import { editorInfoField, MarkdownView, setIcon, TFile } from "obsidian";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { tokenClassNodeProp } from "@codemirror/language";
import MetadataMenu from "main";
import NoteFieldsComponent from "src/components/FieldsModal";
import { FileClassViewManager } from "src/components/FileClassViewManager";

export function buildCMViewPlugin(plugin: MetadataMenu) {
    // Implements the live preview supercharging
    // Code structure based on https://github.com/nothingislost/obsidian-cm6-attributes/blob/743d71b0aa616407149a0b6ea5ffea28e2154158/src/main.ts
    // Code help credits to @NothingIsLost! They have been a great help getting this to work properly.
    //FIXME icon isn't displayed in LP for files file a - in their name
    class HeaderWidget extends WidgetType {
        fileClassName?: string
        after: boolean
        destName: string

        constructor(fileClassName: string | undefined, after: boolean, destName: string) {
            super();
            this.fileClassName = fileClassName
            this.after = after
            this.destName = destName
        }

        toDOM() {
            let metadataMenuBtn = document.createElement("span");

            if (this.fileClassName) {
                metadataMenuBtn.setAttr("fileclass-name", this.fileClassName);
                metadataMenuBtn.addClass('fileclass-icon');
                metadataMenuBtn.addClass('metadata-menu');
                let fileClass = plugin.fieldIndex.fileClassesName.get(this.fileClassName)
                const classFilesPath = plugin.settings.classFilesPath
                if (classFilesPath && this.destName.includes(classFilesPath)) {
                    const icon = fileClass?.getIcon() || "file-spreadsheet"
                    fileClass = plugin.fieldIndex.fileClassesPath.get(this.destName + ".md")
                    if (fileClass) {
                        setIcon(metadataMenuBtn, icon || settings.fileClassIcon)
                        metadataMenuBtn.onclick = (event) => {
                            const fileClassViewManager = new FileClassViewManager(plugin, fileClass)
                            plugin.addChild(fileClassViewManager)
                            fileClassViewManager.build()
                            event.stopPropagation()
                        }
                    }
                } else if (fileClass) {

                    const icon = fileClass.getIcon();
                    setIcon(metadataMenuBtn, icon || settings.fileClassIcon)
                    metadataMenuBtn.onclick = (event) => {
                        const file = plugin.app.vault.getAbstractFileByPath(`${this.destName}.md`)
                        if (file instanceof TFile && file.extension === "md") {
                            const noteFieldsComponent = new NoteFieldsComponent(plugin, "1", () => { }, file)
                            plugin.addChild(noteFieldsComponent);
                        }
                        event.stopPropagation()
                    }
                }
            }

            // create a naive bread crumb
            return metadataMenuBtn;
        }

        ignoreEvent() {
            return true;
        }
    }

    const settings = plugin.settings;
    const viewPlugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            destroy() {
            }

            buildDecorations(view: EditorView) {
                let builder = new RangeSetBuilder<Decoration>();
                if (!settings.enableEditor) {
                    return builder.finish();
                }
                const mdView = view.state.field(editorInfoField) as MarkdownView;
                let lastAttributes = {};
                let iconDecoAfter: Decoration | null = null;
                let iconDecoAfterWhere: number | null = null;

                let mdAliasFrom: number | null = null;
                let mdAliasTo: number | null = null;
                for (let { from, to } of view.visibleRanges) {
                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter: (node) => {


                            const tokenProps = node.type.prop(tokenClassNodeProp);
                            if (tokenProps) {
                                const props = new Set(tokenProps.split(" "));
                                const isLink = props.has("hmd-internal-link");
                                const isAlias = props.has("link-alias");
                                const isPipe = props.has("link-alias-pipe");

                                // The 'alias' of the md link
                                const isMDLink = props.has('link');
                                // The 'internal link' of the md link
                                const isMDUrl = props.has('url');
                                const isMDFormatting = props.has('formatting-link');

                                if (isMDLink && !isMDFormatting) {
                                    // Link: The 'alias'
                                    // URL: The internal link
                                    mdAliasFrom = node.from;
                                    mdAliasTo = node.to;
                                }

                                if (!isPipe && !isAlias) {
                                    if (iconDecoAfter && iconDecoAfterWhere) {
                                        builder.add(iconDecoAfterWhere, iconDecoAfterWhere, iconDecoAfter);
                                        iconDecoAfter = null;
                                        iconDecoAfterWhere = null;
                                    }
                                }
                                if (mdView.file && isLink && !isAlias && !isPipe || isMDUrl) {

                                    let linkText = view.state.doc.sliceString(node.from, node.to);
                                    linkText = linkText.split("#")[0];
                                    let file = plugin.app.metadataCache.getFirstLinkpathDest(linkText, mdView!.file!.basename);
                                    if (isMDUrl && !file) {
                                        try {
                                            file = plugin.app.vault.getAbstractFileByPath(decodeURIComponent(linkText)) as TFile;
                                        }
                                        catch (e) { }
                                    }
                                    if (file) {
                                        let fileClassName: string | undefined
                                        if (plugin.settings.classFilesPath && file.path.startsWith(plugin.settings.classFilesPath)) fileClassName = file.basename
                                        else fileClassName = plugin.fieldIndex.filesFileClassesNames.get(file.path)?.last()
                                        if (fileClassName) {
                                            const attributes = { "fileclass-name": fileClassName }
                                            let deco = Decoration.mark({
                                                attributes,
                                                class: "fileclass-text"
                                            });
                                            iconDecoAfter = Decoration.widget({
                                                widget: new HeaderWidget(fileClassName, true, file.path.replace(/(.*).md/, "$1")),
                                            });

                                            if (isMDUrl && mdAliasFrom && mdAliasTo) {
                                                // Apply retroactively to the alias found before
                                                let deco = Decoration.mark({
                                                    attributes: attributes,
                                                    class: "fileclass-text"
                                                });
                                                //builder.add(mdAliasFrom, mdAliasFrom, iconDecoBefore);
                                                builder.add(mdAliasFrom, mdAliasTo, deco);
                                                if (iconDecoAfter) {
                                                    builder.add(mdAliasTo, mdAliasTo, iconDecoAfter);
                                                    iconDecoAfter = null;
                                                    iconDecoAfterWhere = null;
                                                    mdAliasFrom = null;
                                                    mdAliasTo = null;
                                                }
                                            }
                                            /*
                                            else {
                                                builder.add(node.from, node.from, iconDecoBefore);
                                            }
                                            */

                                            builder.add(node.from, node.to, deco);
                                            lastAttributes = attributes;
                                            iconDecoAfterWhere = node.to;
                                        }
                                    }
                                } else if (isLink && isAlias) {
                                    let deco = Decoration.mark({
                                        attributes: lastAttributes,
                                        class: "fileclass-text"
                                    });
                                    builder.add(node.from, node.to, deco);
                                    if (iconDecoAfter) {
                                        builder.add(node.to, node.to, iconDecoAfter);
                                        iconDecoAfter = null;
                                        iconDecoAfterWhere = null;
                                    }
                                }
                            }
                        }
                    })

                }
                return builder.finish();
            }
        },
        {
            decorations: v => v.decorations
        }
    );
    return viewPlugin;
}