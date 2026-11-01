/** Generate or display the one-time setup token in the private account directory. */
import {mkdirSync,readFileSync,openSync,writeFileSync,closeSync,chmodSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {randomBytes} from 'node:crypto';
const dir=resolve(process.env.APP_CONFIG_DIR || join(homedir(),'nexus-runtime'));
mkdirSync(dir,{recursive:true,mode:0o700});
const installed=join(dir,'installation.json');
try { readFileSync(installed); console.error('Already installed; setup token unavailable.'); process.exit(1); } catch(e) { if(e.code!=='ENOENT') throw e; }
const file=join(dir,'installer-token');
try {const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,randomBytes(32).toString('hex'));}finally{closeSync(fd);}}catch(e){if(e.code!=='EEXIST')throw e;}
chmodSync(file,0o600);
console.log('Setup token (keep private):',readFileSync(file,'utf8').trim());
