import { TFile } from "obsidian";
import { Note } from "./note";
import MetadataMenu from "main";

/**
 * Managed cache for Note instances
 * Automatically invalidates on file changes
 */
export class NoteCache {
    private cache = new Map<string, { note: Note, mtime: number }>();
    
    constructor(private plugin: MetadataMenu) {}
    
    /**
     * Get or build a Note for the given file
     */
    async get(file: TFile): Promise<Note> {
        const cached = this.cache.get(file.path);
        
        // Return cached if valid
        if (cached && cached.mtime === file.stat.mtime) {
            return cached.note;
        }
        
        // Build new note
        const note = new Note(this.plugin, file);
        await note.build();
        
        // Cache it
        this.cache.set(file.path, { note, mtime: file.stat.mtime });
        
        return note;
    }
    
    /**
     * Invalidate cache for a specific file
     */
    invalidate(path: string): void {
        this.cache.delete(path);
    }
    
    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear();
    }
    
    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }
}
