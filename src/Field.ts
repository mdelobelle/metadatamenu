interface Field{
    id: string
	name: string
	values: Record<string, string>
    isCycle: boolean
    isMulti: boolean
    valuesListNotePath: string
}

class Field{

	constructor(name: string = "", 
                values: Record<string, string> = {}, 
                id: string = "", 
                isMulti: boolean = false, 
                isCycle: boolean = false,
                valuesListNotePath: string = ""){
		this.name = name
		this.values = values
        this.id = id
        this.isCycle = isCycle
        this.isMulti = isMulti
        this.valuesListNotePath = valuesListNotePath
        this.insertNewValue.bind(this)
	}

    public async insertNewValue(value:string): Promise<string>{
        let newKey = 1
        Object.keys(this.values).forEach(key => {
            if(parseInt(key) && parseInt(key) >= newKey){
                newKey = parseInt(key) + 1
            }
        })
        this.values[newKey.toString()] = value
        return newKey.toString()
    }

    static copyProperty(target: Field, source: Field){
        target.id = source.id
        target.name = source.name
        target.isCycle = source.isCycle
        target.isMulti = source.isMulti
        target.valuesListNotePath = source.valuesListNotePath
        Object.keys(source.values).forEach(k => {
            target.values[k] = source.values[k]
        })
        Object.keys(target.values).forEach(k => {
            if(!Object.keys(source.values).includes(k)){
                delete target.values[k]
            }
        })
    }
}

export default Field