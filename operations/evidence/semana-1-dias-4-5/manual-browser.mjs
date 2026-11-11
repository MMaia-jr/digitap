// Local UI walkthrough with explicit mocked GET/POST data; not a PostgreSQL E2E.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const out='operations/evidence/semana-1-dias-4-5';
const origin='http://127.0.0.1:3215',id='10000000-0000-4000-8000-000000000001';
(async()=>{
 const browser=await chromium.launch({headless:true});const checks=[];
 try{
  for(const scenario of ['visitor','support','intention-private','intention-public']){
   const context=await browser.newContext({viewport:{width:scenario==='intention-public'?390:1280,height:900}});
   const page=await context.newPage();const requests=[];let own=null;
   const names=['Pessoa autorizada','<img src=x onerror="window.xss=1">'];
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
    if(u.pathname===`/api/atividades/${id}/confirmacoes/resumo`)return route.fulfill({json:{apoios:2,intencoes:3}});
    if(u.pathname===`/api/atividades/${id}/confirmacoes`){
     if(route.request().method()==='POST'){
      const input=route.request().postDataJSON();requests.push(input);
      own={tipo:input.tipo,acompanhantes:input.acompanhantes??1,mostrar_nome:input.mostrar_nome??false};
      if(own.tipo==='intencao'&&own.mostrar_nome)names.push('Nome autorizado teste');
      await new Promise(r=>setTimeout(r,100));
      return route.fulfill({json:{message:'Registro de teste concluído.',confirmacao:own}});
     }
     return route.fulfill({json:{authenticated:scenario!=='visitor',resumo:{apoios:2+(own?.tipo==='apoio'?1:0),intencoes:3+(own?.tipo==='intencao'?1:0),nomes_publicos:names,aberta:true},minha_confirmacao:own}});
    }
    return route.continue();
   });
   await page.goto(origin+'/participacao-check-local');
   await expect(page.getByText('Pessoa autorizada',{exact:true})).toBeVisible();
   await expect(page.getByText('<img src=x onerror="window.xss=1">',{exact:true})).toBeVisible();
   expect(await page.locator('.participation-names img, .participation-names [onerror]').count()).toBe(0);
   if(scenario==='visitor'){
    await expect(page.getByRole('button',{name:'Apoiar',exact:true})).toBeDisabled();
    await expect(page.getByRole('link',{name:'Entre para apoiar ou marcar intenção'})).toBeVisible();
   }else if(scenario==='support'){
    await page.getByRole('button',{name:'Apoiar',exact:true}).click();
    await expect(page.getByText('Você já registrou apoio simbólico nesta atividade.')).toBeVisible();
    expect(requests).toEqual([{tipo:'apoio'}]);
    await expect(page.getByRole('button',{name:'Vou Participar',exact:true})).toBeDisabled();
   }else{
    await page.getByRole('button',{name:'Vou Participar',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    expect(await page.getByLabel('WhatsApp (opcional)').getAttribute('required')).toBeNull();
    if(scenario==='intention-private')await page.getByLabel('WhatsApp (opcional)').fill('+5522999999999');
    await page.getByLabel('Quantidade de pessoas, incluindo você').fill('3');
    if(scenario==='intention-public'){
     await page.getByRole('checkbox').check();
     expect(await page.getByRole('dialog').evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(false);
     await page.screenshot({path:out+'/modal-mobile.png',fullPage:true});
    }
    await page.getByRole('button',{name:'Registrar intenção',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Você já registrou intenção de presença nesta atividade.')).toBeVisible();
    expect(requests).toHaveLength(1);expect(requests[0].mostrar_nome).toBe(scenario==='intention-public');
    expect(requests[0].acompanhantes).toBe(3);
    if(scenario==='intention-public')await expect(page.getByText('Nome autorizado teste',{exact:true})).toBeVisible();
    else await expect(page.getByText('Nome autorizado teste',{exact:true})).toHaveCount(0);
    await expect(page.locator('.participation-names')).not.toContainText('+5522999999999');
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   checks.push({scenario,result:'PASS',backend:'mocked',requests});
   await context.close();
  }
  const context=await browser.newContext();const page=await context.newPage();
  const post=await page.request.post(`${origin}/api/atividades/${id}/confirmacoes`,{headers:{origin},data:{tipo:'apoio'}});
  expect(post.status()).toBe(401);checks.push({scenario:'real anonymous POST',status:post.status(),result:'PASS',backend:'real local HTTP, no DB'});
  const csrf=await page.request.post(`${origin}/api/atividades/${id}/confirmacoes`,{headers:{origin:'https://evil.invalid'},data:{tipo:'apoio'}});
  expect(csrf.status()).toBe(403);checks.push({scenario:'real cross-origin POST',status:csrf.status(),result:'PASS',backend:'real local HTTP, no DB'});
  const privateCounts=await page.request.get(`${origin}/api/atividades/${id}/confirmacoes/resumo`);
  expect(privateCounts.status()).toBe(401);checks.push({scenario:'real anonymous organizer GET',status:privateCounts.status(),result:'PASS',backend:'real local HTTP, no DB'});
  await context.close();
 }finally{await browser.close();}
 fs.writeFileSync(out+'/manual-browser.json',JSON.stringify({checked_at:new Date().toISOString(),scope:'UI manual walkthrough automated in Chromium. GET/POST UI data mocked; negative HTTP checks real. No DB, Auth login or production access.',checks},null,2)+'\n');
 console.log(checks.length+' cenários PASS; quatro UI com API simulada e três HTTP negativos reais.');
})().catch(e=>{console.error(e);process.exitCode=1;});
