require("../settings") 
const fs = require("fs")
const path = require("path")
const https = require("https")
const axios = require("axios")
const chalk = require("chalk")
const crypto = require("crypto")
const FileType = require("file-type")
const PhoneNumber = require("awesome-phonenumber") 

//constanta function 
const { imageToWebp, videoToWebp, writeExif } = require("./exif")
const { isUrl, getGroupAdmins, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep, getTypeUrlMedia } = require("./function") 

//constanta baileys
const { jidNormalizedUser, proto, getBinaryNodeChildren, getBinaryNodeChild, generateMessageIDV2, jidEncode, encodeSignedDeviceIdentity, generateWAMessageContent, generateForwardMessageContent, prepareWAMessageMedia, delay, areJidsSameUser, extractMessageContent, generateMessageID, downloadContentFromMessage, generateWAMessageFromContent, jidDecode, generateWAMessage, toBuffer, getContentType, WAMessageStubType, getDevice } = require("baileys") 

async function groupCacheUpdate(raja, update, store, groupCache) {
  try {
    for (let n of update) {
      if (store.groupMetadata[n.id]) {
        groupCache.set(n.id, n) 
        store.groupMetadata[n.id] = {
          ...(store.groupMetadata[n.id] || {}),
					...(n || {})
        }
      }
    }
  } catch (err) {
    throw err
  }
} 

