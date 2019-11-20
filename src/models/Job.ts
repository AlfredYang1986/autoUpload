"use strict"
import {prop, Typegoose} from "typegoose"
import IModelBase from "./modelBase"

class Job extends Typegoose implements IModelBase<Job> {

    @prop({ default: "", required: false})
    public dataProvider?: string

    @prop({ default: "", required: true } )
    public jobId?: string

    @prop({ default: 0, required: true })
    public create?: number

    @prop({ default: 0, required: true })
    public update?: number

    @prop({ default: "", required: true })
    public status?: string

    @prop({ default: "", required: false })
    public error?: string

    @prop({ default: "", required: false })
    public description?: string

    public getModel() {
        return this.getModelForClass(Job)
    }
}

export default Job
