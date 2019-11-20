"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import FileVersion from "./FileVersion"
import IModelBase from "./modelBase"

class FileDetail extends Typegoose implements IModelBase<FileDetail> {

    @prop({ default: "", required: true })
    public name: string

    @prop({ default: "", required: true })
    public extension: string

    @prop({ default: 0, required: true })
    public created: number

    @prop({ default: "", required: true })
    public kind: string

    @prop({ default: "", required: true })
    public ownerID: string

    @prop({ default: "", required: true })
    public ownerName: string

    @prop({ default: "", required: true })
    public groupID: string

    @prop({ default: "", required: false })
    public traceID?: string

    @prop({ default: "", required: true })
    public mod: string

    @arrayProp( { itemsRef: FileVersion, required: true } )
    public versions: Ref<FileVersion>[]

    @arrayProp( { items: String, required: true } )
    public jobIds: string[]

    public getModel() {
        return this.getModelForClass(FileDetail)
    }
}

export default FileDetail
