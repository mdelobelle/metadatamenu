import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import { AllCanvasNodeData, CanvasData, CanvasEdgeData, CanvasFileData, CanvasGroupData, CanvasNodeData } from "obsidian/canvas"
import { IndexedFieldsPayload, postValues } from "./postValues";
import { buildMarkDownLink } from "src/fields/models/abstractModels/AbstractFile";
import { Field } from "src/fields/Field";

export async function updateCanvas(
    plugin: MetadataMenu,
    forceUpdateOne?: { canvas: TFile }
): Promise<void> {
    const start = Date.now()
    const f = plugin.fieldIndex;
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    const canvases = forceUpdateOne ? [forceUpdateOne.canvas] : plugin.app.vault.getFiles().filter(t => t.extension === "canvas")

    const isNodeInGroup = (node: CanvasFileData, group: CanvasGroupData): boolean => {
        const { x: x1, y: y1, width: w1, height: h1 } = node;
        const { x: x2, y: y2, width: w2, height: h2 } = group;
        return x2 <= x1 && y2 <= y1 && (x2 + w2) >= (x1 + w1) && (y2 + h2) >= (y1 + h1)
    }

    const orientedEdges = (
        direction: "incoming" | "outgoing" | "bothsides",
        edges: CanvasEdgeData[],
        node: CanvasNodeData
    ): CanvasEdgeData[] => {
        switch (direction) {
            case "incoming":
                return edges.filter(edge => edge.toNode === node.id);
            case "outgoing":
                return edges.filter(edge => edge.fromNode === node.id);
            case "bothsides":
                return edges.filter(edge => edge.fromNode === node.id || edge.toNode === node.id)
            default:
                return [];
        }
    }

    const targetNode = (
        direction: "incoming" | "outgoing" | "bothsides",
        edge: CanvasEdgeData,
        nodes: AllCanvasNodeData[],
        currentNode: AllCanvasNodeData
    ): (AllCanvasNodeData | undefined) => {
        switch (direction) {
            case "incoming":
                return nodes.find(node => node.id !== currentNode.id && node.id === edge.fromNode);
            case "outgoing":
                return nodes.find(node => node.id !== currentNode.id && node.id === edge.toNode);
            case "bothsides":
                return nodes.find(node => node.id !== currentNode.id && (node.id === edge.toNode || node.id === edge.fromNode));
            default:
                return undefined;
        }
    }

    const resolveFieldLinksForNode = (
        field: Field,
        targetFilePath: string,
        edges: CanvasEdgeData[],
        nodes: AllCanvasNodeData[],
        node: CanvasFileData | CanvasGroupData,
        cumulativeSet: Map<string, CanvasFileData[]>
    ) => {
        const { nodeColors, edgeColors, edgeFromSides, edgeToSides, edgeLabels, filesFromDVQuery, direction } = field.options

        const matchingFiles: string[] | undefined = filesFromDVQuery && dvApi ?
            new Function("dv", "current", `return ${filesFromDVQuery}`)(dvApi, dvApi.page(targetFilePath)) :
            undefined;
        const matchingEdges = orientedEdges(direction, edges, node)
        const linkNodes = matchingEdges.filter(edge =>
            !edgeLabels
            || edgeLabels.length === 0
            || edgeLabels.includes(edge.label)
        )
            //match edgeColor
            .filter(edge =>
                !edgeColors
                || edgeColors.length === 0
                || !edge.color && edgeColors.includes("0")
                || edgeColors.includes(edge.color)
            )
            //match edgeFromSide
            .filter(edge =>
                !edgeFromSides
                || edgeFromSides.length === 0
                || edgeFromSides.includes(edge.fromSide)
            )
            //match edgeFromSide
            .filter(edge =>
                !edgeToSides
                || edgeToSides.length === 0
                || edgeToSides.includes(edge.toSide)
            )
            //map corresponding nodes
            .map(edge => targetNode(direction, edge, nodes, node))
            //filter only file nodes
            .filter(node => !!node && node.type === "file")
            //match targetNode color
            .filter((node: CanvasFileData) =>
                !nodeColors
                || nodeColors.length === 0
                || !node.color && nodeColors.includes("0")
                || nodeColors.includes(node.color)
            )
            // filter files matching dvjs query
            .filter((node: CanvasFileData) => {
                return matchingFiles === undefined || matchingFiles.map((f: any) => f.file.path).includes(node.file)
            }) as CanvasFileData[]

        const uniqueLinkNodes = [...new Map(linkNodes.map((link) => [link.file, link])).values()];
        cumulativeSet.set(
            field.name,
            [
                ...(cumulativeSet.get(field.name) || []),
                ...(uniqueLinkNodes
                    .filter(
                        link => !cumulativeSet
                            .get(field.name)?.map(link => link.id)
                            .includes(link.id)
                    ) as CanvasFileData[]
                )
            ]
        )
    }

    const filterGroupsForField = (field: Field, canvasGroups: CanvasGroupData[], node: CanvasFileData) => {
        const { groupColors, groupLabels } = field.options
        const groupNodes = canvasGroups
            .filter(group =>
                !groupColors
                || groupColors.length === 0
                || !group.color && groupColors.includes("0")
                || groupColors.includes(group.color)
            )
            .filter(group =>
                !groupLabels
                || groupLabels.length === 0
                || groupLabels.includes(group.label)
            )
            // filter files matching dvjs query
            .filter(group => isNodeInGroup(node, group)) as CanvasGroupData[]
        return groupNodes
    }

    const resolveFieldGroupsForNode = (
        field: Field,
        canvasGroups: CanvasGroupData[],
        node: CanvasFileData,
        cumulatedGroupsFields: Map<string, CanvasGroupData[]>
    ) => {
        const groupNodes = filterGroupsForField(field, canvasGroups, node)
        cumulatedGroupsFields.set(
            field.name,
            [
                ...(cumulatedGroupsFields.get(field.name) || []),
                ...(groupNodes
                    .filter(
                        group => !cumulatedGroupsFields
                            .get(field.name)?.map(group => group.id)
                            .includes(group.id)
                    ) as CanvasGroupData[]
                )
            ]
        )
    }

    canvases.forEach(async canvas => {
        const previousFilesPaths = plugin.fieldIndex.canvasLastFiles.get(canvas.path) || []
        const currentFilesPaths: string[] = []
        let { nodes, edges }: CanvasData = { nodes: [], edges: [] };
        const rawContent = await plugin.app.vault.read(canvas)
        if (rawContent) {
            try {
                const canvasContent = JSON.parse(rawContent) as CanvasData;
                nodes = canvasContent.nodes;
                edges = canvasContent.edges
            } catch (error) {
                MDM_DEBUG && console.log(error)
                new Notice(`Couldn't read ${canvas.path}`)
            }
        }
        const canvasGroups: CanvasGroupData[] = nodes.filter(node => node.type === "group") as CanvasGroupData[]
        const currentFiles: Map<string, {
            cumulatedGroupsFields: Map<string, CanvasGroupData[]>,
            cumulatedLinksFields: Map<string, CanvasFileData[]>,
            cumulatedGroupsLinksFields: Map<string, CanvasFileData[]>
        }> = new Map()
        nodes.forEach(async node => {
            if (node.type === "file" && dvApi) {
                //update CanvasGroup fields
                const { cumulatedLinksFields, cumulatedGroupsFields, cumulatedGroupsLinksFields } =
                    currentFiles.get(node.file) ||
                    {
                        cumulatedGroupsFields: new Map<string, CanvasGroupData[]>(),
                        cumulatedLinksFields: new Map<string, CanvasFileData[]>(),
                        cumulatedGroupsLinksFields: new Map<string, CanvasFileData[]>()
                    }

                const targetFilePath = node.file
                if (!currentFilesPaths.includes(targetFilePath)) currentFilesPaths.push(targetFilePath)
                const fileFields = f.filesFields.get(targetFilePath)
                const linksFields = fileFields?.filter(field =>
                    field.type === "Canvas"
                    && field.options.canvasPath === canvas.path
                )
                const groupsFields = fileFields?.filter(field =>
                    field.type === "CanvasGroup"
                    && field.options.canvasPath === canvas.path
                )
                const groupsLinksFields = fileFields?.filter(field =>
                    field.type === "CanvasGroupLink"
                    && field.options.canvasPath === canvas.path
                )
                // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                linksFields?.forEach(field => {
                    resolveFieldLinksForNode(field, targetFilePath, edges, nodes, node, cumulatedLinksFields)
                })
                groupsFields?.forEach(field => {
                    resolveFieldGroupsForNode(field, canvasGroups, node, cumulatedGroupsFields)
                })
                groupsLinksFields?.forEach(field => {
                    // first filter the groups matching conditions
                    const groupNodes = filterGroupsForField(field, canvasGroups, node)
                    // get their links edges
                    groupNodes.forEach(node => {
                        resolveFieldLinksForNode(field, targetFilePath, edges, nodes, node, cumulatedGroupsLinksFields)
                    });
                    if (groupNodes.length === 0) {
                        cumulatedGroupsLinksFields.set(
                            field.name,
                            [...(cumulatedGroupsLinksFields.get(field.name) || [])]
                        )
                    }

                })
                currentFiles.set(node.file, {
                    cumulatedLinksFields: cumulatedLinksFields,
                    cumulatedGroupsFields: cumulatedGroupsFields,
                    cumulatedGroupsLinksFields: cumulatedGroupsLinksFields
                })
            }
        })
        //update target files
        currentFiles.forEach(async ({ cumulatedLinksFields, cumulatedGroupsFields, cumulatedGroupsLinksFields }, filePath) => {
            const file = plugin.app.vault.getAbstractFileByPath(filePath)
            if (file && file instanceof TFile) {
                const fields = plugin.fieldIndex.filesFields.get(file.path) || []
                const payload: IndexedFieldsPayload = []
                cumulatedLinksFields.forEach((linkNodes, name) => {
                    const field = fields.find(_f => _f.name === name)
                    const values = linkNodes.map((node: CanvasFileData) => buildMarkDownLink(plugin, file, node.file, node.subpath))
                    if (field) payload.push({ indexedPath: field.id, payload: { value: values ? [...(new Set(values))].join(",") : "" } })
                })
                cumulatedGroupsFields.forEach((groupNodes, name) => {
                    const field = fields.find(_f => _f.name === name)
                    const values = groupNodes.map((group: CanvasGroupData) => group.label)
                    if (field) payload.push({ indexedPath: field.id, payload: { value: values ? [...(new Set(values.filter(v => !!v)))].join(",") : "" } })
                })
                cumulatedGroupsLinksFields.forEach((linkNodes, name) => {
                    const field = fields.find(_f => _f.name === name)
                    const values = linkNodes.map((node: CanvasFileData) => buildMarkDownLink(plugin, file, node.file, node.subpath))
                    if (field) payload.push({ indexedPath: field.id, payload: { value: values ? [...(new Set(values))].join(",") : "" } })
                })
                if (payload.length) await postValues(plugin, payload, file)
            }
        })

        //clean removed files by putting their related canvas fields to null since they don't have anymore connections
        previousFilesPaths.filter(f => !currentFilesPaths.includes(f)).forEach(async filePath => {
            const targetFile = app.vault.getAbstractFileByPath(filePath)
            if (targetFile && targetFile instanceof TFile) {
                const payload: IndexedFieldsPayload = []
                // canvas fields
                const canvasFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === "Canvas"
                    && field.options.canvasPath === canvas.path
                )
                canvasFields?.forEach(field => { payload.push({ indexedPath: field.id, payload: { value: "" } }) })
                // canvas group fields
                const canvasGroupFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === "CanvasGroup"
                    && field.options.canvasPath === canvas.path
                )
                canvasGroupFields?.forEach(field => { payload.push({ indexedPath: field.id, payload: { value: "" } }) })
                // canvas group links fields
                const canvasGroupLinksFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === "CanvasGroupLink"
                    && field.options.canvasPath === canvas.path
                )
                canvasGroupLinksFields?.forEach(field => { payload.push({ indexedPath: field.id, payload: { value: "" } }) })
                if (payload.length) await postValues(plugin, payload, targetFile)
            }
        })
        plugin.fieldIndex.canvasLastFiles.set(canvas.path, currentFilesPaths)
    })
}


export async function updateCanvasAfterFileClass(plugin: MetadataMenu, files: TFile[] = []): Promise<void> {
    for (const file of files) {
        const index = plugin.fieldIndex
        //if (index.classFilesPath && file.path.startsWith(this.classFilesPath)) {
        if (index.classFilesPath && !file.path.startsWith(index.classFilesPath)) {
            const fileClassName = index.fileClassesPath.get(file.path)?.name
            const canvasFields = (fileClassName && index.fileClassesFields.get(fileClassName)?.filter(field => field.type === "Canvas")) || []
            await Promise.all(canvasFields.map(async field => {
                const canvasFile = plugin.app.vault.getAbstractFileByPath(field.options.canvasPath)
                if (canvasFile instanceof TFile && canvasFile.extension === "canvas") {
                    await updateCanvas(plugin, { canvas: canvasFile })
                }
            }))
        }
    }
}