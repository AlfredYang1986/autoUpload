import PhLogger from "./logger/phLogger"
import {JsonConvert, ValueCheckingMode} from "json2typescript"
import * as fs from "fs"
import {ServerConf} from "./configFactory/serverConf"
import * as yaml from "js-yaml"
// @ts-ignore
import R from "ramda"

import Asset from "./models/Asset"
import File from "./models/File"
import DataSet from "./models/DataSet"
import Entry from "./models/Entry"
import uuidv4 from "uuid/v4"
import mongoose = require("mongoose")
import XLSX = require("xlsx")
import OSS = require('ali-oss')

// 1. load config files
let conf: ServerConf = null
const jsonConvert: JsonConvert = new JsonConvert()
// jsonConvert.operationMode = OperationMode.LOGGING // print some debug data
jsonConvert.ignorePrimitiveChecks = false // don't allow assigning number to string etc.
jsonConvert.valueCheckingMode = ValueCheckingMode.DISALLOW_NULL // never allow null
try {
    const path = "conf"
    const doc = yaml.safeLoad(fs.readFileSync(path + "/server.yml", "utf8"))
    conf = jsonConvert.deserializeObject(doc, ServerConf)
} catch (e) {
    PhLogger.fatal( e as Error )
    process.exit(-1)
}

PhLogger.info(conf.entry.excel)

// 0. start to search the input dir
if (!fs.existsSync(conf.chcgen.dir)) {
    PhLogger.error("CHC input dir does not exist: " + conf.chcgen.dir)
}

// 1. open dir
const children = fs.readdirSync(conf.chcgen.dir).map ( child => {
    const path = conf.chcgen.dir + "/" + child
    const tmp = fs.lstatSync(path)
    PhLogger.info(tmp)
    if (tmp.isDirectory()) {
        return path
    } else {
        return undefined
    }
} ).filter( c => c !== undefined )

PhLogger.info(children)
