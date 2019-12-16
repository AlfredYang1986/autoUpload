"use strict"
import {JsonObject, JsonProperty} from "json2typescript"

@JsonObject("ChcGenConf")
export class ChcGenConf {

    @JsonProperty("dir", String)
    public dir: string = undefined

    @JsonProperty("output", String)
    public output: string = undefined

    @JsonProperty("debugging", Number)
    public debugging: number = undefined
}
