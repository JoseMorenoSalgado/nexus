import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {createServer as createHttpServer,request} from "node:http";
import {createServer} from "node:https";
import {connect} from "node:net";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "playwright";
import {PDFDocument} from "pdf-lib";
import sharp from "sharp";

export async function checkPropertiesInBrowser({app,canonical,db,adminEmail,agentEmail,password}){
 assert.equal(app.hostname,"127.0.0.1");
 assert.equal(canonical.origin,"https://nexus-ci.example");

 const temp=await mkdtemp(join(tmpdir(),"nexus-property-browser-"));
 let proxy,tunnel,browser;
 const errors=[];
 try{
  execFileSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-days","1",
   "-subj","/CN=nexus-ci.example","-keyout",join(temp,"key.pem"),"-out",join(temp,"cert.pem")],{stdio:"ignore"});
  proxy=createServer({key:await readFile(join(temp,"key.pem")),cert:await readFile(join(temp,"cert.pem"))},(incoming,outgoing)=>{
   // Reproduce the nginx 403 observed in Enhance for bracketed Next.js assets.
   if(incoming.url.startsWith("/_next/static/")&&/(?:\[|\]|%5b|%5d)/i.test(incoming.url)){
    outgoing.writeHead(403).end();
    return;
   }
   // Production nginx returns an HTML 400 for multipart property-photo uploads.
   if(incoming.method==="POST"&&/^\/api\/admin\/properties\/[^/]+\/photos$/.test(incoming.url)&&
    incoming.headers["content-type"]?.startsWith("multipart/form-data")){
    outgoing.writeHead(400,{"Content-Type":"text/html"}).end("<h1>400 Bad Request</h1>");
    return;
   }
   const upstream=request(new URL(incoming.url,app),{
    method:incoming.method,
    headers:{...incoming.headers,host:app.host,"x-forwarded-host":canonical.host,"x-forwarded-proto":"https"}
   },response=>{
    outgoing.writeHead(response.statusCode,response.headers);
    response.pipe(outgoing);
   });
   upstream.on("error",()=>outgoing.writeHead(502).end());
   incoming.pipe(upstream);
  });
  await new Promise((resolve,reject)=>proxy.once("error",reject).listen(0,"127.0.0.1",resolve));
  // Keep the browser's HTTPS origin identical to SITE_URL without binding port 443.
  tunnel=createHttpServer((_req,res)=>res.writeHead(403).end());
  tunnel.on("connect",(req,socket,head)=>{
   if(req.url!==canonical.hostname+":443"){
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    return;
   }
   const target=connect(proxy.address().port,"127.0.0.1",()=>{
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if(head.length)target.write(head);
    socket.pipe(target).pipe(socket);
   });
   target.on("error",()=>socket.destroy());
   socket.on("error",()=>target.destroy());
   socket.on("close",()=>target.destroy());
  });
  await new Promise((resolve,reject)=>tunnel.once("error",reject).listen(0,"127.0.0.1",resolve));
  browser=await chromium.launch({
   headless:true,executablePath:process.env.NEXUS_TEST_CHROMIUM,
   proxy:{server:"http://127.0.0.1:"+tunnel.address().port}
  });
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:900},reducedMotion:"reduce"});
  // Prevent the test browser from making requests beyond its ephemeral HTTPS proxy.
  await context.route("**/*",route=>new URL(route.request().url()).origin===canonical.origin?route.continue():route.abort());
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  function observe(tab){
   tab.on("pageerror",error=>errors.push(error.message));
   tab.on("console",message=>{
    if(message.type()==="error"&&/hydration|Minified React error|ChunkLoadError/.test(message.text()))errors.push(message.text());
   });
   tab.on("response",response=>{
    const url=new URL(response.url());
    if(url.origin!==canonical.origin)return;
    if(response.status()>=500||(response.status()>=400&&url.pathname.startsWith("/_next/static/"))){
     errors.push("HTTP "+response.status()+" "+url.pathname);
    }
   });
   tab.on("requestfailed",req=>{
    const url=new URL(req.url());
    if(url.origin===canonical.origin&&url.pathname.startsWith("/_next/static/")&&req.failure()?.errorText!=="net::ERR_ABORTED"){
     errors.push(req.failure()?.errorText+" "+url.pathname);
    }
   });
  }
  observe(page);
  async function open(tab,path,status=200){
   const response=await tab.goto(new URL(path,canonical).href,{waitUntil:"load"});
   assert.equal(response.status(),status,path);
  }
  async function login(tab,email){
   await open(tab,"/admin/acceso");
   await tab.getByLabel("Correo electrónico").fill(email);
   await tab.getByLabel("Contraseña").fill(password);
   await tab.getByRole("button",{name:/Entrar al panel/}).click();
   await tab.waitForURL(new URL("/admin",canonical).href);
  }
  async function responsive(tab){
   for(const width of [375,768,1024,1440]){
    await tab.setViewportSize({width,height:900});
    assert.ok(await tab.locator("h1").first().isVisible(),"Missing heading at "+width+"px");
    const overflow=await tab.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,"Horizontal overflow at "+width+"px: "+overflow);
   }
  }

  for(const path of ["/","/propiedades","/nosotros","/servicios","/contacto"]){
   await open(page,path);
   const logo=page.locator("header .nexus-brand img");
   assert.ok(await logo.evaluate(image=>image.decode().then(()=>image.naturalWidth>0)),path+" logo");
   await responsive(page);
   if(path==="/"&&process.env.NEXUS_TEST_SCREENSHOT_DIR){
    for(const width of [375,1440]){
     await page.setViewportSize({width,height:900});
     await page.screenshot({path:join(process.env.NEXUS_TEST_SCREENSHOT_DIR,"nexus-home-"+width+".png")});
    }
   }
  }

  await login(page,adminEmail);
  await open(page,"/admin/personalizar/paginas/home");
  await page.getByRole("heading",{name:"Editar: Página de inicio"}).waitFor();
  await open(page,"/admin/clientes-agentes");
  const passwordToggle=page.getByRole("button",{name:"Mostrar contraseñas"});
  await page.waitForLoadState("networkidle");
  await passwordToggle.click();
  assert.equal(await page.locator('input[name="password"]').getAttribute("type"),"text");
  await page.getByRole("button",{name:"Ocultar contraseñas"}).click();
  assert.equal(await page.locator('input[name="password"]').getAttribute("type"),"password");
  console.log("PASS Chromium: public branding, responsive pages, page editor and password visibility");
  await open(page,"/admin/propiedades");
  await page.getByRole("link",{name:"Nueva propiedad",exact:true}).first().click();
  await page.getByRole("heading",{name:"Nueva propiedad",exact:true}).waitFor();
  const title="Casa Playwright en Managua";
  await page.getByLabel("Título de la propiedad").fill(title);
  await page.getByLabel("Descripción").fill("Descripción inmobiliaria para la prueba en navegador.");
  await page.getByLabel("Precio en USD").fill("172500.50");
  await page.locator("form.property-editor summary").getByText("Más opciones",{exact:true}).click();
  const agent=await db.adminUser.findUniqueOrThrow({where:{email:agentEmail}});
  await page.getByLabel("Agente responsable").selectOption(agent.id);
  await page.getByRole("button",{name:"Crear propiedad y añadir fotos"}).click();
  await page.waitForURL(/\/editar\?created=1$/);
  const property=await db.property.findFirstOrThrow({where:{title}});
  assert.equal(property.assignedAgentId,agent.id);
  assert.equal(String(property.price),"172500.5");
  assert.equal(property.published,false);
  const edit="/admin/propiedades/"+property.id+"/editar";
  const detail="/propiedades/"+property.slug;

  await page.getByRole("link",{name:"← Propiedades"}).click();
  const row=page.locator("article").filter({hasText:property.refCode});
  await row.getByRole("link",{name:"Editar"}).click();
  await page.getByRole("heading",{name:"Editar propiedad"}).waitFor();
  const editedTitle=title+" editada";
  await page.getByLabel("Título de la propiedad").fill(editedTitle);
  await page.getByRole("button",{name:"Guardar cambios"}).click();
  await page.waitForURL(/\/editar\?saved=1$/);
  await page.reload({waitUntil:"load"});
  assert.equal(await page.getByLabel("Título de la propiedad").inputValue(),editedTitle);
  assert.equal((await db.property.findUniqueOrThrow({where:{id:property.id}})).title,editedTitle);
  await responsive(page);
  await page.waitForLoadState("networkidle");
  assert.deepEqual(errors,[],"Browser errors opening the editor");

  const png=await sharp({create:{width:120,height:120,channels:3,background:"#990022"}}).png().toBuffer();
  const upload=page.locator('#editar-fotos input[type="file"]');
  const [uploadResponse]=await Promise.all([
   page.waitForResponse(response=>response.request().method()==="POST"&&
    new URL(response.url()).pathname==="/api/admin/properties/"+property.id+"/photos"),
   upload.setInputFiles({name:"foto.png",mimeType:"image/png",buffer:png})
  ]);
  assert.equal(uploadResponse.request().headers()["content-type"],"application/json");
  assert.equal(uploadResponse.status(),201,await uploadResponse.text());
  await page.getByText("1 de 15 fotografías").waitFor();
  const photo=await db.photo.findFirstOrThrow({where:{propertyId:property.id}});
  await page.getByRole("button",{name:"Ampliar fotografía 1"}).click();
  const preview=page.getByRole("dialog",{name:"Vista completa de fotografía"});
  await preview.getByRole("img").waitFor();
  assert.ok(await preview.getByRole("img").evaluate(image=>image.decode().then(()=>image.naturalWidth>0)));
  await preview.getByRole("button",{name:"Cerrar vista completa"}).click();

  await page.getByRole("link",{name:"← Propiedades"}).click();
  await row.getByRole("button",{name:"Publicar",exact:true}).click();
  await page.waitForURL(/\?updated=1$/);
  assert.equal((await db.property.findUniqueOrThrow({where:{id:property.id}})).published,true);
  await open(page,"/propiedades");
  await page.locator('a[href="'+detail+'"]').first().click();
  await page.getByRole("heading",{name:editedTitle,exact:true}).waitFor();
  await responsive(page);
  const [download]=await Promise.all([
   page.waitForEvent("download"),page.getByRole("link",{name:"Descargar ficha automática"}).click()
  ]);
  const pdf=await PDFDocument.load(await readFile(await download.path()));
  assert.match(download.suggestedFilename(),/^nexus-.*\.pdf$/);
  assert.ok(pdf.getPageCount()>=1&&pdf.getPageCount()<=2);

  const agentContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:375,height:800},isMobile:true,hasTouch:true});
  await agentContext.route("**/*",route=>new URL(route.request().url()).origin===canonical.origin?route.continue():route.abort());
  const agentPage=await agentContext.newPage();
  agentPage.setDefaultTimeout(12000);
  observe(agentPage);
  await login(agentPage,agentEmail);
  await open(agentPage,edit);
  await agentPage.getByRole("heading",{name:"Editar propiedad"}).waitFor();
  assert.equal(await agentPage.getByText("Eliminar inmueble",{exact:true}).count(),0);
  const unrelated=await db.property.findFirstOrThrow({where:{id:{not:property.id},assignedAgentId:null}});
  await open(agentPage,"/admin/propiedades/"+unrelated.id+"/editar",404);

  await open(page,"/admin/propiedades");
  await row.getByRole("button",{name:"Ocultar",exact:true}).click();
  await page.waitForURL(/\?updated=1$/);
  assert.equal((await db.property.findUniqueOrThrow({where:{id:property.id}})).published,false);
  await open(page,detail,404);
  await open(page,edit);
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Eliminar fotografía 1"}).click();
  await page.getByText("0 de 15 fotografías").waitFor();
  assert.equal(await db.photo.count({where:{id:photo.id}}),0);
  assert.deepEqual(errors,[],"Uncaught browser errors and failed Next.js assets");
  console.log("PASS Chromium: login, list, create, edit, reload, upload/preview/delete, publish, catalogue/detail, PDF, agent scope and unpublish (375/768/1024/1440px)");
 }catch(error){
  if(errors.length)console.error("Property browser errors:",errors);
  throw error;
 }finally{
  await browser?.close();
  if(tunnel?.listening)await new Promise(resolve=>tunnel.close(resolve));
  if(proxy?.listening)await new Promise(resolve=>proxy.close(resolve));
  await rm(temp,{recursive:true,force:true});
 }
}
