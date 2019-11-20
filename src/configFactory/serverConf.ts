"use strict"
import {JsonObject, JsonProperty} from "json2typescript"
import { MongoConf } from "./mongoConf"
import { OssConf } from "./ossConf"
import { AutoEntryConf } from "./autoEntryConf"

@JsonObject("ServerConf")
export class ServerConf {

    @JsonProperty("mongo", MongoConf)
    public mongo: MongoConf = undefined

    @JsonProperty("oss", OssConf)
    public oss: OssConf = undefined

    @JsonProperty("entry", AutoEntryConf)
    public entry: AutoEntryConf = undefined
}
