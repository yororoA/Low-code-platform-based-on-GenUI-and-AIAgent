export function strToHexStr(str: string): string {
  return new TextEncoder().encode(str)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
}

export function generateHexId():string{
  let id:string = '';
  for(let i=0; i<32; i++){
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}