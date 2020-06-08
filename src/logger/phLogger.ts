"use strict"

import { configure, connectLogger, getLogger } from "log4js"

class PhLogger {
    constructor() {
        configure("log4js.json")
    }

    public getPhLogger() {
        return getLogger()
    }
}

export default new PhLogger().getPhLogger()
