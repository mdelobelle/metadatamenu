export const compareArrays = (a: string[], b: string[]) => {
    return a.length === b.length &&
        a.every((element, index) => element === b[index]);
}