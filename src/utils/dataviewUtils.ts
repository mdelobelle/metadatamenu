export function genuineKeys(obj: any, depth: number = 0): string[] {
    const reservedKeys = ["file", "aliases", "tags"]
    const _genuineKeys: string[] = []
    for (const key of Object.keys(obj)) {
        if (depth === 0 && reservedKeys.includes(key)) continue;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (!_genuineKeys.map(k => k.toLowerCase().replace(/\s/g, "-")).includes(key.toLowerCase().replace(/\s/g, "-"))) {
                _genuineKeys.push(key)
            }
            _genuineKeys.push(...genuineKeys(obj[key], depth + 1).filter(k => !_genuineKeys.includes(k)))
        } else if (!_genuineKeys.map(k => k.toLowerCase().replace(/\s/g, "-")).includes(key.toLowerCase().replace(/\s/g, "-"))) {
            _genuineKeys.push(key)
        } else {
            if (key !== key.toLowerCase().replace(/\s/g, "-")) {
                _genuineKeys[_genuineKeys.indexOf(key.toLowerCase().replace(/\s/g, "-"))] = key
            }
        }
    }
    return _genuineKeys
}

export function legacyGenuineKeys(dvFile: any): string[] {
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
