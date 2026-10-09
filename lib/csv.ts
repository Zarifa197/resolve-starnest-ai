export type CsvData = {headers:string[];rows:Record<string,string>[]};
export function parseCsv(input:string):CsvData {
 const text=input.replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/)[0];const delimiter=first.split(';').length>first.split(',').length?';':',';
 const records:string[][]=[];let row:string[]=[];let field='';let quoted=false;let closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
  if(c==='"'){if(field||closed)throw Error('Invalid CSV quotation marks.');quoted=true;continue}
  if(c===delimiter){row.push(field);field='';closed=false;continue}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))records.push(row);row=[];field='';closed=false;continue}
  if(closed&&c.trim())throw Error('Unexpected character after a closing CSV quotation mark.');if(!closed)field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quotation mark.');row.push(field);if(row.some(x=>x.trim()))records.push(row);
 if(records.length<2)throw Error('CSV must contain a header and at least one data row.');
 const headers=records[0].map(x=>x.trim());if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('Column names cannot be empty or duplicated.');
 if(records.length>10001)throw Error('An import can contain at most 10,000 rows.');
 return {headers,rows:records.slice(1).map((r,i)=>{if(r.length!==headers.length)throw Error(`Column count does not match on row ${i+2}.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]))})};
}
export type ImportedCustomer={customerId:string;name:string;signal:string;context:Record<string,string>};
export function normalizeCsv(data:CsvData,mapping:{id:string;name?:string;signal?:string}):ImportedCustomer[]{
 if(!data.headers.includes(mapping.id))throw Error('Select the customer ID column.');
 const ids=new Set<string>();
 return data.rows.map((row,index)=>{const id=row[mapping.id]?.trim();if(!id||id.length>160)throw Error(`Customer ID is missing or too long on row ${index+2}.`);if(ids.has(id))throw Error(`Duplicate customer ID: ${id}. Use one row per customer in each import.`);ids.add(id);
 const signal=(mapping.signal?row[mapping.signal]:'profile_review')||'profile_review';
 const context:Record<string,string>={};for(const key of ['tenure','Contract','MonthlyCharges','TechSupport','InternetService','error_code','last_active_days','message']){if(row[key])context[key]=row[key].slice(0,1000)}
 return {customerId:id,name:(mapping.name?row[mapping.name]:id)||id,signal:signal.slice(0,100),context};
 });
}
