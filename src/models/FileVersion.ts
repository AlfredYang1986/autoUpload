"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import IModelBase from "./modelBase"

class FileVersion extends Typegoose implements IModelBase<FileVersion> {

    @prop({ default: "", required: false })
    public parent?: string

    @prop({ default: 0.0, required: true })
    public size: number

    @prop({ default: "", required: true })
    public where: string

    @prop({ default: "", required: true })
    public kind: string

    @prop({ default: "", required: true })
    public tag: string

    public getModel() {
        return this.getModelForClass(FileVersion)
    }
}

export default FileVersion
