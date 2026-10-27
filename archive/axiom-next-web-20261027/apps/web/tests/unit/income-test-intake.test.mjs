import assert from "node:assert/strict";
import test from "node:test";
import { parseIncomeTestRequest, incomeTestSubmissionIdentity } from "../../lib/leads/income-test-request.ts";
import { acceptIncomeTest } from "../../lib/leads/income-test-service.ts";
import { handleIncomeTestPost } from "../../lib/leads/income-test-http.ts";

const version = "privacy-notice-2026-10-05";
const requestId = "16cddaba-362a-4b0e-81af-5a2782759cf4";
const receiptId = "26cddaba-362a-4b0e-81af-5a2782759cf4";
const data = () => ({intent:"email_result",name:" Jana ",email:" jana@example.test ",calculation:{incomeA:45000,incomeB:35000,mortgagePayment:25000,essentialCosts:25000,reserve:180000,targetMonths:6},privacyNoticeVersion:version,requestId,submittedAt:new Date().toISOString()});

test("two explicit intents preserve phone requirement only for callback and normalize validated inputs",()=>{
 const raw=data();const parsed=parseIncomeTestRequest(raw,version);assert.ok(parsed);assert.equal(parsed.name,"Jana");assert.equal(parsed.calculation.remainingIncomeA,0);
 for(const extra of [{phone:""},{preferredCallTime:""},{note:""},{workspaceId:requestId},{result:{deficit:0}}])assert.equal(parseIncomeTestRequest({...raw,...extra},version),null);
 assert.equal(parseIncomeTestRequest({...raw,intent:"callback"},version),null);
 const callback=parseIncomeTestRequest({...raw,intent:"callback",phone:"+420 123 456 789",preferredCallTime:"afternoon",note:" Dotaz "},version);assert.equal(callback.phone,"+420123456789");assert.equal(callback.note,"Dotaz");
 for(const extra of [{intent:"marketing"},{name:"A\nB"},{email:"bad"},{privacyNoticeVersion:"old"},{requestId:"bad"},{submittedAt:new Date(Date.now()-31*60000).toISOString()},{calculation:{...raw.calculation,reserve:-1}},{calculation:{...raw.calculation,results:123}}])assert.equal(parseIncomeTestRequest({...raw,...extra},version),null);
});
test("retries keep identity only for same normalized input/contact/action",()=>{
 const raw=data();const id=incomeTestSubmissionIdentity(null,raw,()=>requestId);assert.equal(incomeTestSubmissionIdentity(id,raw),id);
 assert.equal(incomeTestSubmissionIdentity(id,{...raw,name:"Jana"}),id);
 for(const changed of [{...raw,calculation:{...raw.calculation,reserve:1}},{...raw,email:"other@example.test"},{...raw,intent:"callback",phone:"123456789"}])assert.notEqual(incomeTestSubmissionIdentity(id,changed).requestId,requestId);
});
test("early callback omits calculation while null, drafts and result-email without calculation fail closed",()=>{
 const {calculation,...base}=data();
 const early={...base,intent:"callback",phone:"+420 123 456 789"};
 const parsed=parseIncomeTestRequest(early,version);
 assert.ok(parsed);assert.equal(Object.hasOwn(parsed,"calculation"),false);assert.equal(parsed.phone,"+420123456789");
 assert.equal(parseIncomeTestRequest(base,version),null);
 for(const patch of [{phone:""},{email:""},{name:""},{calculation:null},{calculation:undefined},{calculation:{}},{calculation:{incomeA:45000}},{reserve:180000},{draft:calculation}]){
  assert.equal(parseIncomeTestRequest({...early,...patch},version),null);
 }
 const identity=incomeTestSubmissionIdentity(null,early,()=>requestId);
 assert.equal(incomeTestSubmissionIdentity(identity,{...early,phone:"+420123456789"}),identity);
 const complete=incomeTestSubmissionIdentity(identity,{...early,calculation},()=>receiptId);
 assert.equal(complete.requestId,receiptId);assert.notEqual(complete.key,identity.key);
 assert.notEqual(incomeTestSubmissionIdentity(complete,early,()=>requestId).key,complete.key);
});
test("early callback transport contains source/contact only and retains ordinary authority",async()=>{
 const {calculation,...base}=data();let sent;
 const request=parseIncomeTestRequest({...base,intent:"callback",phone:"123456789",note:"Dotaz"},version);
 const intake={submit:async(command)=>{sent=command;return{schema_version:1,status:"accepted",receipt_id:receiptId,intent:"housing",request_kind:"callback",masked_phone:"••• 789",confirmation_email_status:"queued"}}};
 assert.deepEqual(await acceptIncomeTest(request,{publicHostname:"pokornydavid.cz",intake}),{status:"accepted",receiptId,intent:"callback",delivery:"queued"});
 assert.deepEqual(sent.income_test,{action:"callback"});assert.equal(sent.form_id,"income-test");assert.equal(sent.source_context,"funnel");assert.equal(sent.source_cta,"income-test-callback");assert.equal(sent.phone,"123456789");
 for(const financial of ["calculation","input","income_a","reserve","result"]) assert.equal(JSON.stringify(sent).includes(`\"${financial}\"`),false);
 assert.deepEqual(await acceptIncomeTest({...request,intent:"email_result"},{publicHostname:"pokornydavid.cz",intake}),{status:"error",reason:"invalid"});
});
test("HTTP accepts a contact-only callback, preserving omitted financial input",async()=>{
 const {calculation,...base}=data();let sent;
 const dependencies={noticeVersion:version,submit:async(request)=>{sent=request;return{status:"accepted",receiptId,intent:"callback",delivery:"queued"}}};
 const request=(body)=>new Request("https://pokornydavid.cz/api/income-test/",{method:"POST",headers:{host:"pokornydavid.cz",origin:"https://pokornydavid.cz","content-type":"application/json"},body:JSON.stringify(body)});
 const early={...base,intent:"callback",phone:"123456789"};
 assert.equal((await handleIncomeTestPost(request(early),dependencies)).status,201);assert.equal(Object.hasOwn(sent,"calculation"),false);
 for(const bad of [base,{...early,calculation:null},{...early,calculation:{incomeA:45000}}])assert.equal((await handleIncomeTestPost(request(bad),dependencies)).status,400);
});
test("wire uses canonical authority and typed inputs only; receipt cannot silently change action",async()=>{
 for(const intent of ["email_result","callback"]){
 const request=parseIncomeTestRequest({...data(),intent,...(intent==="callback"?{phone:"123456789"}:{})},version);let sent;
 const receipt={schema_version:1,status:"accepted",receipt_id:receiptId,intent:"housing",request_kind:intent,masked_phone:intent==="callback"?"••• 789":"",confirmation_email_status:"queued"};
 const intake={submit:async(command)=>{sent=command;return receipt}};
 assert.deepEqual(await acceptIncomeTest(request,{publicHostname:"pokornydavid.cz",intake}),{status:"accepted",receiptId,intent,delivery:"queued"});
 assert.equal(sent.form_id,"income-test");assert.equal(sent.income_test.input.reserve,180000);assert.equal(sent.phone,intent==="callback"?"123456789":"");assert.equal(sent.intent,"housing");assert.equal(sent.income_test.input.remaining_income_a,0);assert.equal("result" in sent.income_test,false);
 receipt.request_kind="other";assert.deepEqual(await acceptIncomeTest(request,{publicHostname:"pokornydavid.cz",intake}),{status:"error",reason:"unavailable"});
 }
});
test("HTTP enforces same origin, bounded JSON, no query answers and generic private failure",async()=>{
 let calls=0;const dependencies={noticeVersion:version,submit:async()=>{calls++;return{status:"accepted",receiptId,intent:"email_result",delivery:"queued"}}};
 const request=(body=data(),headers={},url="https://pokornydavid.cz/api/income-test/")=>new Request(url,{method:"POST",headers:{host:"pokornydavid.cz",origin:"https://pokornydavid.cz","content-type":"application/json",...headers},body:JSON.stringify(body)});
 assert.equal((await handleIncomeTestPost(request(),dependencies)).status,201);
 for(const req of [request(data(),{origin:"https://evil.test"}),request(data(),{"content-type":"text/plain"}),request(data(),{},"https://pokornydavid.cz/api/income-test/?reserve=180000"),request({...data(),note:"x".repeat(9000)})])assert.equal((await handleIncomeTestPost(req,dependencies)).status,400);
 assert.equal(calls,1);
 const failure=await handleIncomeTestPost(request(),{...dependencies,submit:async()=>{throw Error("secret financial input")}});assert.equal(failure.status,503);assert.equal((await failure.text()).includes("secret"),false);
});
