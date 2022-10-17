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

export function compareDuration(dvDurA: any, dvDurB: any): boolean {
    const normalizedA = dvDurA.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds").normalize()
    const normalizedB = dvDurB.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds").normalize()
    return normalizedA.equals(normalizedB)
}