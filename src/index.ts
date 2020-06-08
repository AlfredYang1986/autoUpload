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
// 0. init S3
import AWS = require('aws-sdk')
import phLogger from "./logger/phLogger"

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
// const ossClient = new OSS( {
//     region: "oss-cn-beijing",
//     // 云账号AccessKey有所有API访问权限，建议遵循阿里云安全最佳实践，部署在服务端使用RAM子账号或STS，部署在客户端使用STS。
//     accessKeyId: conf.oss.accessKeyId,
//     accessKeySecret: conf.oss.accessKeySecret,
//     // stsToken: this.stsToken,
//     bucket: "pharbers-sandbox"
// } )
// Set the Region
AWS.config.update({region: 'cn-northwest-1'})
const s3 = new AWS.S3({apiVersion: '2006-03-01'})

/**
 * 3.2 读数据内容
 */
// const wb = XLSX.readFile(conf.entry.excel)
// const ws = wb.Sheets[conf.entry.sheet]

// const data = jsonConvert.deserializeArray(XLSX.utils.sheet_to_json(ws), Entry)
const rfData = refreshData(conf)
PhLogger.info(rfData)

// 4. 对应生成应该上传的Assets
const gpFiles = R.groupWith((left: Entry, right: Entry) => {
    return false
}, rfData )

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
    mongoose.connect(prefix + "://" + username + ":" + pwd + "@" + host + ":" + port + "/" + coll + "?authSource=admin",
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

// const ttFiles = [gpFiles[0]] // For Test

// 5. 对每一个File，创建一个Asset
// tslint:disable-next-line:no-var-requires
const sleep = require('sleep')

async function upFiles(slice: Entry[][]) {
    await Promise.all( slice.map( async (arrs: Entry[]) => {
        const et = arrs[0]
        const fileName = et.filePath.substr(et.filePath.lastIndexOf("/") + 1)
        // const filePath = fileName // et.filePath
        // const date = new Date().getTime()
        const jobId = uuidv4()

        PhLogger.info(et.filePath)

        /**
         * 6. 防止重复上传
         */
        const s3key = et.source + "/" + et.companyName + "/" + fileName
        const uploadLink = s3key
        const existsQuery = {
            Bucket: "ph-origin-files",
            Key: s3key,
            Range: "bytes=0-9"
        }
        await s3.getObject(existsQuery).promise().catch(async (reason: any) => {
            if (reason.code === "NoSuchKey") {
                /**
                 * 5.3 优先上传文件, 到S3
                 */
                const uploadParams = {Bucket: "ph-origin-files", Key: s3key, Body: ""}
                const fileKeyName = et.filePath

                // Configure the file stream and obtain the upload parameters
                // @ts-ignore
                uploadParams.Body = await fs.createReadStream(fileKeyName)
                // uploadParams.Body = await fs.createReadStream("/Users/alfredyang/Desktop/upload.xlsx")
                // call S3 to retrieve upload file to specified bucket
                s3.upload(uploadParams).promise()
            }
        })

        /**
         * 5.1 assets 的问题
         */
        const isExist = await fm.findOne({
            name: fileName,
            sheetName: et.sheetName
        }).exec()

        if (isExist !== null) {
            return isExist
        } else {
            const asset = new Asset()
            asset.traceId = jobId
            asset.name = fileName
            asset.description = et.filePath
            asset.owner = "auto robot"
            asset.accessibility = "w"
            asset.version = 0
            asset.isNewVersion = true
            asset.dataType = "file"

            asset.providers = [et.companyName, et.source]
            asset.markets = []
            asset.molecules = []
            asset.dataCover = et.dataCover.toString().trim().split("-")
            asset.geoCover = []
            asset.labels = [et.label]

            /**
             * 5.2 创建Files 的问题
             */
            const file = new File()
            file.fileName = fileName // et.filePath
            file.extension = et.filePath.substr(et.filePath.lastIndexOf(".") + 1)
            file.uploaded = new Date().getTime()
            file.sheetName = et.sheetName
            file.startRow = et.startRow
            file.label = et.label
            file.size = -1
            file.url = uploadLink

            asset.file = await fm.create(file)

            sleep.sleep(1)
            return await am.create(asset)
        }
    } ) )
}

function refreshData(excelConf: any) {
    const tmpPath = excelConf.entry.refresh

    if (fs.existsSync(tmpPath)) {
        const b = XLSX.readFile(tmpPath)
        const s = b.Sheets.Sheet1
        return jsonConvert.deserializeArray(XLSX.utils.sheet_to_json(s), Entry)
    }

    const wb = XLSX.readFile(excelConf.entry.excel)
    const ws = wb.Sheets[excelConf.entry.sheet]
    const data = jsonConvert.deserializeArray(XLSX.utils.sheet_to_json(ws), Entry)
    const rd: Entry[] = []
    data.forEach((et: Entry) => {
        const ex = et.filePath.substr(et.filePath.lastIndexOf(".") + 1)
        if (et.sheetName === "" && ex.startsWith("xls")) {
            const twb = XLSX.readFile(et.filePath)
            // tslint:disable-next-line:prefer-for-of
            for (let index = 0; index < twb.SheetNames.length; index++) {
                const tmp = et.clone()
                tmp.sheetName = twb.SheetNames[index]
                if (tmp.startRow === undefined) {
                    tmp.startRow = 1
                }
                rd.push(tmp)
            }
        } else {
            rd.push(et)
        }
    })
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(jsonConvert.serializeArray(rd))

    workbook.Props = {
        Author: "Alfred Yang",
        CreatedDate: new Date(),
        Subject: "Max Origin WorkBook",
        Title: "Max Origin WorkBook"
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
    XLSX.writeFile(workbook, tmpPath)
    return rd
}

async function multiRound() {
    const step = 2
    let idx = 0
    while (idx < gpFiles.length) {
        await upFiles(R.slice(idx, idx + step, gpFiles))
        idx += step
        // phLogger.info(R.slice(idx, idx + step, gpFiles))
        // phLogger.info(idx)
    }
    await mongoose.disconnect()
    phLogger.info("end")
}

multiRound()
// last, disconnect the database
// mongoose.disconnect()
