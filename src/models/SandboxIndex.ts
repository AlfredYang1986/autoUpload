"use strict"
import {arrayProp, prop, Ref, Typegoose} from "typegoose"
import FileDetail from "./FileDetail"
import IModelBase from "./modelBase"

class SandboxIndex extends Typegoose implements IModelBase<SandboxIndex> {

    @prop({ default: "", required: true })
    public account: string

    @arrayProp( { itemsRef: FileDetail, required: true } )
    public files: Ref<FileDetail>[]

    public getModel() {
        return this.getModelForClass(SandboxIndex)
    }
}

export default SandboxIndex
