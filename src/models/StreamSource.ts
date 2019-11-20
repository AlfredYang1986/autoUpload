"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import FileDetail from "./FileDetail"
import IModelBase from "./modelBase"

class StreamSource extends Typegoose implements IModelBase<StreamSource> {

    @prop({ default: "", required: true })
    public schema?: string

    @prop({ default: "", required: true } )
    public url?: string

    public getModel() {
        return this.getModelForClass(StreamSource)
    }
}

export default StreamSource
