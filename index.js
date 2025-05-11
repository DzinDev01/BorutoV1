require("./settings") 

//constanta
const fs = require("fs") 
const pino = require("pino") 
const path = require("path") 
const axios = require("axios") 
const chalk = require("chalk") 
const express = require("express") 
const readline = require("readline") 
const { createServer } = require("http") 
const { Boom } = require("@hapi/boom") 
const NodeCache = require("node-cache") 
const { toBuffer, toDataUrl } = require("qrcode") 
const { exec, spawn, execSync } = require("child_process") 
const { parsePhoneNumber } = require("awesome-phonenumber") 
const { LoadDataBase } = require("./lib/message")

//constanta baileys 
const { default: OtsuwaBoruto, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, proto, getAggregateVotesInPollMessage } = require("baileys") 

//constanta pairing 
const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code 
const readlineText = readline.createInterface({ input: process.stdin, output: process.stdout }) 
const question = (text) => new Promise((resolve) => readlineText.question(text, resolve)) 

//kunci server & port server
let app = express() 
let server = createServer(app) 
let PORT = process.env.PORT || process.env.SERVER_PORT || 3000 
let pairingStarted = false 

//constanta database 
const DataBase = require("./lib/database")
const packageInfo = require("./package.json") 
const database = new DataBase(global.tempatDB) 
const msgRetryCounterCache = new NodeCache() 
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false }) 

//constanta group & function 
const { groupCacheUpdate, groupParticipantUpdate, messagesUpsert, solving } = require("./lib/message") 
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require("./lib/function") 

async function startRaja() {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) 
  const { state, saveCreds } = await useMultiFileAuthState("session") 
  const { version, isLatest } = await fetchLatestBaileysVersion() 
  const level = pino({ level: 'silent' }) 
  
  try {
    const loadData = await database.read() 
    if (loadData && Object.keys(loadData).length === 0) {
      global.db = {
				groups: {}, 
				set: {}, 
				database: {}, 
				...loadData || {},
      } 
      await database.write(global.db)
    } else {
      global.db = loadData
    } 
    
    setInterval(async () => {
      if (global.db) await database.write(global.db)
    }, 30 * 1000)
  } catch (err) {
    console.log(err) 
    process.exit(1)
  } 
  
  const getMessage = async (key) => {
    if (store) {
      const msg = await store.loadMessage(key.remoteJid, key.id) 
      return msg?.message || ''
    } 
    return {
      convertsation: 'Halo saya Otsuwa Boruto Bot'
    }
  } 
  
  const raja = OtsuwaBoruto({ 
    logger: level, 
    getMessage, 
    syncFullHistory: true, 
    maxMsgRetryCount: 15, 
    msgRetryCounterCache, 
    retryRequestDelayMs: 10, 
    connectTimeoutMs: 60000, 
    printQRInTerminal: !pairingCode, 
    defaultQueryTimeoutMs: undefined, 
    browser: Browsers.ubuntu('Chrome'), 
    generateHighQualityLinkPreview: true,
    cachedGroupMetadata: async (jid) => groupCache.get(jid), 
    transactionOpts: {
      maxCommitRetries: 10, 
      delayBetweenTriesMs: 10,
    }, 
    appStateMacVerification: {
      patch: true, 
      snapshot: true,
    }, 
    auth: {
      creds: state.creds, 
      keys: makeCacheableSignalKeyStore(state.keys, level),
    }, 
  }) 
  
  store.bind(raja.ev) 
  await solving(raja, store) 
  raja.ev.on('creds.update', saveCreds) 
  
  if (pairingCode && !raja.authState.creds.registered && !pairingStarted) {
      pairingStarted = true 
      let phoneNumber 
      async function getPhoneNumber() {
        phoneNumber = global.number_bot ? global.number_bot : await question('Please type your WhatsApp number : ') 
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '') 
        if (!parsePhoneNumber(phoneNumber).valid && phoneNumber.length < 6) {
          console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62xxx'))) 
          await getPhoneNumber()
        }
      } 
      
      setTimeout(async () => {
        await getPhoneNumber() 
        await exec('rm -rf ./session/*') 
        console.log('Sedang meminta pairing code...') 
        await new Promise(resolve => setTimeout(resolve, 5000)) 
        let code = await raja.requestPairingCode(phoneNumber) 
        console.log(`Kode pairing kamu : ${code}`)
      }, 3000)
    } 
    
 raja.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update 
    if (connection === 'close') {
      rajaStart()
    } else if (connection === 'open') {
      console.log(`Berhasil terhubung`)
    }
  }) 
 
 raja.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let id = raja.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
		}
	}) 
	
	raja.ev.on('messages.upsert', async (message) => {
		await messagesUpsert(raja, message, store, groupCache);
	})
	
	raja.ev.on('groups.update', async (update) => {
		await groupCacheUpdate(raja, update, store, groupCache);
	})
	
	raja.ev.on('group-participants.update', async (update) => {
		await groupParticipantUpdate(raja, update, store, groupCache);
	}) 
	
	setInterval(async () => {
		await raja.sendPresenceUpdate('available', raja.decodeJid(raja.user.id)).catch(e => {})
	}, 10 * 60 * 1000);

	return raja
} 

startRaja()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})
