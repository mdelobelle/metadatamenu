import MetadataMenu from "main";

export function genuineKeys(plugin: MetadataMenu, obj: any, depth: number = 0): string[] {
    const reservedKeys = ["file", "aliases", "tags"]
    const _genuineKeys: string[] = []
    for (const key of Object.keys(obj)) {
        if (depth === 0 && reservedKeys.includes(key)) continue;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            _genuineKeys.push(...genuineKeys(plugin, obj[key], depth + 1).filter(k => !_genuineKeys.includes(k)))
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

export function compareDuration(dvDurA: any, dvDurB: any): boolean {
    const normalizedA = dvDurA.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds").normalize()
    const normalizedB = dvDurB.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds").normalize()
    return normalizedA.equals(normalizedB)
}