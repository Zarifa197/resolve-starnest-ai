export const SCENARIOS = ['format','price','unknown','server'] as const;
export type Scenario = typeof SCENARIOS[number];
export type Strategy = 'show_guide'|'recommend_plan'|'ask_user'|'create_support_ticket'|'wait';
export type Decision = {tool:Strategy;reason:string;strategy:string;action:string;message:string};
export function decide(scenario:Scenario, outcome?:string):Decision {
 if(outcome==='not_helpful')return {tool:'create_support_ticket',reason:'The customer reported that the suggested solution did not help.',strategy:'Escalate to the support team',action:'An internal support request was created with the event and previous intervention.',message:'This step did not resolve the issue. The details were added to an internal support request visible in this dashboard.'};
 const decisions:Record<Scenario,Decision>={
 format:{tool:'show_guide',reason:'The upload event recorded an unsupported_format error.',strategy:'Guidance on supported formats',action:'CSV guidance and a sample file were presented.',message:'This file format is not supported. Resolve accepts CSV in this demo workflow. Save the file as CSV and upload it again. Include name and email columns.'},
 price:{tool:'recommend_plan',reason:'The customer explicitly raised a pricing concern.',strategy:'Present a more suitable plan',action:'The Starter plan from the demo catalogue was suggested. No plan was changed.',message:'In the demo catalogue, Starter costs $9 per month for 3 projects, and Pro costs $29 for 20 projects. No plan is changed without confirmation.'},
 unknown:{tool:'ask_user',reason:'Onboarding stopped, but no error or explanation establishes the cause.',strategy:'Ask the customer about the cause',action:'A clarifying question was presented.',message:'What is preventing you from continuing? Is it an upload issue, pricing, or a technical error?'},
 server:{tool:'create_support_ticket',reason:'The operation ended with server_error (HTTP 500). This is a server fault.',strategy:'Escalate to technical support',action:'An internal support request was created with the error context.',message:'A technical error was recorded and an internal support request was opened. The request is stored in this dashboard and is not sent to an external support service.'}
 };return decisions[scenario];
}
