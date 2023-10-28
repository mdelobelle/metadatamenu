import MetadataMenu from "main";
import { Component, TFile, debounce } from "obsidian";
import { clearExtraAttributes, updateDivExtraAttributes, updateElLinks, updateVisibleLinks } from "src/options/linkAttributes";
import { Prec } from "@codemirror/state";
import { buildCMViewPlugin } from "src/options/livePreview";

export default class ExtraButton extends Component {

    private observers: [MutationObserver, string, string][];
    private modalObservers: MutationObserver[] = [];

    constructor(
        public plugin: MetadataMenu
    ) {
        super();
    }

    onload(): void {
        this.plugin.registerMarkdownPostProcessor((el, ctx) => {
            updateElLinks(this.plugin.app, this.plugin, el, ctx)
        });

        // Live preview
        const ext = Prec.lowest(buildCMViewPlugin(this.plugin));
        this.plugin.registerEditorExtension(ext);

        this.observers = [];

        this.plugin.app.workspace.onLayoutReady(() => {
            this.initViewObservers();
            this.initModalObservers(document);
            updateVisibleLinks(this.plugin.app, this.plugin);
        });

        // Initialization
        this.registerEvent(this.plugin.app.metadataCache.on('changed', debounce(this.updateLinks, 500, true)));
        this.registerEvent(this.plugin.app.workspace.on("layout-change", debounce(this.updateLinks, 10, true)));
        this.registerEvent(this.plugin.app.workspace.on("window-open", (window, win) => this.initModalObservers(window.getContainer()!.doc)));
        this.registerEvent(this.plugin.app.workspace.on("layout-change", () => this.initViewObservers()));
    }

    public updateLinks = () => {
        updateVisibleLinks(this.plugin.app, this.plugin);
        this.observers.forEach(([observer, type, own_class]: [any, any, any]) => {
            const leaves = this.plugin.app.workspace.getLeavesOfType(type);
            leaves.forEach((leaf: any) => {
                this.updateContainer(leaf.view.containerEl, own_class, type);
            })
        });
    }


    private initViewObservers() {
        // Reset observers
        this.observers.forEach(([observer, type]) => {
            observer.disconnect();
        });
        this.observers = [];

        // Register new observers
        this.registerViewType('backlink', ".tree-item-inner", true);
        this.registerViewType('outgoing-link', ".tree-item-inner", true);
        this.registerViewType('search', ".tree-item-inner", true);
        this.registerViewType('BC-matrix', '.BC-Link');
        this.registerViewType('BC-ducks', '.internal-link');
        this.registerViewType('BC-tree', 'a.internal-link');
        this.registerViewType('graph-analysis', '.internal-link');
        this.registerViewType('starred', '.nav-file-title-content', true);
        this.registerViewType('file-explorer', '.nav-file-title-content', true);
        this.registerViewType('recent-files', '.nav-file-title-content', true);
        // If backlinks in editor is on
        // @ts-ignore
        if (this.plugin.app?.internalPlugins?.plugins?.backlink?.instance?.options?.backlinkInDocument) {
            this.registerViewType('markdown', '.tree-item-inner', true);
        }
    }

    private initModalObservers(doc: Document) {
        const config = {
            subtree: false,
            childList: true,
            attributes: false
        };

        this.modalObservers.push(new MutationObserver(records => {
            records.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(n => {
                        if ('className' in n &&
                            // @ts-ignore
                            (n.className.includes('modal-container') && this.plugin.settings.enableQuickSwitcher
                                // @ts-ignore
                                || n.className.includes('suggestion-container') && this.plugin.settings.enableSuggestor)) {
                            let selector = ".suggestion-title, .suggestion-note, .another-quick-switcher__item__title, .omnisearch-result__title";
                            // @ts-ignore
                            if (n.className.includes('suggestion-container')) {
                                selector = ".suggestion-title, .suggestion-note";
                            }
                            this.updateContainer(n as HTMLElement, selector, null);
                            this._watchContainer(null, n as HTMLElement, selector);
                        }
                    });
                }
            });
        }));
        this.modalObservers.last()?.observe(doc.body, config);
    }

    private registerViewType(viewTypeName: string, selector: string, updateDynamic = false) {
        const leaves = this.plugin.app.workspace.getLeavesOfType(viewTypeName);
        if (leaves.length > 1) {
            for (let i = 0; i < leaves.length; i++) {
                const container = leaves[i].view.containerEl;
                if (updateDynamic) {
                    this._watchContainerDynamic(viewTypeName + i, container, selector)
                }
                else {
                    this._watchContainer(viewTypeName + i, container, selector);
                }
            }
        }
        else if (leaves.length < 1) return;
        else {
            const container = leaves[0].view.containerEl;
            this.updateContainer(container, selector, viewTypeName);
            if (updateDynamic) {
                this._watchContainerDynamic(viewTypeName, container, selector)
            }
            else {
                this._watchContainer(viewTypeName, container, selector);
            }
        }
    }

    private updateContainer(container: HTMLElement, selector: string, viewTypeName: string | null) {
        const nodes = container.findAll(selector);
        for (let i = 0; i < nodes.length; ++i) {
            const el = nodes[i] as HTMLElement;
            const isCanvasFileLink = el.parentElement?.getAttr("data-path")?.includes(".canvas")
            if (!isCanvasFileLink) {
                updateDivExtraAttributes(this.plugin.app, this.plugin, el, viewTypeName, "");
            }
        }
    }

    private removeFromContainer(container: HTMLElement, selector: string) {
        const nodes = container.findAll(selector);
        for (let i = 0; i < nodes.length; ++i) {
            const el = nodes[i] as HTMLElement;
            clearExtraAttributes(el);
        }
    }

    private _watchContainer(viewType: string | null, container: HTMLElement, selector: string) {
        let observer = new MutationObserver((records, _) => {
            this.updateContainer(container, selector, viewType);
        });
        observer.observe(container, { subtree: true, childList: true, attributes: false });
        if (viewType) {
            this.observers.push([observer, viewType, selector]);
        }
    }

    private _watchContainerDynamic(viewType: string, container: HTMLElement, selector: string, ownClass = 'tree-item-inner', parent_class = 'tree-item') {
        // Used for efficient updating of the backlinks panel
        // Only loops through newly added DOM nodes instead of changing all of them
        let observer = new MutationObserver((records, _) => {
            records.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((n) => {
                        if ('className' in n) {
                            // @ts-ignore
                            if (n.className.includes && typeof n.className.includes === 'function' && n.className.includes(parent_class)) {
                                const fileDivs = (n as HTMLElement).getElementsByClassName(ownClass);
                                for (let i = 0; i < fileDivs.length; ++i) {
                                    const link = fileDivs[i] as HTMLElement;
                                    updateDivExtraAttributes(this.plugin.app, this.plugin, link, viewType, "");
                                }
                            }
                        }
                    });
                }
            });
        });
        observer.observe(container, { subtree: true, childList: true, attributes: false });
        this.observers.push([observer, viewType, selector]);
    }

    reloadObservers() {
        this.disconnectObservers();
        this.initModalObservers(document);
        this.initViewObservers();
        updateVisibleLinks(this.plugin.app, this.plugin);
    }

    private disconnectObservers() {
        this.observers.forEach(([observer, type, own_class]) => {
            observer.disconnect();
            const leaves = this.plugin.app.workspace.getLeavesOfType(type);
            leaves.forEach(leaf => {
                this.removeFromContainer(leaf.view.containerEl, own_class);
            })
        });
        for (const observer of this.modalObservers) {
            observer.disconnect();
        }
    }

    onunload(): void {
        this.disconnectObservers();
    }
}