import MetadataMenu from "main";
import { Component, debounce } from "obsidian";
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

        const ext = Prec.lowest(buildCMViewPlugin(this.plugin));
        this.plugin.registerEditorExtension(ext);

        this.observers = [];

        this.plugin.app.workspace.onLayoutReady(() => {
            this.initViewObservers();
            this.initModalObservers(document);
            updateVisibleLinks(this.plugin.app, this.plugin);
        });

        this.registerEvent(this.plugin.app.metadataCache.on('changed', debounce(this.updateLinks, 150, true)));
        this.registerEvent(this.plugin.app.metadataCache.on('metadata-menu:indexed', debounce(this.updateLinks, 150, true)));
        this.registerEvent(this.plugin.app.workspace.on("layout-change", debounce(this.updateLinks, 50, true)));
        this.registerEvent(this.plugin.app.workspace.on("window-open", (window, win) => this.initModalObservers(window.getContainer()!.doc)));
        this.registerEvent(this.plugin.app.workspace.on("layout-change", debounce(() => this.initViewObservers(), 50, true)));
        
        const bookmarksPlugin = this.plugin.app.internalPlugins.getPluginById("bookmarks");
        if (bookmarksPlugin?.instance) {
            this.registerEvent(bookmarksPlugin.instance.on("changed", debounce(this.updateLinks, 150, true)));
        }
    }

    public updateLinks = () => {
        if (this.observers.length === 0) {
            updateVisibleLinks(this.plugin.app, this.plugin);
            return;
        }
        
        updateVisibleLinks(this.plugin.app, this.plugin);
        
        this.observers.forEach(([observer, type, own_class]: [any, any, any]) => {
            const leaves = this.plugin.app.workspace.getLeavesOfType(type);
            leaves.forEach((leaf: any) => {
                this.updateContainer(leaf.view.containerEl, own_class, type);
            });
        });
    }


    private initViewObservers() {
        this.observers.forEach(([observer, type]) => {
            observer.disconnect();
        });
        this.observers = [];

        // @ts-ignore
        const backlinkInDocument = this.plugin.app?.internalPlugins?.plugins?.backlink?.instance?.options?.backlinkInDocument;

        this.registerViewType('backlink', ".tree-item-inner", true);
        this.registerViewType('bases', '.internal-link', true, 'internal-link', 'bases-tr');
        this.registerViewType('bases', '.internal-link', true, 'internal-link', 'bases-cards-item');
        this.registerViewType('BC-ducks', '.internal-link');
        this.registerViewType('BC-matrix', '.BC-Link');
        this.registerViewType('BC-tree', 'a.internal-link');
        this.registerViewType('file-explorer', '.nav-file-title-content', true);
        this.registerViewType('graph-analysis', '.internal-link');
        this.registerViewType('markdown', '.internal-link', true);
        this.registerViewType('outgoing-link', ".tree-item-inner", true);
        this.registerViewType('recent-files', '.nav-file-title-content', true);
        this.registerViewType('search', ".tree-item-inner", true);
        this.registerViewType('starred', '.nav-file-title-content', true);
        
        if (backlinkInDocument) {
            this.registerViewType('markdown', '.tree-item-inner', true);
        }
    }

    private initModalObservers(doc: Document) {
        const config = {
            subtree: false,
            childList: true,
            attributes: false
        };

        const pendingModalUpdates: Array<{node: HTMLElement, selector: string}> = [];
        let modalUpdateScheduled = false;
        
        const processModalUpdates = () => {
            const updates = pendingModalUpdates.splice(0);
            
            const CHUNK_SIZE = 10;
            let index = 0;
            
            const processChunk = () => {
                const end = Math.min(index + CHUNK_SIZE, updates.length);
                for (let i = index; i < end; i++) {
                    const {node, selector} = updates[i];
                    this.updateContainer(node, selector, null);
                    this._watchContainer(null, node, selector);
                }
                index = end;
                
                if (index < updates.length) {
                    requestAnimationFrame(processChunk);
                } else {
                    modalUpdateScheduled = false;
                }
            };
            
            processChunk();
        };

        this.modalObservers.push(new MutationObserver(records => {
            let hasUpdates = false;
            
            for (const mutation of records) {
                if (mutation.type !== 'childList') continue;
                
                for (const n of mutation.addedNodes) {
                    if (!(n instanceof HTMLElement)) continue;
                    
                    const className = n.className;
                    if (typeof className !== 'string') continue;
                    
                    const isModal = className.indexOf('modal-container') !== -1;
                    const isSuggestion = className.indexOf('suggestion-container') !== -1;
                    
                    if (isModal || isSuggestion) {
                        const selector = isSuggestion 
                            ? ".suggestion-title, .suggestion-note"
                            : ".suggestion-title, .suggestion-note, .another-quick-switcher__item__title, .omnisearch-result__title";
                        
                        pendingModalUpdates.push({node: n, selector});
                        hasUpdates = true;
                    }
                }
            }
            
            if (hasUpdates && !modalUpdateScheduled) {
                modalUpdateScheduled = true;
                requestAnimationFrame(processModalUpdates);
            }
        }));
        
        this.modalObservers.last()?.observe(doc.body, config);
    }

    private registerViewType(
        viewTypeName: string,
        selector: string,
        updateDynamic = false,
        ownClass = 'tree-item-inner',
        parent_class = 'tree-item'
    ) {
        const leaves = this.plugin.app.workspace.getLeavesOfType(viewTypeName);
        if (leaves.length > 1) {
            for (let i = 0; i < leaves.length; i++) {
                const container = leaves[i].view.containerEl;
                if (updateDynamic) {
                    this._watchContainerDynamic(viewTypeName + i, container, selector, ownClass, parent_class)
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
        
        if (nodes.length === 0) return;
        
        if (nodes.length < 50) {
            for (let i = 0; i < nodes.length; ++i) {
                const el = nodes[i] as HTMLElement;
                const isCanvasFileLink = el.parentElement?.getAttr("data-path")?.includes(".canvas");
                if (!isCanvasFileLink) {
                    updateDivExtraAttributes(this.plugin.app, this.plugin, el, viewTypeName, "");
                }
            }
            return;
        }
        
        const validElements: HTMLElement[] = [];
        
        for (let i = 0; i < nodes.length; ++i) {
            const el = nodes[i] as HTMLElement;
            const isCanvasFileLink = el.parentElement?.getAttr("data-path")?.includes(".canvas");
            if (!isCanvasFileLink) {
                validElements.push(el);
            }
        }
        
        for (const el of validElements) {
            updateDivExtraAttributes(this.plugin.app, this.plugin, el, viewTypeName, "");
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
        let updateScheduled = false;
        
        const observer = new MutationObserver((records, _) => {
            if (!updateScheduled) {
                updateScheduled = true;
                requestAnimationFrame(() => {
                    this.updateContainer(container, selector, viewType);
                    updateScheduled = false;
                });
            }
        });
        observer.observe(container, { subtree: true, childList: true, attributes: false });
        if (viewType) {
            this.observers.push([observer, viewType, selector]);
        }
    }

    private _watchContainerDynamic(viewType: string, container: HTMLElement, selector: string, ownClass = 'tree-item-inner', parent_class = 'tree-item') {
        const pendingUpdates: HTMLElement[] = [];
        let updateScheduled = false;
        
        const processPendingUpdates = () => {
            const updates = pendingUpdates.splice(0);
            
            const CHUNK_SIZE = 20;
            let index = 0;
            
            const processChunk = () => {
                const end = Math.min(index + CHUNK_SIZE, updates.length);
                for (let i = index; i < end; i++) {
                    updateDivExtraAttributes(this.plugin.app, this.plugin, updates[i], viewType, "");
                }
                index = end;
                
                if (index < updates.length) {
                    requestAnimationFrame(processChunk);
                } else {
                    updateScheduled = false;
                }
            };
            
            processChunk();
        };
        
        const observer = new MutationObserver((records, _) => {
            records.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((n) => {
                        if ('className' in n) {
                            // @ts-ignore
                            if (n.className.includes && typeof n.className.includes === 'function' && n.className.includes(parent_class)) {
                                const fileDivs = (n as HTMLElement).getElementsByClassName(ownClass);
                                for (let i = 0; i < fileDivs.length; ++i) {
                                    const link = fileDivs[i] as HTMLElement;
                                    pendingUpdates.push(link);
                                }
                            }
                        }
                    });
                }
            });
            
            if (!updateScheduled && pendingUpdates.length > 0) {
                updateScheduled = true;
                requestAnimationFrame(processPendingUpdates);
            }
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