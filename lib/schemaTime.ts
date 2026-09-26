/** Convert display hours to the 24-hour HH:mm value expected in structured data. */
export function schemaTime(value:string|undefined):string|undefined {
  const match=value?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if(!match)return undefined;
  let hour=Number(match[1]);const minute=Number(match[2]||0);const meridian=match[3]?.toUpperCase();
  if(minute>59||hour>(meridian?12:23)||(meridian&&hour<1))return undefined;
  if(meridian)hour=hour%12+(meridian==='PM'?12:0);
  return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
}
