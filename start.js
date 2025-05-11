const path = require("path") 
const chalk = require("chalk") 
const { spawn } = require("child_process")

function start() {
  let args = [path.join(__dirname, 'index.js'), ...process.argv.slice(2)] 
  let p = spawn(process.argv[0], args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']}).on('message', data => { 
      if (data === 'reset') {
        console.log(chalk.yellow.bold('BOT sedang restart...')) 
        p.kill() 
        start() 
        delete p
      } else if (data === 'uptime') {
        p.send(process.uptime())
      }
    }).on('exit', code => {
      if (code !== 0) {
        console.error(chalk.green.bold(`BOT mengeluarkan code: ${code}`)) 
        start()
      } else {
        console.log(chalk.green.bold('BOT sedang proses dengan bersih')) 
        process.exit(0)
      }
    })
} 
start()