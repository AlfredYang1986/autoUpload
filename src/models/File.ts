"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import IModelBase from "./modelBase"

class File extends Typegoose implements IModelBase<File> {

    @prop({ default: "", required: true })
    public fileName: string

    @prop({ default: "", required: true })
    public extension: string

    @prop({ default: "", required: true })
    public uploaded: number

    @prop({ default: Number, required: true })
    public size: number

    @prop({ default: "", required: true })
    public url: string

    public getModel() {
        return this.getModelForClass(File)
    }
}

export default File
