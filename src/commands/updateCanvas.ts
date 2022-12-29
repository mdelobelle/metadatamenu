import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import { AllCanvasNodeData, CanvasData, CanvasEdgeData, CanvasFileData, CanvasGroupData, CanvasLinkData, CanvasNodeData, CanvasTextData } from "obsidian/canvas"
import { FieldType } from "src/types/fieldTypes";
import { FieldsPayload, postValues } from "./postValues";
import { FieldManager } from "src/fields/FieldManager";

export async function updateCanvas(
    plugin: MetadataMenu,
    forceUpdateOne?: { canvas: TFile }
): Promise<void> {
    const start = Date.now()
    //console.log("start update canvas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    //retrieve canvas files to screen -> make an index for that?
    const canvases = forceUpdateOne ? [forceUpdateOne.canvas] : plugin.app.vault.getFiles().filter(t => t.extension === "canvas")
    //for each canvas check target nodes' files to see if they contain a Canvas field and populate an index with them

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

    canvases.forEach(async canvas => {
        const previousFilesPaths = plugin.fieldIndex.canvasLastFiles.get(canvas.path) || []
        const currentFilesPaths: string[] = []
        let { nodes, edges }: CanvasData = { nodes: [], edges: [] };
        try {
            const canvasContent = JSON.parse(await plugin.app.vault.read(canvas)) as CanvasData;
            nodes = canvasContent.nodes;
            edges = canvasContent.edges
        } catch (error) {
            console.log(error)
            new Notice(`Couldn't read ${canvas.path}`)
        }
        const canvasGroups: CanvasGroupData[] = nodes.filter(node => node.type === "group") as CanvasGroupData[]
        const currentFiles: Map<string, { cumulatedGroupsFields: Map<string, CanvasGroupData[]>, cumulatedLinksFields: Map<string, CanvasFileData[]> }> = new Map()
        nodes.forEach(async node => {
            if (node.type === "file" && dvApi) {
                //update CanvasGroup fields
                //TODO
                const { cumulatedLinksFields, cumulatedGroupsFields } =
                    currentFiles.get(node.file) ||
                    {
                        cumulatedGroupsFields: new Map<string, CanvasGroupData[]>(),
                        cumulatedLinksFields: new Map<string, CanvasFileData[]>()
                    }
                //update Canvas fields
                const targetFilePath = node.file
                if (!currentFilesPaths.includes(targetFilePath)) currentFilesPaths.push(targetFilePath)

                //get edges that point to this file
                const linksFields = f.filesFields.get(targetFilePath)?.filter(field =>
                    field.type === FieldType.Canvas
                    && field.options.canvasPath === canvas.path
                )
                const groupsFields = f.filesFields.get(targetFilePath)?.filter(field =>
                    field.type === FieldType.CanvasGroup
                    && field.options.canvasPath === canvas.path
                )

                // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                linksFields?.forEach(field => {
                    const { nodeColors, edgeColors, edgeFromSides, edgeToSides, edgeLabels, filesFromDVQuery, direction } = field.options

                    const matchingFiles: string[] | undefined = filesFromDVQuery ?
                        new Function("dv", "current", `return ${filesFromDVQuery}`)(dvApi, dvApi.page(targetFilePath)) :
                        undefined;
                    const matchingEdges = orientedEdges(direction, edges, node)
                    const linkNodes = matchingEdges
                        //match edgeLabel
                        .filter(edge =>
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
                    cumulatedLinksFields.set(
                        field.name,
                        [
                            ...(cumulatedLinksFields.get(field.name) || []),
                            ...(uniqueLinkNodes
                                .filter(
                                    link => !cumulatedLinksFields
                                        .get(field.name)?.map(link => link.id)
                                        .includes(link.id)
                                ) as CanvasFileData[]
                            )
                        ]
                    )
                })
                groupsFields?.forEach(field => {
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
                })
                currentFiles.set(node.file, { cumulatedLinksFields: cumulatedLinksFields, cumulatedGroupsFields: cumulatedGroupsFields })
            }
        })
        //update target files
        currentFiles.forEach(async ({ cumulatedLinksFields, cumulatedGroupsFields }, filePath) => {
            const file = app.vault.getAbstractFileByPath(filePath)
            if (file && file instanceof TFile) {
                const payload: FieldsPayload = []
                cumulatedLinksFields.forEach((linkNodes, name) => {
                    const values = linkNodes.map((node: CanvasFileData) => FieldManager.buildMarkDownLink(plugin, file, node.file))
                    payload.push({ name: name, payload: { value: values ? [...(new Set(values))].join(",") : "" } })
                })
                cumulatedGroupsFields.forEach((groupNodes, name) => {
                    const values = groupNodes.map((group: CanvasGroupData) => group.label)
                    payload.push({ name: name, payload: { value: values ? [...(new Set(values.filter(v => !!v)))].join(",") : "" } })
                })
                if (payload.length) await postValues(plugin, payload, file)
            }
        })
        //clean removed files by putting their related canvas fields to null since they don't have anymore connections
        previousFilesPaths.filter(f => !currentFilesPaths.includes(f)).forEach(async filePath => {
            const targetFile = app.vault.getAbstractFileByPath(filePath)
            if (targetFile && targetFile instanceof TFile) {
                const payload: FieldsPayload = []
                const canvasFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === FieldType.Canvas
                    && field.options.canvasPath === canvas.path
                )
                // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                canvasFields?.forEach(field => { payload.push({ name: field.name, payload: { value: "" } }) })
                const canvasGroupFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === FieldType.CanvasGroup
                    && field.options.canvasPath === canvas.path
                )
                // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                canvasFields?.forEach(field => { payload.push({ name: field.name, payload: { value: "" } }) })
                canvasGroupFields?.forEach(field => { payload.push({ name: field.name, payload: { value: "" } }) })
                if (payload.length) await postValues(plugin, payload, targetFile)
            }
        })
        plugin.fieldIndex.canvasLastFiles.set(canvas.path, currentFilesPaths)
    })
}
