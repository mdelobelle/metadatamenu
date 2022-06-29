import {App, TFile} from "obsidian"

export async function replaceValues(app: App, file: TFile, attribute: string, input: string): Promise <void>{
    app.vault.read(file).then((result: string) => {
        let newContent:Array<string> = []
        let foreHeadText = false
        let frontmatterStart = false
        let frontmatterEnd = false
        let inFrontmatter = false
        result.split('\n').map(line => {
            if(line!="---" && !foreHeadText && !frontmatterStart){
                foreHeadText = true
            }
            if(line == "---" && !foreHeadText){
                if(!frontmatterStart){
                    frontmatterStart = true
                    inFrontmatter = true
                } else if(!frontmatterEnd){
                    frontmatterEnd = true
                    inFrontmatter = false
                }
            }
            if(inFrontmatter){
                const regex = new RegExp(`${attribute}:`, 'u')
                const regexResult = line.match(regex)
                if(regexResult && regexResult.length > 0){
                    const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""]
                    const newValue = inputArray.length == 1 ? inputArray[0] : `[${inputArray.join(', ')}]`
                    newContent.push(`${attribute}: ${newValue}`)
                } else {
                    newContent.push(`${line}`)
                }
            } else {
                const regex = new RegExp(`([_\*~\`]*)${attribute}([_\*~\`]*)(\\s*)::`, 'u')
                const r = line.match(regex)
                if(r && r.length > 0){
                    const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""]
                    const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`
                    newContent.push(`${r[1]}${attribute}${r[2]}${r[3]}:: ${newValue}`)
                } else {
                    newContent.push(line)
                }	
            }
        })
        app.vault.modify(file, newContent.join('\n'))
    })
}