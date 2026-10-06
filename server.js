const express=require("express");
const multer=require("multer");
const OpenAI=require("openai");
const fs=require("fs");
const path=require("path");
const app=express(), upload=multer({limits:{fileSize:12*1024*1024}});
const DB=path.join(__dirname,"data.json");
app.use(express.json({limit:"2mb"})); app.use(express.static(path.join(__dirname,"public")));
function db(){try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch(e){return {year:2027,submissions:[]}}}
function save(x){fs.writeFileSync(DB,JSON.stringify(x,null,2))}
app.get("/api/results",(req,res)=>res.json(db()));
app.post("/api/confirm",(req,res)=>{
 const x=db(), s=req.body||{};
 if(!s.code||!s.club||!s.groupName||!Array.isArray(s.shooters)) return res.status(400).json({error:"Angaben unvollständig"});
 const key=[s.round,s.code,s.club,s.groupName,s.komb].join("|").toLowerCase();
 x.submissions=x.submissions.filter(a=>[a.round,a.code,a.club,a.groupName,a.komb].join("|").toLowerCase()!==key);
 s.id=Date.now(); s.confirmedAt=new Date().toISOString(); s.status="kontrolliert"; x.submissions.push(s); save(x); res.json({ok:true,count:x.submissions.length});
});
app.post("/api/analyse",upload.single("image"),async(req,res)=>{
 try{
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY fehlt");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const b64=req.file.buffer.toString("base64"), mime=req.file.mimetype||"image/jpeg";
  const prompt=`Lies dieses Amtscup-Standblatt. Antworte NUR als JSON:
{"discipline":"Feld A|Pistole|Jungschützen","round":"","komb":"","club":"","code":"","groupName":"","groupResult":0,"shooters":[{"name":"","birthYear":"","gender":"","sport":"","result":0}],"warnings":[]}
Nichts erfinden. Unsichere Angaben in warnings nennen. Bei Feld A Sportgerät möglichst als 90BK,90RK,57/03,57/02,Karabiner,Standard oder FG.`;
  const out=await client.chat.completions.create({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:`data:${mime};base64,${b64}`}}]}]});
  res.json(JSON.parse(out.choices[0].message.content));
 }catch(e){res.status(500).json({error:e?.message||"Analyse fehlgeschlagen"})}
});
app.listen(process.env.PORT||3000,()=>console.log("Amtscup 2027 läuft auf Port",process.env.PORT||3000));
