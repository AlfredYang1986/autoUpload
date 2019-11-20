"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import IModelBase from "./modelBase"
import Job from "./Job"

class DataSet extends Typegoose implements IModelBase<DataSet> {

    @arrayProp({ items: String, default: [], required: false } )
    public colNames?: string[]

    @prop({ default: 0, required: false} )
    public length?: number

    @prop({ default: "", required: false } )
    public url?: string

    @prop({ default: "", required: false } )
    public description?: string

    @prop({ default: "", required: false } )
    public tabName?: string

    @arrayProp({ itemsRef: DataSet, required: false } )
    public parent?: Ref<DataSet>[]

    @prop({ ref: Job, required: false })
    public job?: Ref<Job>

    public getModel() {
        return this.getModelForClass(DataSet)
    }
}

export default DataSet
