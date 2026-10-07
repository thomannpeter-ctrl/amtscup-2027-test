const express=require("express"),multer=require("multer"),OpenAI=require("openai"),fs=require("fs"),path=require("path");
const app=express(),upload=multer({limits:{fileSize:12*1024*1024}}),DB=path.join(__dirname,"data.json");
app.use(express.json({limit:"2mb"})); app.use(express.static(path.join(__dirname,"public")));
const empty=()=>({year:2027,submissions:[]});
function db(){try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch{return empty()}}
function save(x){fs.writeFileSync(DB,JSON.stringify(x,null,2))}
app.get("/api/results",(q,r)=>r.json(db()));
app.delete("/api/results/:id",(q,r)=>{let x=db();x.submissions=x.submissions.filter(s=>String(s.id)!==String(q.params.id));save(x);r.json({ok:true})});
app.post("/api/confirm",(q,r)=>{
 const s=q.body||{}, req=["discipline","round","komb","code","club","groupName"];
 if(req.some(k=>!String(s[k]||"").trim())) return r.status(400).json({error:"Kopfdaten unvollständig."});
 if(s.discipline!=="Feld A") return r.status(400).json({error:"Dieser Test ist vorerst nur für Feld A freigegeben."});
 if(!Array.isArray(s.shooters)||s.shooters.length!==5) return r.status(400).json({error:"Feld A benötigt genau 5 Schützen."});
 for(const [i,a] of s.shooters.entries()){
   if(!a.name||!a.birthYear||!["M","W"].includes(a.gender)||!a.sport||!Number(a.result))
     return r.status(400).json({error:`Schütze ${i+1}: Name, Jahrgang, Gender, Sportgerät und Resultat müssen kontrolliert sein.`});
 }
 let x=db(), key=[s.discipline,s.round,s.code].join("|").toLowerCase();
 x.submissions=x.submissions.filter(a=>[a.discipline,a.round,a.code].join("|").toLowerCase()!==key);
 s.id=Date.now();s.status="kontrolliert";s.confirmedAt=new Date().toISOString();x.submissions.push(s);save(x);r.json({ok:true,id:s.id});
});
app.post("/api/analyse",upload.single("image"),async(q,r)=>{
 try{
  if(!process.env.OPENAI_API_KEY) throw Error("OPENAI_API_KEY fehlt");
  const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY}), mime=q.file.mimetype||"image/jpeg",b64=q.file.buffer.toString("base64");
  const prompt=`Lies dieses Amtscup-Gruppenstandblatt. Antworte NUR als JSON:
{"discipline":"","round":"","komb":"","club":"","code":"","groupName":"","shooters":[{"name":"","birthYear":"","gender":"","sport":"","result":0}],"warnings":[]}
Disziplin muss genau "Feld A", "Pistole" oder "Jungschützen" sein. Nichts erfinden.
Gender nur übernehmen wenn es eindeutig auf dem Blatt steht, sonst leer lassen.
Für Feld A Sportgerät wenn eindeutig auf einen dieser Werte normieren: 90BK, 90RK, 57/03, 57/02, Karabiner, Standard, FG. Wenn BK/RK nicht eindeutig ist, leer lassen und warnen.
Unsichere Namen/Felder in warnings nennen.`;
  const o=await c.chat.completions.create({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:`data:${mime};base64,${b64}`}}]}]});
  r.json(JSON.parse(o.choices[0].message.content));
 }catch(e){r.status(500).json({error:e.message||"Analyse fehlgeschlagen"})}
});
app.listen(process.env.PORT||3000,()=>console.log("Amtscup 2027 V2 läuft"));
