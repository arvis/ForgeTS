// Trusted fixed program. Source content is JSON stdin data, never interpolated code.
export const REPLACEMENT_WORKER = String.raw`
const fs = require('node:fs');
const crypto = require('node:crypto');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {input += chunk;if(Buffer.byteLength(input)>65536)process.exit(2)});
process.stdin.on('end', () => {
  try {
    const {files, replacements} = JSON.parse(input);
    for(const file of files){
      const directory = file.path.slice(0,file.path.lastIndexOf('/'));
      fs.mkdirSync('/workspace/'+directory,{recursive:true,mode:0o700});
      const fd = fs.openSync('/workspace/'+file.path,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);
      try{fs.writeFileSync(fd,file.content,'utf8')}finally{fs.closeSync(fd)}
    }
    for(const edit of replacements){
      const fd=fs.openSync('/workspace/'+edit.path,fs.constants.O_RDWR|fs.constants.O_NOFOLLOW);
      try{
        if(!fs.fstatSync(fd).isFile())throw Error('regular file required');
        const previous=fs.readFileSync(fd,'utf8');
        if(crypto.createHash('sha256').update(previous).digest('hex')!==edit.beforeHash)throw Error('stale');
        fs.ftruncateSync(fd,0);
        fs.writeSync(fd,edit.content,0,'utf8');
      }finally{fs.closeSync(fd)}
    }
    const result=files.map(file=>({path:file.path,content:fs.readFileSync('/workspace/'+file.path,'utf8')}));
    process.stdout.write(JSON.stringify(result));
  }catch{process.exitCode=2}
});
`;
