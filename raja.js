process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error) 

require("./settings") 

//constanta module
const fs = require("fs")
const os = require("os")
const qs = require("qs")
const util = require("util")
const gis = require("g-i-s")
const jimp = require("jimp")
const path = require("path")
const https = require("https")
const axios = require("axios")
const chalk = require("chalk")
const yts = require("yt-search")
const ytdl = require("ytdl-core")
const cron = require("node-cron")
const cheerio = require("cheerio")
const fetch = require("node-fetch")
const FileType = require("file-type")
const google = require("googlethis")
const similarity = require("similarity")
const PDFDocument = require("pdfkit")
const webp = require("node-webpmux")
const ffmpeg = require("fluent-ffmpeg")
const speed = require("performance-now")
const didYouMean = require("didyoumean")
const { performance } = require("perf_hooks")
const moment = require("moment-timezone")
const translate = require("translate-google-api")
const { Akinator, AkinatorAnswer } = require("aki-api")
const PhoneNum = require("awesome-phonenumber")
const { exec, spawn, execSync } = require("child_process") 
const { LoadDataBase } = require("./lib/message")

//constanta baileys
const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, getBinaryNodeChildren, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require("baileys") 

module.exports = raja = async (raja, m, msg, store, groupCache) => {
  try {
    if (!store.messages[msg.key.remoteJid]?.array?.some(a => a.key.id === msg.key.id)) return
		
		await LoadDataBase(raja, m)
		const botNumber = await raja.decodeJid(raja.user.id)
		const body = (m.type === 'conversation') ? m.message.conversation :
		(m.type == 'imageMessage') ? m.message.imageMessage.caption :
		(m.type == 'videoMessage') ? m.message.videoMessage.caption :
		(m.type == 'extendedTextMessage') ? m.message.extendedTextMessage.text :
		(m.type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId :
		(m.type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
		(m.type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId :
		(m.type == 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) :
		(m.type == 'editedMessage') ? (m.message.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || m.message.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || '') :
		(m.type == 'protocolMessage') ? (m.message.protocolMessage?.editedMessage?.extendedTextMessage?.text || m.message.protocolMessage?.editedMessage?.conversation || m.message.protocolMessage?.editedMessage?.imageMessage?.caption || m.message.protocolMessage?.editedMessage?.videoMessage?.caption || '') : '' 
		const budy = (typeof m.text == 'string' ? m.text : '')
		const isCreator = isOwner = [...owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender) 
		const prefix = isCreator ? (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(body) ? body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : listprefix.find(a => body.startsWith(a)) || '') : db.set[botNumber].multiprefix ? (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(body) ? body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : listprefix.find(a => body.startsWith(a)) || '¿') : listprefix.find(a => body.startsWith(a)) || '¿' 
		
		//constanta keperluan
		const isCmd = body.startsWith(prefix)
		const args = body.trim().split(/ +/).slice(1)
		const quoted = m.quoted ? m.quoted : m
		const command = isCreator ? body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : isCmd ? body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : ''
		const text = q = args.join(' ')
		const mime = (quoted.msg || quoted).mimetype || ''
		const qmsg = (quoted.msg || quoted) 
		
		if (m.message && m.key.remoteJid !== 'status@broadcast') {
				console.log(chalk.black(chalk.bgWhite('[ PESAN ]:'), chalk.bgGreen(new Date), chalk.bgHex('#00EAD3')(budy || m.type), chalk.bgHex('#AF26EB')(m.key.id) + '\n' + chalk.bgCyanBright('[ DARI ] :'), chalk.bgYellow(m.pushName || (isCreator ? 'Bot' : 'Anonim')), chalk.bgHex('#FF449F')(m.sender), chalk.bgHex('#FF5700')(m.isGroup ? m.metadata.subject : m.chat.endsWith('@newsletter') ? 'Newsletter' : 'Private Chat'), chalk.bgBlue('(' + m.chat + ')')))
		}
		
		switch(command) {
		  case "sticker": {
		    if (!/image|video|sticker/.test(quoted.type)) return m.reply(`*Reply foto/video 10d/sticker yang ingin di jadiin sticker*`) 
		    let media = await quoted.download() 
		    let teks1 = text.split`|`[0] ? text.split`|`[0] : ''
			let teks2 = text.split`|`[1] ? text.split`|`[1] : ''
		    if (/image|webp/.test(mime)) { 
		      m.reply(`Proses`)
		      await raja.sendAsSticker(m.chat, media, m, { packname: teks1, author: teks2 })
		    } else if (/video/.test(mime)) {
		      if ((qmsg).seconds > 11) return m.reply(`*Max 10 detik*`) 
		      await raja.sendVideoAsSticker(m.chat, media, m, { packname: teks1, author: teks2 })
		    }
		  } 
		  break
		}
  } catch (err) {
    console.log(err)
  }
} 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})