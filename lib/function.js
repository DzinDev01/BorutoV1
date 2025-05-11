const fs = require("fs")
const util = require("util")
const Jimp = require("jimp")
const axios = require("axios")
const chalk = require("chalk")
const crypto = require("crypto")
const fetch = require("node-fetch")
const FileType = require("file-type")
const moment = require("moment-timezone")
const { defaultMaxListeners } = require("stream")
const { sizeFormatter } = require("human-readable")
const { exec, spawn, execSync } = require("child_process")
const { proto, areJidsSameUser, extractMessageContent, downloadContentFromMessage, getContentType, getDevice } = require("baileys") 

const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
} 

const generateMessageTag = (epoch) => {
    let tag = (0, unixTimestampSeconds)().toString()
    if (epoch)
        tag += '.--' + epoch
    return tag
}

const getBuffer = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			responseType: 'arraybuffer',
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url)
			const anu = res.buffer()
			return anu
		} catch (e) {
			return e
		}
	}
}

const getSizeMedia = async (path) => {
    return new Promise((resolve, reject) => {
        if (typeof path === 'string' && /http/.test(path)) {
            axios.get(path).then((res) => {
                let length = parseInt(res.headers['content-length'])
                if(!isNaN(length)) resolve(bytesToSize(length, 3))
            })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            if(!isNaN(length)) resolve(bytesToSize(length, 3))
        } else {
            reject(0)
        }
    })
} 

const fetchJson = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			},
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url)
			const anu = res.json()
			return anu
		} catch (e) {
			return e
		}
	}
} 

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
} 

async function getTypeUrlMedia(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const buffer = await axios.get(url, { responseType: 'arraybuffer' })
			const type = buffer.headers['content-type'] || (await FileType.fromBuffer(buffer.data)).mime
			resolve({ type, url })
		} catch (e) {
			reject(e)
		}
	})
} 

const getGroupAdmins = (participants) => {
        let admins = []
        for (let i of participants) {
            i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : ''
        }
        return admins || []
}

module.exports =  { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep, getGroupAdmins, getTypeUrlMedia } 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})