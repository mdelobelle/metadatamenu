
export async function waitFor(conditionFunction: () => boolean) : Promise<(resolve: any) => void>{

    const poll = (resolve: any) => {
        if (conditionFunction()) {
            resolve();
        }
        else {
            setTimeout(() => poll(resolve), 400);
        }
    }

    return new Promise(poll);
}