import { TextAreaComponent, TextComponent, DropdownComponent } from "obsidian"

export function log(status: "SUCCESS" | "ERROR", output: string) {
    if (status === "SUCCESS") {
        console.log("%c [SUCCESS]: " + output, 'background: #222; color: #bada55')
    } else {
        console.log("%c [ERROR]: " + output, 'background: red; color: white')
    }
}

export function insertAndDispatch(input: TextAreaComponent | TextComponent, value: string): void {
    input.inputEl.value = value
    input.inputEl.dispatchEvent(new Event("input"))
}

export function selectOptionAndDispatch(select: DropdownComponent, value: string): void {
    select.selectEl.value = value
    select.selectEl.dispatchEvent(new Event("change"))
}
