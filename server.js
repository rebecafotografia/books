import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const DATA=path.join(root,'data'), MEDIA=path.join(DATA,'albums'), META=path.join(DATA,'meta.json');
const PORT=Number(process.env.PORT||3000);
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'';
const SESSION_SECRET=process.env.SESSION_SECRET||'';
const LIMIT=250*1024*1024;
fs.mkdirSync(MEDIA,{recursive:true});
if(!fs.existsSync(META)) fs.writeFileSync(META,'{}');
const types={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
const safe=(s)=>typeof s==='string'&&/^[a-z0-9][a-z0-9-_]{0,79}$/.test(s);
const read=()=>{try{return JSON.parse(fs.readFileSync(META,'utf8'))}catch{return {}}};
const save=(v)=>{const t=META+'.tmp';fs.writeFileSync(t,JSON.stringify(v,null,2));fs.renameSync(t,META)};
const send=(res,status,data,head={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...head});res.end(JSON.stringify(data))};
const cookies=(req)=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const sign=(s)=>crypto.createHmac('sha256',SESSION_SECRET).update(s).digest('hex');
const auth=(req,role,slug='')=>{
 if(!SESSION_SECRET)return false;
 const c=cookies(req), key=role==='admin'?'rb_admin':'rb_album_'+slug,v=c[key]||'',i=v.lastIndexOf('.');
 if(i<0)return false;
 const payload=v.slice(0,i),signature=v.slice(i+1),expected=sign(role+':'+slug+':'+payload);
 if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false;
 const [exp,nonce]=payload.split(':');
 return Boolean(nonce&&Number(exp)>Date.now());
};
const session=(role,slug='')=>{const payload=(Date.now()+1000*60*60*24*14)+':'+crypto.randomBytes(12).toString('hex');return payload+'.'+sign(role+':'+slug+':'+payload)};
const admin=(req,res)=>{if(!auth(req,'admin')){send(res,401,{error:'Faça login no painel.'});return false}return true};
const dirs=()=>fs.readdirSync(MEDIA,{withFileTypes:true}).filter(x=>x.isDirectory()&&safe(x.name)).map(x=>x.name);
const items=(slug)=>{const d=path.join(MEDIA,slug);if(!fs.existsSync(d))return [];return fs.readdirSync(d,{withFileTypes:true}).filter(x=>x.isFile()&&types[path.extname(x.name).toLowerCase()]).map(x=>{const st=fs.statSync(path.join(d,x.name));return {name:x.name,type:types[path.extname(x.name).toLowerCase()].startsWith('video/')?'video':'photo',size:st.size,mtime:st.mtimeMs}}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true}))};
const album=(slug)=>{if(!safe(slug))return null;const m=read()[slug];if(!m&&!dirs().includes(slug))return null;const media=items(slug);return {slug,title:m?.title||slug.replaceAll('-',' '),subtitle:m?.subtitle||'',font:m?.font||'serif',scale:Number(m?.scale)||1,cover:m?.cover||'',videoCover:m?.videoCover||'',private:!!m?.private,media,updated:Math.max(0,...media.map(x=>x.mtime))}};
async function body(req,max=LIMIT+1024){let parts=[],n=0;for await(const ch of req){n+=ch.length;if(n>max)throw Error('Arquivo excede o limite.');parts.push(ch)}return Buffer.concat(parts)}
function file(req,res,filename,download=false){
 const ext=path.extname(filename).toLowerCase(),type=types[ext];if(!type||!fs.existsSync(filename)){res.writeHead(404);res.end();return}
 const st=fs.statSync(filename),range=req.headers.range;let start=0,end=st.size-1,status=200;
 if(range){const m=/bytes=(\d*)-(\d*)/.exec(range);if(m){start=m[1]?Number(m[1]):0;end=m[2]?Math.min(Number(m[2]),st.size-1):end;if(start>end||start>=st.size){res.writeHead(416,{'content-range':'bytes */'+st.size});res.end();return}status=206}}
 const headers={'content-type':type,'content-length':end-start+1,'accept-ranges':'bytes','cache-control':'private, max-age=60','x-content-type-options':'nosniff','content-disposition':(download?'attachment':'inline')+'; filename*=UTF-8\x27\x27'+encodeURIComponent(path.basename(filename))};
 if(status===206)headers['content-range']='bytes '+start+'-'+end+'/'+st.size;
 res.writeHead(status,headers);fs.createReadStream(filename,{start,end}).pipe(res);
}
function crc32(buf){let c=~0;for(const n of buf){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^(0xedb88320&-(c&1))}return (~c)>>>0}
function zip(res,slug,names){
 const records=[],out=[];let offset=0;
 const emit=(buf)=>{out.push(buf);offset+=buf.length};
 for(const name of names){const f=path.join(MEDIA,slug,name);if(!fs.existsSync(f))continue;const data=fs.readFileSync(f);const label=Buffer.from(name,'utf8'),crc=crc32(data),head=Buffer.alloc(30);
 head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(label.length,26);
 const position=offset;emit(head);emit(label);emit(data);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(label.length,28);central.writeUInt32LE(position,42);records.push(central,label)
 }
 const centralAt=offset;for(const rec of records)emit(rec);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(records.length/2,8);end.writeUInt16LE(records.length/2,10);end.writeUInt32LE(offset-centralAt,12);end.writeUInt32LE(centralAt,16);emit(end);
 res.writeHead(200,{'content-type':'application/zip','content-disposition':'attachment; filename="rebeca-fotografia.zip"','content-length':offset});for(const b of out)res.write(b);res.end()
}
const page=fs.readFileSync(path.join(root,'public','index.html'));
const servePage=res=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(page)};
http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost'),p=u.pathname,method=req.method;
 if(method==='GET'&&(p==='/'||p==='/admin'||p.startsWith('/a/'))){servePage(res);return}
 if(p==='/api/login'&&method==='POST'){
  if(!ADMIN_PASSWORD||!SESSION_SECRET){send(res,503,{error:'Configure ADMIN_PASSWORD e SESSION_SECRET no servidor.'});return}
  const b=JSON.parse((await body(req,4096)).toString()),x=Buffer.from(String(b.password||'')),y=Buffer.from(ADMIN_PASSWORD);
  if(x.length!==y.length||!crypto.timingSafeEqual(x,y)){send(res,401,{error:'Senha incorreta.'});return}
  send(res,200,{ok:true},{'set-cookie':'rb_admin='+encodeURIComponent(session('admin'))+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600'});return
 }
 if(p==='/api/admin/albums'&&method==='GET'){if(!admin(req,res))return;send(res,200,{albums:dirs().map(album)});return}
 if(p==='/api/admin/album'&&method==='POST'){
  if(!admin(req,res))return;
  const b=JSON.parse((await body(req,16384)).toString()),slug=String(b.slug||'').toLowerCase();
  if(!safe(slug)){send(res,400,{error:'Slug inválido. Use letras, números e hífens.'});return}
  const prev=read(),old=prev[slug]||{},entry={...old,title:String(b.title||slug).slice(0,130),subtitle:String(b.subtitle||'').slice(0,180),font:['serif','sans','display'].includes(b.font)?b.font:'serif',scale:Math.min(1.5,Math.max(.7,Number(b.scale)||1)),cover:String(b.cover||'').slice(0,250),videoCover:String(b.videoCover||'').slice(0,250),private:!!b.private,password:b.password?crypto.scryptSync(String(b.password),'rebeca-'+slug,64).toString('hex'):old.password||''};
  if(entry.private&&!entry.password){send(res,400,{error:'Defina senha para este álbum privado.'});return}
  fs.mkdirSync(path.join(MEDIA,slug),{recursive:true});prev[slug]=entry;save(prev);send(res,200,{album:album(slug)});return
 }
 if(p==='/api/admin/upload'&&method==='POST'){
  if(!admin(req,res))return;
  const slug=u.searchParams.get('album'),name=u.searchParams.get('name')||'',ext=path.extname(name).toLowerCase();
  if(!safe(slug)||!read()[slug]||!types[ext]){send(res,400,{error:'Álbum ou tipo de arquivo inválido.'});return}
  const buf=await body(req,LIMIT);
  const base=path.basename(name).replace(/[^a-zA-Z0-9_.() -]/g,'_').slice(0,140);
  if(!base||base==='.'||base==='..'){send(res,400,{error:'Nome de arquivo inválido.'});return}
  let target=base,n=1;while(fs.existsSync(path.join(MEDIA,slug,target))){target=path.parse(base).name+'-'+n++ + ext}
  fs.writeFileSync(path.join(MEDIA,slug,target),buf,{flag:'wx'});send(res,200,{name:target});return
 }
 if(p==='/api/admin/delete'&&method==='POST'){
  if(!admin(req,res))return;
  const b=JSON.parse((await body(req,4096)).toString()),slug=b.slug,name=b.name;
  if(!safe(slug)||typeof name!=='string'||name!==path.basename(name)||!types[path.extname(name).toLowerCase()]){send(res,400,{error:'Arquivo inválido.'});return}
  fs.rmSync(path.join(MEDIA,slug,name),{force:true});send(res,200,{ok:true});return
 }
 const access=p.match(/^\/api\/a\/([a-z0-9_-]+)\/access$/);
 if(access&&method==='POST'){const slug=access[1],meta=read()[slug];if(!meta?.private){send(res,404,{error:'Álbum inexistente.'});return}
  const b=JSON.parse((await body(req,4096)).toString()),hash=crypto.scryptSync(String(b.password||''),'rebeca-'+slug,64).toString('hex');
  if(hash!==meta.password){send(res,401,{error:'Senha incorreta.'});return}
  send(res,200,{ok:true},{'set-cookie':'rb_album_'+slug+'='+encodeURIComponent(session('album',slug))+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600'});return
 }
 const publicAlbum=p.match(/^\/api\/a\/([a-z0-9_-]+)$/);
 if(publicAlbum&&method==='GET'){const a=album(publicAlbum[1]);if(!a){send(res,404,{error:'Álbum inexistente.'});return}
  if(a.private&&!auth(req,'album',a.slug)){send(res,403,{private:true,title:a.title});return}
  send(res,200,a);return
 }
 const media=p.match(/^\/media\/([a-z0-9_-]+)\/([^/]+)$/);
 if(media&&method==='GET'){const slug=media[1],name=decodeURIComponent(media[2]),a=album(slug);
  if(!a||name!==path.basename(name)||!a.media.some(x=>x.name===name)||(a.private&&!auth(req,'album',slug))){res.writeHead(404);res.end();return}
  file(req,res,path.join(MEDIA,slug,name),u.searchParams.has('download'));return
 }
 const batch=p.match(/^\/api\/a\/([a-z0-9_-]+)\/download$/);
 if(batch&&method==='POST'){const a=album(batch[1]);if(!a||(a.private&&!auth(req,'album',a.slug))){send(res,403,{error:'Acesso negado.'});return}
  const b=JSON.parse((await body(req,100000)).toString()),allowed=new Set(a.media.map(x=>x.name)),names=[...new Set(Array.isArray(b.names)?b.names:[])].filter(x=>allowed.has(x)).slice(0,500);
  if(!names.length){send(res,400,{error:'Nenhum arquivo selecionado.'});return}
  if(names.reduce((s,n)=>s+(a.media.find(x=>x.name===n)?.size||0),0)>1024*1024*1024){send(res,413,{error:'Selecione menos arquivos por download (limite 1 GB).'});return}
  zip(res,a.slug,names);return
 }
 send(res,404,{error:'Não encontrado.'});
 }catch(e){console.error(e);if(!res.headersSent)send(res,e.message?.includes('limite')?413:500,{error:e.message||'Erro interno.'});else res.end()}
}).listen(PORT,()=>console.log('Rebeca Books → http://localhost:'+PORT));