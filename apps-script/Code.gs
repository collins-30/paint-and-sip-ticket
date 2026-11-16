// Paint & Sip ticketing. Bind this script to a Google Sheet (Extensions > Apps Script).
// Set Script Property PAYSTACK_SECRET (Project Settings > Script properties). Never put the secret in code.
var AMOUNT_KOBO = 16000 * 100;
var EVENT = {name:"Paint & Sip", when:"Saturday, 28 November 2026, 6:00 PM – 9:00 PM", where:"Hangar Culture Space, Lefkosa"};

function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function md5(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,s).map(function(b){return ('0'+(b&0xFF).toString(16)).slice(-2)}).join('')}

function doPost(e){
  var lock=LockService.getScriptLock();
  try{
    var ref=JSON.parse(e.postData.contents).reference;
    if(!ref||!/^[\w.\-=]+$/.test(ref)) return out({ok:false});
    var res=UrlFetchApp.fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(ref),
      {headers:{Authorization:"Bearer "+PropertiesService.getScriptProperties().getProperty("PAYSTACK_SECRET")},muteHttpExceptions:true});
    var d=(JSON.parse(res.getContentText())||{}).data;
    if(!d||d.status!=="success"||d.amount!==AMOUNT_KOBO||d.currency!=="NGN") return out({ok:false});
    lock.waitLock(20000);
    var sh=SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if(sh.getLastRow()===0) sh.appendRow(["Ticket","Name","Email","Phone","Amount (NGN)","Reference","Paid at","Checked in"]);
    var code="PS-"+md5(ref).substring(0,8).toUpperCase();
    if(sh.createTextFinder(ref).matchEntireCell(true).findNext()) return out({ok:true,code:code}); // already issued
    var f=(d.metadata&&d.metadata.custom_fields)||[],get=function(k){for(var i=0;i<f.length;i++)if(f[i].variable_name===k)return f[i].value;return ""};
    var name=get("name")||"Guest",phone=get("phone"),email=d.customer.email;
    sh.appendRow([code,name,email,phone,d.amount/100,ref,new Date(),"No"]);
    sendTicket(code,name,email);
    return out({ok:true,code:code});
  }catch(err){return out({ok:false})}
  finally{try{lock.releaseLock()}catch(x){}}
}

function sendTicket(code,name,email){
  var qr=UrlFetchApp.fetch("https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data="+encodeURIComponent(code)).getBlob().setName("qr.png");
  var html='<div style="max-width:520px;margin:auto;font-family:Arial,sans-serif;color:#3a1d1d">'
  +'<div style="background:#f98483;color:#fff;text-align:center;padding:28px 16px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:28px">'+EVENT.name+'</h1><p style="margin:6px 0 0">Wisp’s 1st Edition</p></div>'
  +'<div style="padding:20px;border:1px solid #f3d3d1;border-top:0;border-radius:0 0 12px 12px">'
  +'<p>Hi <b>'+name+'</b>!</p><p>Your ticket for <b>'+EVENT.name+'</b> is confirmed. We can’t wait to see you there.</p>'
  +'<p><b>Date:</b> '+EVENT.when+'<br><b>Venue:</b> '+EVENT.where+'<br><b>Ticket:</b> General admission (first drink on the house)<br><b>Amount:</b> ₦16,000</p>'
  +'<p style="text-align:center"><span style="display:inline-block;border:2px dashed #f4978e;border-radius:8px;padding:10px 18px;font:bold 22px monospace;letter-spacing:2px">'+code+'</span></p>'
  +'<p style="text-align:center"><img src="cid:qr" width="200" height="200" alt="QR code"></p>'
  +'<p>Present your ticket number or QR code at the entrance. Our team will scan it to confirm your attendance.</p>'
  +'<p>See you there!<br><b>The Wisp Team</b></p></div></div>';
  MailApp.sendEmail({to:email,subject:"Your ticket for "+EVENT.name+" — "+code,htmlBody:html,name:"Wisp's Workshop",inlineImages:{qr:qr}});
}
