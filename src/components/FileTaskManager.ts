import { Component, TFile } from "obsidian"
import MetadataMenu from "main"
import { v4 as uuidv4 } from 'uuid';


export class Task {
    public status: "pending" | "ongoing" | "done";
    public id: string;

    constructor(public fn: () => any) {
        this.status = "pending"
        this.id = uuidv4()
    }
}

export default class FileTaskManager extends Component {

    public queue: Map<string, Task>;
    public busy: boolean = false;

    constructor(private plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super();
        this.queue = new Map();
    }

    async onload(): Promise<void> {
        this.plugin.registerEvent(this.plugin.app.metadataCache.on('resolved', async () => {
            //console.log("obsidian resolved");
            this.busy = false;
            await this.executeNext();
        }))
        this.plugin.registerEvent(
            this.plugin.app.vault.on("modify", async (file) => {
                if (file instanceof TFile && file.extension === "canvas") {
                    this.busy = false;
                    await this.executeNext();
                }
            })
        )
    }


    public async pushTask(fn: () => any) {
        const task = new Task(fn);
        this.queue.set(task.id, task);
        if (!this.busy) await this.executeNext();
    }

    public async executeNext() {
        const [firstTaskInQueueId, firstTaskInQueue] = [...this.queue][0] || [undefined, undefined]
        if (firstTaskInQueue && !this.plugin.app.metadataCache.inProgressTaskCount) {
            this.busy = true;
            firstTaskInQueue.status = "ongoing"
            await firstTaskInQueue.fn()
            firstTaskInQueue.status = "done"
            this.queue.delete(firstTaskInQueueId)
            console.log("done: ", firstTaskInQueueId)
            console.log("remaining", [...this.queue].length)
            // in case nothing has changed in frontmatter, processFrontmatter wont trigger metadatacache resolve 
            // and no task will be in progress so we can execute next
            if (!this.plugin.app.metadataCache.inProgressTaskCount) await this.executeNext();
        } else if (this.plugin.app.metadataCache.inProgressTaskCount) {
            console.log(`wait ... ${this.plugin.app.metadataCache.inProgressTaskCount} tasks in progress`)
        } else {
            console.log("nothing else to do")
        }
    }
}