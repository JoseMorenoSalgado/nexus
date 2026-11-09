/** Shared validation for the independent CRM's contact details. */
export function parseLeadContact(input:Record<string,unknown>){
 const name=typeof input.name==="string"?input.name.trim():"";
 const phone=typeof input.phone==="string"?input.phone.trim():"";
 const email=typeof input.email==="string"?input.email.trim():"";
 const message=typeof input.message==="string"?input.message.trim():"";
 if(name.length<2||name.length>120||!/^[+\d() -]{7,30}$/.test(phone)||
  email.length>180||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||message.length>2000)return null;
 return {name,phone,email:email||null,message:message||null};
}
