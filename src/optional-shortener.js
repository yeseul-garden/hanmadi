  let originalParticipantUrl='',shortenRequest=0;
  const shortenedParticipantLinks=new Map();
  function resetOptionalShortening(available){
    shortenRequest++;$('#share-copy').disabled=false;originalParticipantUrl='';$('#share-shorten').checked=false;$('#share-shorten').disabled=!available;
    $('#share-shorten').parentElement.hidden=!available;$('#share-shorten-note').hidden=!available;
  }
  function displayParticipantLink(url){
    activeShareUrl=url;$('#share-url').value=url;activeQrData='';$('#participant-qr').hidden=true;$('#share-download').disabled=true;
    try{activeQrData=qrDataUrl(url);$('#participant-qr').src=activeQrData;$('#participant-qr').hidden=false;$('#share-download').disabled=false;}
    catch{$('#share-dialog-status').textContent=sheetText('QR을 만들지 못했습니다. 링크는 복사할 수 있습니다.');}
  }
  async function shortenParticipantLink(url,signal){
    const response=await fetch('https://is.gd/create.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({format:'json',url}).toString(),credentials:'omit',referrerPolicy:'no-referrer',signal});
    const data=await response.json();if(!response.ok||data.errorcode||typeof data.shorturl!=='string')throw new Error('SHORTEN_FAILED');
    const result=new URL(data.shorturl);if(result.origin!=='https://is.gd'||!/^\/[A-Za-z0-9_]+$/.test(result.pathname)||result.search||result.hash)throw new Error('INVALID_SHORT_URL');
    return result.href;
  }
  $('#share-shorten').onchange=async()=>{
    const request=++shortenRequest,original=originalParticipantUrl;if(!original)return;
    if(!$('#share-shorten').checked){$('#share-copy').disabled=false;displayParticipantLink(original);$('#share-dialog-status').textContent=sheetText('원래 링크를 사용합니다.');translateChrome();return;}
    if(shortenedParticipantLinks.has(original)){displayParticipantLink(shortenedParticipantLinks.get(original));$('#share-dialog-status').textContent=sheetText('짧은 링크와 QR이 준비되었습니다.');translateChrome();return;}
    $('#share-dialog-status').textContent=sheetText('링크를 짧게 만드는 중…');$('#share-copy').disabled=true;$('#share-download').disabled=true;translateChrome();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{const short=await shortenParticipantLink(original,controller.signal);shortenedParticipantLinks.set(original,short);if(request!==shortenRequest||!$('#share-dialog').open)return;displayParticipantLink(short);$('#share-dialog-status').textContent=sheetText('짧은 링크와 QR이 준비되었습니다.');}
    catch{if(request!==shortenRequest||!$('#share-dialog').open)return;$('#share-shorten').checked=false;displayParticipantLink(original);$('#share-dialog-status').textContent=sheetText('링크를 줄이지 못했습니다. 원래 링크와 QR은 그대로 사용할 수 있습니다. 다시 선택하면 재시도합니다.');}
    finally{clearTimeout(timer);if(request===shortenRequest){$('#share-copy').disabled=false;translateChrome();}}
  };
  $('#share-dialog').addEventListener('close',()=>{shortenRequest++;$('#share-copy').disabled=false;});
