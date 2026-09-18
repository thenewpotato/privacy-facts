export async function boundedText(body, limit) {
 if(!body)return '';
 const reader=body.getReader();const decoder=new TextDecoder();let bytes=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;
  bytes+=value.byteLength;
  if(bytes>limit){await reader.cancel();throw new Error('Content exceeds the size limit.');}
  text+=decoder.decode(value,{stream:true});
 }return text+decoder.decode();}finally{reader.releaseLock();}
}
