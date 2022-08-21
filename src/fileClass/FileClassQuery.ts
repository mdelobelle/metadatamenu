interface FileClassQuery {
    id: string;
    name: string;
    query: string;
    fileClassName: string;
}

class FileClassQuery {

    constructor(name: string = "",
        id: string = "",
        query: string = "",
        fileClassName: string = ""
    ) {
        this.name = name;
        this.query = query;
        this.id = id;
        this.fileClassName = fileClassName;
    };

    static copyProperty(target: FileClassQuery, source: FileClassQuery) {
        target.id = source.id;
        target.name = source.name;
        target.query = source.query;
        target.fileClassName = source.fileClassName
    };
};

export default FileClassQuery;