"use strict"
import IModelBase from "./modelBase"
import {Any, JsonObject, JsonProperty} from "json2typescript"

@JsonObject("Entry")
class Entry {
    @JsonProperty("公司名", String)
    public companyName: string = undefined

    @JsonProperty("时间段", Any, true)
    public dataCover: any = undefined

    @JsonProperty("Path", String)
    public filePath: string = undefined

    @JsonProperty("Sheet", String, true)
    public sheetName: string = ""

    @JsonProperty("Start_Row", Number, true)
    public startRow?: number = undefined

    @JsonProperty("Name", String, true)
    public colNames: string = ""

    @JsonProperty("来源", String, true)
    public source: string = ""

    @JsonProperty("类型", String, true)
    public label: string = undefined

    @JsonProperty("客户是否标准化", String, true)
    public isStandard: string = undefined

    public clone(): Entry {
        const tmp = new Entry()
        tmp.companyName = this.companyName
        tmp.startRow = this.startRow
        tmp.filePath = this.filePath
        tmp.label = this.label
        tmp.isStandard = this.isStandard
        tmp.source = this.source
        tmp.sheetName = this.sheetName
        tmp.dataCover = this.dataCover
        tmp.colNames = this.colNames
        return tmp
    }
}

export default Entry
