type Query={sql:string;params:unknown[]};
type Result={success:boolean;results:Record<string,unknown>[];meta:{changes:number}};
export function d1Http(account:string,database:string,token:string,transport:typeof fetch=fetch){
 if(!/^[a-f0-9]{32}$/i.test(account)||! /^[\da-f-]{36}$/i.test(database))throw Error('Invalid remote D1 configuration.');
 const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`;
 async function query(batch:Query[]){const r=await transport(endpoint,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({batch})});const b=await r.json() as {success:boolean;result?:Result[]};if(!r.ok||!b.success||!b.result?.every(v=>v.success))throw Error('Remote persistent database query failed.');return b.result;}
 function prepare(sql:string,params:unknown[]=[]){return {sql,params,bind(...values:unknown[]){return prepare(sql,values)},async all(){return (await query([{sql,params}]))[0]},async run(){return (await query([{sql,params}]))[0]},async first(column?:string){const value=(await query([{sql,params}]))[0].results[0]||null;return column?value?.[column]??null:value},async raw(){return (await query([{sql,params}]))[0].results.map(row=>Object.values(row))}};}
 return {prepare,async batch(statements:ReturnType<typeof prepare>[]){return query(statements.map(s=>({sql:s.sql,params:s.params})))}} as unknown as D1Database;
}
