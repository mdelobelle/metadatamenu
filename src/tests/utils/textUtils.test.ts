import { capitalize } from "src/utils/textUtils";

test('capitalize', () => {
    expect(capitalize("something")).toBe("Something");
})

test('capitalize empty string', () => {
    expect(capitalize("")).toBe("");
})