export const cleanActions = (container: HTMLElement, actionClass: string,) => {
    /* search for existing footer and remove it*/
    const actions = container.querySelector(actionClass)
    if (actions) actions.remove();
    /* create a new footer */
}