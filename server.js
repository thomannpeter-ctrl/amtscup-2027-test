const express=require("express"),fs=require("fs"),path=require("path"),QR=require("qrcode"),PDFDocument=require("pdfkit");
const app=express(), DB=path.join(__dirname,"data.json");
app.use(express.json({limit:"2mb"})); app.use(express.static(path.join(__dirname,"public")));
const read=()=>JSON.parse(fs.readFileSync(DB,"utf8")); const save=x=>fs.writeFileSync(DB,JSON.stringify(x,null,2));
app.get("/api/state",(q,r)=>r.json(read()));
app.post("/api/groups",(q,r)=>{let d=read(),g=q.body;if(!g.code||!g.club||!g.name||!g.discipline)return r.status(400).json({error:"Angaben unvollständig"});d.groups=d.groups.filter(x=>!(x.discipline===g.discipline&&x.code===g.code));d.groups.push(g);save(d);r.json({ok:true})});
app.post("/api/draws",(q,r)=>{let d=read(),x=q.body;if(!x.discipline||!x.round||!x.pairNo||!x.home||!x.guest)return r.status(400).json({error:"Paarung unvollständig"});if(x.home===x.guest)return r.status(400).json({error:"Heim und Gast sind gleich."});let key=[x.discipline,x.round,x.pairNo].join("|");d.draws=d.draws.filter(a=>[a.discipline,a.round,a.pairNo].join("|")!==key);x.id=Date.now();d.draws.push(x);save(d);r.json({ok:true})});
app.delete("/api/draws/:id",(q,r)=>{let d=read();d.draws=d.draws.filter(x=>String(x.id)!==String(q.params.id));save(d);r.json({ok:true})});
app.get("/api/standblatt/:discipline/:round/:pair/:side.pdf",async(q,r)=>{
 let d=read(), draw=d.draws.find(x=>x.discipline===q.params.discipline&&String(x.round)===q.params.round&&String(x.pairNo)===q.params.pair);
 if(!draw)return r.status(404).send("Paarung nicht gefunden");
 let code=q.params.side==="home"?draw.home:draw.guest, g=d.groups.find(x=>x.discipline===draw.discipline&&x.code===code);
 if(!g)return r.status(404).send("Gruppe nicht gefunden");
 let side=q.params.side==="home"?"Heim":"Gast", token=encodeURIComponent([d.year,draw.discipline,draw.round,draw.pairNo,side,g.code].join("|"));
 let url=`${q.protocol}://${q.get("host")}/?standblatt=${token}`, qr=await QR.toDataURL(url,{margin:1,width:220});
 r.setHeader("Content-Type","application/pdf");r.setHeader("Content-Disposition",`inline; filename="${g.code}_${draw.round}Runde.pdf"`);
 let doc=new PDFDocument({size:"A4",margin:36});doc.pipe(r);
 doc.font("Helvetica-Bold").fontSize(17).text(`Amtscup Konolfingen Gruppenstandblatt ${draw.discipline} ${d.year}`,{align:"center"});doc.moveDown();
 doc.fontSize(12);let y=90;
 [["Runde",draw.round],["Kombination",`${draw.pairNo} ${side}`],["Verein",g.club],["Gruppe",`${g.code}  ${g.name}`]].forEach(a=>{doc.rect(36,y,250,24).stroke();doc.font("Helvetica-Bold").text(a[0],42,y+7);doc.font("Helvetica").text(String(a[1]),130,y+7);y+=24});
 if(draw.discipline==="Feld A"){doc.font("Helvetica-Bold").fontSize(11).text("Sportgeräte / Zuschlag",330,92);["1  Stg. 90  / 4","2  Stg. 90 Ringkorn / 4","3  Stg. 57/03 / 4","4  Stg. 57/02 / 8","5  Karabiner / 4","6  Standardgewehr / 0"].forEach((t,i)=>doc.font("Helvetica").text(t,330,112+i*17));}
 y=220;doc.font("Helvetica-Bold").fontSize(10).text("Name Vorname",42,y).text("Jahrgang",310,y).text("M/W",375,y).text("Sportg.",420,y).text("Resultat",485,y);
 y+=18;for(let i=1;i<=5;i++){doc.rect(36,y,523,52).stroke();doc.font("Helvetica").fontSize(9).text(`Schütze ${i}`,42,y+5);[300,365,410,475].forEach(x=>doc.moveTo(x,y).lineTo(x,y+52).stroke());y+=52}
 doc.font("Helvetica-Bold").text("Zwischentotal:",365,y+10).text("Gruppentotal:",365,y+34);doc.rect(475,y,84,52).stroke();
 doc.font("Helvetica").fontSize(8).text("QR-Code nach dem Wettkampf scannen und das ausgefüllte Standblatt fotografieren.",36,720,{width:360});
 doc.image(Buffer.from(qr.split(",")[1],"base64"),445,690,{width:110});
 doc.end();
});
app.listen(process.env.PORT||3000,()=>console.log("Amtscup 2027 V3 läuft"));
