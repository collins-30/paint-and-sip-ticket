// Paint & Sip registrations + tickets. Bind to a Google Sheet (Extensions > Apps Script).
// Columns: A Ticket/Reference | B Name | C Email | D WhatsApp | E Registered | F Status | G Ticket sent | H Checked in
var EVENT = {name:"Paint & Sip", when:"Saturday, 28 November 2026, 6:00 PM – 9:00 PM", where:"Hangar Culture Space, Lefkosa", price:"₦16,000"};
var STATUS_COL = 6;

function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function safe(s){s=String(s).trim().substring(0,120);return /^[=+\-@]/.test(s)?"'"+s:s}
function sheet(){return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]}

// Run once from the editor: sets headers, the Pending/Paid dropdown and the email trigger.
function setup(){
  var sh=sheet();
  if(sh.getLastRow()===0) sh.appendRow(["Ticket","Name","Email","WhatsApp","Registered","Status","Ticket sent","Checked in"]);
  sh.setFrozenRows(1);
  sh.getRange(2,STATUS_COL,1000,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["Pending","Paid"],true).build());
  sh.getRange(2,8,1000,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["No","Yes"],true).build());
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()==="onStatusEdit")ScriptApp.deleteTrigger(t)});
  ScriptApp.newTrigger("onStatusEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

function doPost(e){
  var lock=LockService.getScriptLock();
  try{
    var d=JSON.parse(e.postData.contents);
    if(d.action==="checkin") return checkin(d,lock);
    if(d.action!=="register") return out({ok:false});
    var name=String(d.name||"").trim(),email=String(d.email||"").trim(),phone=String(d.phone||"").trim();
    if(!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||phone.length<7) return out({ok:false});
    lock.waitLock(20000);
    var sh=sheet(),chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",ref;
    do{ref="PS-";for(var i=0;i<6;i++)ref+=chars[Math.floor(Math.random()*chars.length)]}
    while(sh.createTextFinder(ref).matchEntireCell(true).findNext());
    sh.appendRow([ref,safe(name),safe(email),safe(phone),new Date(),"Pending","","No"]);
    return out({ok:true,ref:ref});
  }catch(err){return out({ok:false})}
  finally{try{lock.releaseLock()}catch(x){}}
}

// Fires when the client changes Status to "Paid" in the Sheet.
function onStatusEdit(e){
  var r=e.range;
  if(r.getSheet().getIndex()!==1||r.getColumn()!==STATUS_COL||r.getRow()<2||r.getNumRows()!==1) return;
  if(String(r.getValue())!=="Paid") return;
  var sh=r.getSheet(),row=sh.getRange(r.getRow(),1,1,7).getValues()[0];
  if(row[6]) return; // ticket already sent
  try{
    sendTicket(row[0],row[1],row[2]);
    sh.getRange(r.getRow(),7).setValue(new Date());
  }catch(err){
    sh.getRange(r.getRow(),7).setValue("EMAIL FAILED – set Status to Pending then Paid again");
  }
}

function sendTicket(code,name,email){
  var qr=UrlFetchApp.fetch("https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data="+encodeURIComponent(code)).getBlob().setName("qr.png");
  var html='<div style="max-width:520px;margin:auto;font-family:Arial,sans-serif;color:#3a1d1d">'
  +'<div style="background:#f98483;color:#fff;text-align:center;padding:28px 16px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:28px">'+EVENT.name+'</h1><p style="margin:6px 0 0">Wisp’s 1st Edition</p></div>'
  +'<div style="padding:20px;border:1px solid #f3d3d1;border-top:0;border-radius:0 0 12px 12px">'
  +'<p>Hi <b>'+esc(name)+'</b>!</p><p>Your payment is confirmed and your ticket for <b>'+EVENT.name+'</b> is ready. We can’t wait to see you there.</p>'
  +'<p><b>Date:</b> '+EVENT.when+'<br><b>Venue:</b> '+EVENT.where+'<br><b>Ticket:</b> General admission (first drink on the house)<br><b>Amount:</b> '+EVENT.price+'</p>'
  +'<p style="text-align:center"><span style="display:inline-block;border:2px dashed #f4978e;border-radius:8px;padding:10px 18px;font:bold 22px monospace;letter-spacing:2px">'+code+'</span></p>'
  +'<p style="text-align:center"><img src="cid:qr" width="200" height="200" alt="QR code"></p>'
  +'<p>Show this QR code or your ticket number at the entrance. Our team will scan it to confirm your attendance.</p>'
  +'<p>See you there!<br><b>The Wisp Team</b></p></div></div>';
  MailApp.sendEmail({to:email,subject:"Your ticket for "+EVENT.name+" — "+code,htmlBody:html,name:"Wisp's Workshop",inlineImages:{qr:qr}});
}

// Door check-in. Needs Script Property CHECKIN_PIN (Project Settings > Script properties).
function checkin(d,lock){
  var pin=PropertiesService.getScriptProperties().getProperty("CHECKIN_PIN");
  if(!pin||String(d.pin)!==pin) return out({ok:false,result:"badpin"});
  var code=String(d.code||"").trim().toUpperCase();
  if(!/^PS-[A-Z0-9]{6}$/.test(code)) return out({ok:true,result:"invalid"});
  lock.waitLock(20000);
  var sh=sheet(),f=sh.createTextFinder(code).matchEntireCell(true).findNext();
  if(!f||f.getColumn()!==1||f.getRow()<2) return out({ok:true,result:"invalid"});
  var row=sh.getRange(f.getRow(),1,1,8).getValues()[0],info={ok:true,code:code,name:row[1]};
  if(row[5]!=="Paid"){info.result="unpaid";return out(info)}
  if(row[7]==="Yes"){info.result="used";return out(info)}
  sh.getRange(f.getRow(),8).setValue("Yes");
  info.result="valid";return out(info);
}
