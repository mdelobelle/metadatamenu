export function genuineKeys(dvFile: any): string[] {
    const genuineKeys: string[] = []
    Object.keys(dvFile).forEach(key => {
        if (!genuineKeys.map(k => k.toLowerCase().replace(/\s/g, "-")).includes(key.toLowerCase().replace(/\s/g, "-"))) {
            genuineKeys.push(key)
        } else {
            if (key !== key.toLowerCase().replace(/\s/g, "-")) {
                genuineKeys[genuineKeys.indexOf(key.toLowerCase().replace(/\s/g, "-"))] = key
            }
        }
    })
    return genuineKeys
}