import { CHECK_COMMANDS } from '@forgets/contracts';
export const CHECK_WORKER = String.raw`
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const commands=${JSON.stringify(CHECK_COMMANDS)};
let input='';process.stdin.setEncoding('utf8');
process.stdin.on('data',part=>{input+=part;if(Buffer.byteLength(input)>65536)process.exit(2)});
process.stdin.on('end',async()=>{
  try{
    const request=JSON.parse(input);
    if(!commands[request.check])throw Error('check');
    fs.mkdirSync('/workspace/src',{mode:0o700});
    for(const file of request.files){const fd=fs.openSync('/workspace/'+file.path,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,file.content,'utf8')}finally{fs.closeSync(fd)}}
    fs.writeFileSync('/workspace/package.json',JSON.stringify({type:'module'}),{flag:'wx'});
    fs.symlinkSync('/opt/forgets/node_modules','/workspace/node_modules');
    const started=performance.now();let stdout='',stderr='',stdoutBytes=0,stderrBytes=0;let stdoutTruncated=false,stderrTruncated=false,timedOut=false;let exitCode=null,signal=null,commandsExecuted=0;
    const remaining=()=>Math.max(1,8000-(performance.now()-started));
    for(const argv of commands[request.check]){
      commandsExecuted++;
      await new Promise((resolve,reject)=>{
        const child=spawn(argv[0],argv.slice(1),{cwd:'/workspace',env:{PATH:'/usr/local/bin:/usr/bin:/bin',HOME:'/workspace',LANG:'C.UTF-8'},shell:false,detached:true,stdio:['ignore','pipe','pipe']});
        const kill=()=>{try{process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}};
        const timer=setTimeout(()=>{timedOut=true;kill()},remaining());
        child.stdout.on('data',data=>{stdoutBytes+=data.length;if(stdoutBytes>512){stdoutTruncated=true;kill()}else stdout+=data.toString('utf8')});
        child.stderr.on('data',data=>{stderrBytes+=data.length;if(stderrBytes>512){stderrTruncated=true;kill()}else stderr+=data.toString('utf8')});
        child.once('error',()=>{clearTimeout(timer);reject(Error('spawn'))});
        child.once('close',(code,term)=>{clearTimeout(timer);exitCode=code;signal=term;resolve()});
      });
      if(exitCode!==0||timedOut||stdoutTruncated||stderrTruncated)break;
    }
    let sourcesChanged=false;
    for(const file of request.files){
      try{const fd=fs.openSync('/workspace/'+file.path,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const value=Buffer.alloc(8193);const size=fs.readSync(fd,value,0,value.length,0);if(!fs.fstatSync(fd).isFile()||size>8192||value.subarray(0,size).toString('utf8')!==file.content)sourcesChanged=true;}finally{fs.closeSync(fd)}}catch{sourcesChanged=true;}
    }
    process.stdout.write(JSON.stringify({sourcesChanged,exitCode,signal,timedOut,stdoutTruncated,stderrTruncated,stdout,stderr,commandsExecuted,toolDurationMs:Math.ceil(performance.now()-started)}));
  }catch{process.exitCode=2}
});
`;
