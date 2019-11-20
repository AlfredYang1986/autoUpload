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

PhLogger.info("start")


// 1. load config files
let conf = null
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

// 0. init oss
const ossClient = new OSS( {
    region: "oss-cn-beijing",
    // 云账号AccessKey有所有API访问权限，建议遵循阿里云安全最佳实践，部署在服务端使用RAM子账号或STS，部署在客户端使用STS。
    accessKeyId: conf.oss.accessKeyId,
    accessKeySecret: conf.oss.accessKeySecret,
    // stsToken: this.stsToken,
    bucket: "pharbers-sandbox"
} )

// 2. connect to the database
const prefix = conf.mongo.algorithm
const host = conf.mongo.host
const port = `${conf.mongo.port}`
const username = conf.mongo.username
const pwd = conf.mongo.pwd
const coll = conf.mongo.coll
const auth = conf.mongo.auth
if (auth) {
    PhLogger.info(`connect mongodb with ${ username } and ${ pwd }`)
    mongoose.connect(prefix + "://" + username + ":" + pwd + "@" + host + ":" + port + "/" + coll,
        // { useNewUrlParser: true },
        (err: any) => {
            if (err != null) {
                PhLogger.error(err)
                process.exit(-1)
            }
        })
} else {
    PhLogger.info(`connect mongodb without auth`)
    mongoose.connect(prefix + "://" + host + ":" + port + "/" + coll,
        // { useNewUrlParser: true },
        (err: any) => {
            if (err != null) {
                PhLogger.error(err)
                process.exit(-1)
            }
        })
}

PhLogger.info("connect db success")

// 3. 读入口文件并逐条处理

/**
 * 3.1 json-api 数据模型
 */
const fm = new File().getModel()
const dsm = new DataSet().getModel()
const am = new Asset().getModel()

/**
 * 3.2 读数据内容
 */
const wb = XLSX.readFile(conf.entry.excel)
const ws = wb.Sheets[conf.entry.sheet]

const data = jsonConvert.deserializeArray(XLSX.utils.sheet_to_json(ws), Entry)
PhLogger.info(data)

// 4. 对应生成应该上传的Assets
const gpFiles = R.groupWith((left: Entry, right: Entry) => {
    return left.filePath === right.filePath
}, data )

// const ttFiles = [gpFiles[0]] // For Test

// 5. 对每一个File，创建一个Asset
// tslint:disable-next-line:no-var-requires
const sleep = require('sleep')

async function upFiles(slice: Entry[][]) {
    await Promise.all( slice.map( async (arrs: Entry[]) => {
        const et = arrs[0]
        const fileName = et.filePath.substr(et.filePath.lastIndexOf("/") + 1)
        const filePath = fileName // et.filePath
        const name = new Date().getTime()
        const jobId = uuidv4()
        const uploadLink = jobId + "/" + name

        PhLogger.info(et.filePath)

        /**
         * 6. 防止重复上传
         */
        const isExist = await am.findOne({
            name: fileName
        }).exec()

        if (isExist !== null) {
            return isExist
        } else {
            /**
             * 5.1 assets 的问题
             */
            const asset = new Asset()
            asset.traceId = jobId
            asset.name = fileName
            asset.description = et.filePath
            asset.owner = "auto robot"
            asset.accessibility = "w"
            asset.version = 0
            asset.isNewVersion = true
            asset.dataType = "file"

            asset.providers = [et.companyName]
            asset.markets = []
            asset.molecules = []
            asset.dataCover = et.dataCover.toString().trim().split("-")
            asset.geoCover = []
            asset.labels = [et.label]

            /**
             * 5.3 优先上传文件
             */
            let point = null
            // const r2 = await ossClient.multipartUpload( uploadLink, "tmp/" + filePath, {
            const r2 = await ossClient.multipartUpload( uploadLink, et.filePath, {
                parallel: 5, // 并行上传的分片个数
                partSize: 100 * 1024 * 1024, // 分片大小不能小于1024*100
                checkpoint: point,
                async progress ( p, checkpoint, res ) {
                    // debugger
                    point = checkpoint
                    PhLogger.info( "upload progress " + p )
                }
            } )

            if (r2.res.status !== 200) {
                PhLogger.error("upload to oss error: " + r2.res.status + " with file: " + et.filePath )
                process.exit(-1)
            }

            /**
             * 5.2 创建Files 的问题
             */
            const file = new File()
            file.fileName = fileName // et.filePath
            file.extension = et.filePath.substr(et.filePath.lastIndexOf(".") + 1)
            file.uploaded = new Date().getTime()
            file.size = -1
            file.url = uploadLink

            asset.file = await fm.create(file)

            sleep.sleep(1)
            return await am.create(asset)
        }
    } ) )

    // last, disconnect the database
    // mongoose.disconnect()
}

async function multiRound() {
    const step = 2
    let idx = 0
    while (idx + step < gpFiles.length) {
        await upFiles(R.slice(idx, idx + step, gpFiles))
        idx += step
    }

}

multiRound()
