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

export class FileTaskManager extends Component {

    public queue: Map<string, Task>;

    constructor(private plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super();
        this.queue = new Map();
    }

    async onload(): Promise<void> {
        this.plugin.registerEvent(this.plugin.app.metadataCache.on('resolved', async () => {
            //console.log("obsidian resolved")
            await this.executeNext();
        }))
    }

    public async pushTask(fn: () => any) {
        const task = new Task(fn);
        this.queue.set(task.id, task);
        await this.executeNext();
    }

    public async executeNext() {
        const [firstTaskInQueueId, firstTaskInQueue] = [...this.queue][0] || [undefined, undefined]
        if (firstTaskInQueue && !this.plugin.app.metadataCache.inProgressTaskCount) {
            await firstTaskInQueue.fn()
            this.queue.delete(firstTaskInQueueId)
            //console.log("done: ", firstTaskInQueueId)
            //console.log("remaining", [...this.queue].length)
        } else if (this.plugin.app.metadataCache.inProgressTaskCount) {
            //console.log(`wait ... ${this.plugin.app.metadataCache.inProgressTaskCount} tasks in progress`)
        } else {
            //console.log("nothing else to do")
        }
    }
}