async function groupParticipantUpdate(raja, { id, participants, author, action }, store, groupCache ) {
  try {
    function updateAdminStatus(participants, metadataParticipants, status) {
      for (const participant of metadataParticipants) {
        let id = jidNormalizedUser(participant.id)
				if (participants.includes(id)) {
				  participant.admin = status
				}
      }
    } 
    if (global.db?.groups[id] && store?.groupMetadata[id]) {
      const metadata = store.groupMetadata[id] 
      for (let n of participants) {
        let profile 
        try {
          profile = await raja.profilePictureUrl(n, 'image')
        } catch {
          profile = 'https://telegra.ph/file/95670d63378f7f4210f03.png'
        } 
        let messageText 
        if (action === 'add') {
          if (db.groups[id].welcome) messageText = db.groups[id]?.text?.setwelcome || `Welcome to ${metadata.subject}\n@`
					metadata.participants.push({ id: jidNormalizedUser(n), admin: null })
        } else if (action === 'remove') {
          if (db.groups[id].leave) messageText = db.groups[id]?.text?.setleave || `@\nLeaving From ${metadata.subject}`
					metadata.participants = metadata.participants.filter(p => !participants.includes(jidNormalizedUser(p.id)))
        } else if (action === 'promote') {
          if (db.groups[id].promote) messageText = db.groups[id]?.text?.setpromote || `@\nPromote From ${metadata.subject}\nBy @admin`
					updateAdminStatus(participants, metadata.participants, 'admin')
        } else if (action === 'demote') {
          if (db.groups[id].demote) messageText = db.groups[id]?.text?.setdemote || `@\nDemote From ${metadata.subject}\nBy @admin`
					updateAdminStatus(participants, metadata.participants, null)
        } 
        groupCache.set(id, metadata) 
        if (messageText && raja.public) {
          await raja.sendMessage(id, { 
            text: messageText.replace('@subject', author ? `${metadata.subject}` : '@subject').replace('@admin', author ? `@${author.split('@')[0]}` : '@admin').replace(/(?<=\s|^)@(?!\w)/g, `@${n.split('@')[0]}`),
						contextInfo: {
						  mentionedJid: [n, author],
							externalAdReply: {
							  title: action == 'add' ? 'Welcome' : action == 'remove' ? 'Leaving' : action.charAt(0).toUpperCase() + action.slice(1), 
							  mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
          }, { ephemeralExpiration: store?.messages[id]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 })
        }
      }
    }
  } catch (err) {
    throw err
  }
} 

async function LoadDataBase(raja, m) {
  try {
    const botNumber = await raja.decodeJid(raja.user.id) 
    let setBot = global.db.set[botNumber] || {} 
    
    global.db.set[botNumber] = setBot 
    
    const defaultSetBot = {
      lang: 'id',
    } 
    for (let key in defaultSetBot) {
      if (!(key in setBot)) setBot[key] = defaultSetBot[key]
    } 
    
    if (m.isGroup) {
			let group = global.db.groups[m.chat] || {}
			global.db.groups[m.chat] = group
			
			const defaultGroup = {
				url: '',
				text: {},
				warn: {},
				tagsw: {},
				mute: false,
			}
			for (let key in defaultGroup) {
				if (!(key in group)) group[key] = defaultGroup[key]
			}
		}
  } catch (err) {
    throw err
  }
} 

async function messagesUpsert(raja, message, store, groupCache) {
  try {
    let botNumber = await raja.decodeJid(raja.user.id)
		const msg = message.messages[0] 
		if (!store.groupMetadata || Object.keys(store.groupMetadata).length === 0) {
		  store.groupMetadata ??= await raja.groupFetchAllParticipating().catch(e => ({}))
		} 
		if (!store.messages[msg.key.remoteJid]?.array?.some(a => a.key.id === msg.key.id)) return
		const type = msg.message ? (getContentType(msg.message) || Object.keys(msg.message)[0]) : '' 
		const m = await Serialize(raja, msg, store, groupCache) 
		require('../raja')(raja, m, msg, store, groupCache) 
		if (type === 'interactiveResponseMessage' && m.quoted && m.quoted.fromMe) {
		  await raja.appendResponseMessage(m, JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id)
		} 
		if (global.db?.set[botNumber] && global.db?.set[botNumber]?.readsw) {
		  if (msg.key.remoteJid === 'status@broadcast') {
		    await raja.readMessages([msg.key])
				if (/protocolMessage/i.test(type)) raja.sendFromOwner(global.owner, 'Status dari @' + msg.key.participant.split('@')[0] + ' Telah dihapus', msg, { mentions: [msg.key.participant] })
				if (/(audioMessage|imageMessage|videoMessage|extendedTextMessage)/i.test(type)) {
				  let keke = (type == 'extendedTextMessage') ? `Story Teks Berisi : ${msg.message.extendedTextMessage.text ? msg.message.extendedTextMessage.text : ''}` : (type == 'imageMessage') ? `Story Gambar ${msg.message.imageMessage.caption ? 'dengan Caption : ' + msg.message.imageMessage.caption : ''}` : (type == 'videoMessage') ? `Story Video ${msg.message.videoMessage.caption ? 'dengan Caption : ' + msg.message.videoMessage.caption : ''}` : (type == 'audioMessage') ? 'Story Audio' : '\nTidak diketahui cek saja langsung'
					await raja.sendFromOwner(global.owner, `Melihat story dari @${msg.key.participant.split('@')[0]}\n${keke}`, msg, { mentions: [msg.key.participant] })
				}
		  }
		}
  } catch (err) {
    throw err
  }
} 

async function solving(raja, store) {
  raja.serializeM = (m) => messagesUpsert(raja, m, store) 
  
  raja.decodeJid = (jid) => {
    if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
		  let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
  } 
  
  raja.sendContact = async (jid, kon, quoted = '', opts = {}) => {
		let list = []
		for (let i of kon) {
			list.push({
				displayName: await raja.getName(i + '@s.whatsapp.net'),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await raja.getName(i + '@s.whatsapp.net')}\nFN:${await raja.getName(i + '@s.whatsapp.net')}\nitem1.TELwaid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:Indonesia\nitem2.X-ABLabel:Region\nEND:VCARD`
			})
		}
		raja.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
	} 
	
	raja.profilePictureUrl = async (jid, type = 'image', timeoutMs) => {
		const result = await raja.query({
			tag: 'iq',
			attrs: {
				target: jidNormalizedUser(jid),
				to: '@s.whatsapp.net',
				type: 'get',
				xmlns: 'w:profile:picture'
			},
			content: [{
				tag: 'picture',
				attrs: {
					type, query: 'url'
				},
			}]
		}, timeoutMs)
		const child = getBinaryNodeChild(result, 'picture')
		return child?.attrs?.url
	}
	
	raja.setStatus = (status) => {
		raja.query({
			tag: 'iq',
			attrs: {
				to: '@s.whatsapp.net',
				type: 'set',
				xmlns: 'status',
			},
			content: [{
				tag: 'status',
				attrs: {},
				content: Buffer.from(status, 'utf-8')
			}]
		})
		return status
	}
	
	raja.sendPoll = (jid, name = '', values = [], quoted, selectableCount = 1) => {
		return raja.sendMessage(jid, { poll: { name, values, selectableCount }}, { quoted, ephemeralExpiration: quoted.expiration || 0 })
	}
	
	raja.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		async function getFileUrl(res, mime) {
			if (mime && mime.includes('gif')) {
				return raja.sendMessage(jid, { video: res.data, caption: caption, gifPlayback: true, ...options }, { quoted })
			} else if (mime && mime === 'application/pdf') {
				return raja.sendMessage(jid, { document: res.data, mimetype: 'application/pdf', caption: caption, ...options }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
			} else if (mime && mime.includes('image')) {
				return raja.sendMessage(jid, { image: res.data, caption: caption, ...options }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
			} else if (mime && mime.includes('video')) {
				return raja.sendMessage(jid, { video: res.data, caption: caption, mimetype: 'video/mp4', ...options }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
			} else if (mime && mime.includes('webp') && !/.jpg|.jpeg|.png/.test(url)) {
				return raja.sendAsSticker(jid, res.data, quoted, options)
			} else if (mime && mime.includes('audio')) {
				return raja.sendMessage(jid, { audio: res.data, mimetype: 'audio/mpeg', ...options }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
			}
		}
		const axioss = axios.create({
			httpsAgent: new https.Agent({ rejectUnauthorized: false }),
		})
		const res = await axioss.get(url, { responseType: 'arraybuffer' })
		let mime = res.headers['content-type']
		if (!mime || mime.includes('octet-stream')) {
			const fileType = await FileType.fromBuffer(res.data)
			mime = fileType ? fileType.mime : null
		}
		const hasil = await getFileUrl(res, mime)
		return hasil
	} 
	
	raja.sendFromOwner = async (jid, text, quoted, options = {}) => {
		for (const a of jid) {
			await raja.sendMessage(a.replace(/[^0-9]/g, '') + '@s.whatsapp.net', { text, ...options }, { quoted })
		}
	}
	
	raja.sendTextMentions = async (jid, text, quoted, options = {}) => raja.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
	
	raja.sendAsSticker = async (jid, path, quoted, options = {}) => {
		const buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		const result = await writeExif(buff, options)
		return raja.sendMessage(jid, { sticker: { url: result }, ...options }, { quoted, ephemeralExpiration: quoted.expiration || 0 })
	}
	
	raja.downloadMediaMessage = async (message) => {
		const msg = message.msg || message
		const mime = msg.mimetype || ''
		const messageType = (message.type || mime.split('/')[0]).replace(/Message/gi, '')
		const stream = await downloadContentFromMessage(msg, messageType)
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		return buffer
	}
	
	raja.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		const buffer = await raja.downloadMediaMessage(message)
		const type = await FileType.fromBuffer(buffer)
		const trueFileName = attachExtension ? `./database/sampah/${filename ? filename : Date.now()}.${type.ext}` : filename
		await fs.promises.writeFile(trueFileName, buffer)
		return trueFileName
	}
	
	raja.getFile = async (PATH, save) => {
		let res
		let filename
		let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
		let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
		filename = path.join(__dirname, '../database/sampah/' + new Date * 1 + '.' + type.ext)
		if (data && save) fs.promises.writeFile(filename, data)
		return {
			res,
			filename,
			size: await getSizeMedia(data),
			...type,
			data
		}
	}
	
	raja.appendResponseMessage = async (m, text) => {
		let apb = await generateWAMessage(m.chat, { text, mentions: m.mentionedJid }, { userJid: raja.user.id, quoted: m.quoted })
		apb.key = m.key
		apb.key.fromMe = areJidsSameUser(m.sender, raja.user.id)
		if (m.isGroup) apb.participant = m.sender
		raja.ev.emit('messages.upsert', {
			...m,
			messages: [proto.WebMessageInfo.fromObject(apb)],
			type: 'append'
		})
	}
	
	raja.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		const { mime, data, filename } = await raja.getFile(path, true)
		const isWebpSticker = options.asSticker || /webp/.test(mime)
		let type = 'document', mimetype = mime, pathFile = filename
		if (isWebpSticker) {
			pathFile = await writeExif(data, {
				packname: options.packname || global.packname,
				author: options.author || global.author,
				categories: options.categories || [],
			})
			await fs.unlinkSync(filename)
			type = 'sticker'
			mimetype = 'image/webp'
		} else if (/image|video|audio/.test(mime)) {
			type = mime.split('/')[0]
			mimetype = type == 'video' ? 'video/mp4' : type == 'audio' ? 'audio/mpeg' : mime
		}
		let anu = await raja.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options })
		await fs.unlinkSync(pathFile)
		return anu
	} 
	
	if (raja.user && raja.user.id) {
		const botNumber = raja.decodeJid(raja.user.id)
		if (global.db?.set[botNumber]) {
			raja.public = global.db.set[botNumber].public
		} else raja.public = true
	} else raja.public = true
	
	return raja
} 

async function Serialize(raja, m, store, groupCache) {
	const botNumber = raja.decodeJid(raja.user.id)
	if (!m) return m
	if (!store.messages[m.key.remoteJid]?.array?.some(a => a.key.id === m.key.id)) return m
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isBot = ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.id.length)) || /(.)\1{5,}|[^a-zA-Z0-9]/.test(m.id) || false
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = raja.decodeJid(m.fromMe && raja.user.id || m.participant || m.key.participant || m.chat || '')
		if (m.isGroup) {
			if (!store.groupMetadata) store.groupMetadata = await raja.groupFetchAllParticipating().catch(e => ({}))
			let metadata = store.groupMetadata[m.chat] ? store.groupMetadata[m.chat] : (store.groupMetadata[m.chat] = groupCache.get(m.chat))
			if (!metadata) {
				metadata = await raja.groupMetadata(m.chat).catch(e => ({}))
				if (metadata) metadata.participants = metadata.participants?.filter(p => p.hasOwnProperty('id') && p.hasOwnProperty('admin'))?.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) || []
				if (metadata) groupCache.set(m.chat, metadata)
			}
			if (metadata) metadata.participants = metadata.participants?.filter(p => p.hasOwnProperty('id') && p.hasOwnProperty('admin'))?.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) || []
			m.metadata = metadata
			m.admins = m.metadata.participants ? (m.metadata.participants.reduce((a, b) => (b.admin ? a.push({ id: b.id, admin: b.admin }) : [...a]) && a, [])) : []
			m.isAdmin = m.admins?.some((b) => b.id === m.sender) || false
			m.participant = m.key.participant
			m.isBotAdmin = !!m.admins?.find((member) => member.id === botNumber) || false
		}
	}
	if (m.message) {
		m.type = getContentType(m.message) || Object.keys(m.message)[0]
		m.msg = (/viewOnceMessage/i.test(m.type) ? m.message[m.type].message[getContentType(m.message[m.type].message)] : (extractMessageContent(m.message[m.type]) || m.message[m.type]))
		m.body = m.message?.conversation || m.msg?.text || m.msg?.conversation || m.msg?.caption || m.msg?.selectedButtonId || m.msg?.singleSelectReply?.selectedRowId || m.msg?.selectedId || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.msg?.name || ''
		m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
		m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''
		m.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.body) ? m.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.body) ? m.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : ''
		m.command = m.body && m.body.replace(m.prefix, '').trim().split(/ +/).shift()
		m.args = m.body?.trim().replace(new RegExp("^" + m.prefix?.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, '\\$&'), 'i'), '').replace(m.command, '').split(/ +/).filter(a => a) || []
		m.device = getDevice(m.id)
		m.expiration = m.msg?.contextInfo?.expiration || 0
		m.timestamp = (typeof m.messageTimestamp === "number" ? m.messageTimestamp : m.messageTimestamp.low ? m.messageTimestamp.low : m.messageTimestamp.high) || m.msg.timestampMs * 1000
		m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath
		if (m.isMedia) {
			m.mime = m.msg?.mimetype
			m.size = m.msg?.fileLength
			m.height = m.msg?.height || ''
			m.width = m.msg?.width || ''
			if (/webp/i.test(m.mime)) {
				m.isAnimated = m.msg?.isAnimated
			}
		}
		m.quoted = m.msg?.contextInfo?.quotedMessage || null
		if (m.quoted) {
			m.quoted.message = extractMessageContent(m.msg?.contextInfo?.quotedMessage)
			m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0]
			m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.device = getDevice(m.quoted.id)
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
			m.quoted.isBot = m.quoted.id ? ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.quoted.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.quoted.id.length)) || /(.)\1{6,}|[^a-zA-Z0-9]/.test(m.quoted.id) : false
			m.quoted.sender = raja.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === raja.decodeJid(raja.user.id)
			m.quoted.text = m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.msg = extractMessageContent(m.quoted.message[m.quoted.type]) || m.quoted.message[m.quoted.type]
			m.quoted.mentionedJid = m.quoted?.msg?.contextInfo?.mentionedJid || []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.getQuotedObj = async () => {
				if (!m.quoted.id) return false
				let q = await store.loadMessage(m.chat, m.quoted.id, raja)
				return await Serialize(raja, q, store, groupCache)
			}
			m.quoted.key = {
				remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
				participant: m.quoted.sender,
				fromMe: areJidsSameUser(raja.decodeJid(m.msg?.contextInfo?.participant), raja.decodeJid(raja?.user?.id)),
				id: m.msg?.contextInfo?.stanzaId
			}
			m.quoted.isGroup = m.quoted.chat.endsWith('@g.us')
			m.quoted.mentions = m.quoted.msg?.contextInfo?.mentionedJid || []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.quoted.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.quoted.body) ? m.quoted.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.quoted.body) ? m.quoted.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : ''
			m.quoted.command = m.quoted.body && m.quoted.body.replace(m.quoted.prefix, '').trim().split(/ +/).shift()
			m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath
			if (m.quoted.isMedia) {
				m.quoted.mime = m.quoted.msg?.mimetype
				m.quoted.size = m.quoted.msg?.fileLength
				m.quoted.height = m.quoted.msg?.height || ''
				m.quoted.width = m.quoted.msg?.width || ''
				if (/webp/i.test(m.quoted.mime)) {
					m.quoted.isAnimated = m?.quoted?.msg?.isAnimated || false
				}
			}
			m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
				key: {
					remoteJid: m.quoted.chat,
					fromMe: m.quoted.fromMe,
					id: m.quoted.id
				},
				message: m.quoted,
				...(m.isGroup ? { participant: m.quoted.sender } : {})
			})
			m.quoted.download = () => raja.downloadMediaMessage(m.quoted)
			m.quoted.delete = () => {
				raja.sendMessage(m.quoted.chat, {
					delete: {
						remoteJid: m.quoted.chat,
						fromMe: m.isBotAdmins ? false : true,
						id: m.quoted.id,
						participant: m.quoted.sender
					}
				})
			}
		}
	}
	
	m.download = () => raja.downloadMediaMessage(m)
	
	m.copy = () => Serialize(raja, proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m)))
	
	m.reply = async (content, options = {}) => {
		const { quoted = m, chat = m.chat, caption = '', ephemeralExpiration = m.expiration, mentions = (typeof content === 'string' || typeof content.text === 'string' || typeof content.caption === 'string') ? [...(content.text || content.caption || content).matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') : [], ...validate } = options
		if (typeof content === 'object') {
			return raja.sendMessage(chat, content, { ...options, quoted, ephemeralExpiration })
		} else if (typeof content === 'string') {
			try {
				if (/^https?:\/\//.test(content)) {
					const data = await axios.get(content, { responseType: 'arraybuffer' })
					const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data)).mime
					if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
						return raja.sendMedia(chat, data.data, '', caption, quoted, content)
					} else {
						return raja.sendMessage(chat, { text: content, mentions, ...options }, { quoted, ephemeralExpiration })
					}
				} else {
					return raja.sendMessage(chat, { text: content, mentions, ...options }, { quoted, ephemeralExpiration })
				}
			} catch (e) {
				return raja.sendMessage(chat, { text: content, mentions, ...options }, { quoted, ephemeralExpiration })
			}
		}
	}

	return m
}

module.exports = { groupCacheUpdate, groupParticipantUpdate, LoadDataBase, messagesUpsert, solving }

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})