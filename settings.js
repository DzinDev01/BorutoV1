const fs = require("fs") 
const chalk = require("chalk") 

//global setting
global.owner = ["6283862849801"] 
global.packname = '© 2025' 
global.author = 'CREATED\nRAJA' 
global.botname = 'Boruto - WhatsApp Assistant' 
global.listprefix = ['#','.'] 
global.tempatDB = 'database.json' 
global.pairing_code = true 
global.number_bot = '' 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})