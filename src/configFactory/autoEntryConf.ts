"use strict"
import {JsonObject, JsonProperty} from "json2typescript"

@JsonObject("AutoEntryConf")
export class AutoEntryConf {

    @JsonProperty("excel", String)
    public excel: string = undefined

    @JsonProperty("sheet", String)
    public sheet: string = undefined

    @JsonProperty("debugging", Number)
    public debugging: number = undefined
}
