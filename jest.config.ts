import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        '^.+\\.tsx?$': `ts-jest`,
    },
    roots: [
        "<rootDir>",
        "src"
    ],
    modulePaths: [
        "<rootDir>"
    ],
    moduleDirectories: [
        "node_modules"
    ],
    globals: {
        MDM_DEBUG: true
    }
};

export default config;