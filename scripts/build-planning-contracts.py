"""Build the versioned planning contract catalog and synthetic examples."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCHEMAS=ROOT/"docs/schemas"
EXAMPLES=SCHEMAS/"examples"
BASE="https://github.com/TurkishKEBAB/Agentic-Ide/schemas/"

def obj(properties,required=None,**extra):
    return {"type":"object","additionalProperties":False,"required":list(properties) if required is None else required,"properties":properties,**extra}
def string(**extra):return {"type":"string","minLength":1,**extra}
def array(items,**extra):return {"type":"array","items":items,**extra}
def enum(*values):return {"type":"string","enum":list(values)}
def ref(name):return {"$ref":name+".schema.json"}
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def schema(name,body):
    value={"$schema":"https://json-schema.org/draft/2020-12/schema","$id":BASE+name+".schema.json",**body}
    write(SCHEMAS/(name+".schema.json"),value)

hash_value=string(minLength=64,maxLength=64,pattern="^[a-f0-9]{64}$")
path_value=string(pattern=r"^(?!/)(?!.*(?:^|/)\.\.?(?:/|$))(?!.*//)(?!.*/$)[^\\:\x00-\x1f]+$(?![\s\S])")
schema("contract-types",{"$defs":{
 "id":string(),"hash":hash_value,"relativePath":path_value,
 "condition":enum("A","B","C","not-applicable"),
 "versions":obj({name:string() for name in ["implementationPrompt","verificationPolicy","retrievalPolicy","safetyPolicy","taskVersion","requirementsVersion"]}),
 "model":obj({"provider":string(),"id":string(),"version":string(),"temperature":{"type":"number","minimum":0,"maximum":2}}),
}})
def shared(name):return {"$ref":"contract-types.schema.json#/$defs/"+name}

plan_properties={
 "schemaVersion":{"const":2},"planId":shared("id"),"planRevision":{"type":"integer","minimum":1},
 "runId":shared("id"),"workspaceId":shared("id"),"createdAt":string(format="date-time"),
 "condition":shared("condition"),"model":shared("model"),"versions":shared("versions"),
 "goal":string(),"requirementIds":array(string(),minItems=1,uniqueItems=True),
 "steps":array(obj({"stepId":string(),"summary":string(),"dependsOn":array(string(),uniqueItems=True)}),minItems=1),
 "affectedFiles":array(obj({"path":shared("relativePath"),"operation":enum("read","modify","create"),"reason":string()})),
 "contextSources":array(obj({"path":shared("relativePath"),"contentHash":shared("hash"),"reason":string()})),
 "riskLevel":enum("low","medium","high","blocked"),"requiresApproval":{"const":True},
 "verificationRequired":{"const":True},
}
schema("plan-v2",obj(plan_properties))
entry=obj({"path":shared("relativePath"),"operation":enum("modify","create"),
 "baseHash":{"anyOf":[shared("hash"),{"type":"null"}]},"proposedHash":shared("hash"),
 "stagedContentRef":string(),"dependencyGroup":string()},allOf=[
 {"if":{"properties":{"operation":{"const":"modify"}}},"then":{"properties":{"baseHash":shared("hash")}}},
 {"if":{"properties":{"operation":{"const":"create"}}},"then":{"properties":{"baseHash":{"type":"null"}}}},
])
schema("patch-set",obj({"schemaVersion":{"const":2},"patchSetId":shared("id"),"planId":shared("id"),
 "planRevision":{"type":"integer","minimum":1},"workspaceId":shared("id"),"fingerprint":shared("hash"),
 "safetyPolicyVersion":string(),"createdAt":string(format="date-time"),"files":array(entry,minItems=1)}))
schema("approval",obj({"schemaVersion":{"const":2},"approvalId":shared("id"),"actor":{"const":"user"},
 "workspaceId":shared("id"),"patchSetId":shared("id"),"fingerprint":shared("hash"),
 "selectedPaths":array(shared("relativePath"),minItems=1,uniqueItems=True),
 "decision":enum("approved","rejected"),"decidedAt":string(format="date-time"),"expiresAt":string(format="date-time")}))
normal_auth=obj({"kind":{"const":"human-approval"},"approvalId":shared("id")})
experimental_auth=obj({"kind":{"const":"experimental-fixture"},"fixtureId":shared("id"),"capabilityId":shared("id")})
schema("transaction",obj({"schemaVersion":{"const":2},"transactionId":shared("id"),"runId":shared("id"),
 "workspaceId":shared("id"),"patchSetId":shared("id"),"fingerprint":shared("hash"),
 "condition":enum("B","C","not-applicable"),"authorization":{"oneOf":[normal_auth,experimental_auth]},
 "state":enum("prepared","applying","committed","recovering","restored","recovery-required","rolled-back","rollback-conflict"),
 "journalRef":string(),"createdAt":string(format="date-time"),
 "files":array(obj({"path":shared("relativePath"),"beforeHash":{"anyOf":[shared("hash"),{"type":"null"}]},
   "afterHash":shared("hash"),"state":enum("staged","applied","restored","conflict"),"backupRef":{"anyOf":[string(),{"type":"null"}]}}),minItems=1)},
 allOf=[
  {"if":{"properties":{"condition":{"const":"B"}}},"then":{"properties":{"authorization":experimental_auth}}},
  {"if":{"properties":{"condition":{"enum":["C","not-applicable"]}}},"then":{"properties":{"authorization":normal_auth}}},
  {"if":{"properties":{"state":{"const":"committed"}}},"then":{"properties":{"files":{"items":{"properties":{"state":{"const":"applied"}}}}}}},
 ]))
schema("evidence",obj({"schemaVersion":{"const":2},"evidenceId":shared("id"),"runId":shared("id"),
 "patchFingerprint":shared("hash"),"treeFingerprint":shared("hash"),"recordedAt":string(format="date-time"),
 "requirementIds":array(string(),minItems=1,uniqueItems=True),"criterionIds":array(string(),minItems=1,uniqueItems=True),
 "kind":enum("policy-check","test","typecheck","lint","manual-review"),
 "producer":obj({"kind":enum("broker","external-harness","human"),"id":string(),"version":string()}),
 "verdict":enum("passed","failed","not-run"),"artifactRef":string(),"versions":shared("versions")},
 allOf=[{"if":{"properties":{"kind":{"enum":["test","typecheck","lint"]}}},"then":{"properties":{"producer":{"properties":{"kind":{"const":"external-harness"}}}}}}]))
events=["run_started","run_cancelled","plan_created","file_read","retrieval_query","diff_created",
 "approval_requested","approval_decision","write_attempted","write_blocked","write_applied","rollback_applied","safety_warning",
 "transaction_prepared","transaction_committed","transaction_failed","recovery_started","recovery_completed","rollback_conflict","verification_recorded"]
audit_props={"schemaVersion":{"const":2},"eventId":shared("id"),"timestamp":string(format="date-time"),
 "eventType":enum(*events),"runId":shared("id"),"condition":shared("condition"),"workspaceId":shared("id"),
 "actor":enum("user","agent","system","external-harness"),"decision":enum("none","approved","rejected","blocked","rolled-back"),
 "versions":shared("versions"),"planId":shared("id"),"patchSetId":shared("id"),"approvalId":shared("id"),
 "transactionId":shared("id"),"evidenceId":shared("id"),"targetPath":shared("relativePath"),"model":shared("model"),
 "metadata":obj({"reasonCode":string(),"durationMs":{"type":"number","minimum":0},"inputTokens":{"type":"integer","minimum":0},"outputTokens":{"type":"integer","minimum":0}},required=[])}
schema("audit-event-v2",obj(audit_props,required=["schemaVersion","eventId","timestamp","eventType","runId","condition","workspaceId","actor","decision","versions"],allOf=[
 {"if":{"properties":{"eventType":{"enum":["transaction_prepared","transaction_committed","transaction_failed","recovery_started","recovery_completed","rollback_conflict","rollback_applied"]}}},"then":{"required":["transactionId","patchSetId"]}},
 {"if":{"properties":{"eventType":{"const":"verification_recorded"}}},"then":{"required":["evidenceId","patchSetId"]}},
 {"if":{"properties":{"eventType":{"const":"approval_decision"}}},"then":{"required":["approvalId","patchSetId"],"properties":{"actor":{"const":"user"},"decision":{"enum":["approved","rejected"]}}}},
 {"if":{"properties":{"eventType":{"const":"write_blocked"}}},"then":{"properties":{"decision":{"const":"blocked"}}}},
]))

nullable_number={"anyOf":[{"type":"number","minimum":0},{"type":"null"}]}
schema("benchmark-run",obj({
 "schemaVersion":{"const":1},"runId":string(),"taskId":string(),"taskCategory":{"$ref":"benchmark-task.schema.json#/properties/category"},
 "condition":enum("A","B","C"),"status":enum("not-run","completed","failed","timeout","cancelled"),
 "fixtureCommit":string(minLength=40,maxLength=40,pattern="^[a-f0-9]{40}$"),"protocolVersion":string(),"versions":shared("versions"),"model":shared("model"),
 "operatorPseudonym":string(),"repeatIndex":{"type":"integer","minimum":1},"randomizationSeed":{"type":"integer","minimum":0},
 "budget":obj({"maxIterations":{"type":"integer","minimum":1},"maxInputTokens":{"type":"integer","minimum":1},"maxWallClockSeconds":{"type":"integer","minimum":1}}),
 "candidateFingerprint":{"anyOf":[shared("hash"),{"type":"null"}]},"finalFingerprint":{"anyOf":[shared("hash"),{"type":"null"}]},
 "score":{"anyOf":[{"type":"integer","enum":[0,1,2]},{"type":"null"}]},
 "humanDecision":enum("approved","rejected","revised","not-presented","not-applicable","not-run"),
 "metrics":obj({"totalMs":nullable_number,"reviewMs":nullable_number,"ttftMs":nullable_number,"inputTokens":nullable_number,"outputTokens":nullable_number,"estimatedCost":nullable_number,"appliedPolicyViolations":nullable_number}),
 "criterionResults":array(obj({"criterionId":string(),"verdict":enum("passed","failed","not-run"),"evidenceId":string()})),
 "deviations":array(string()),"failureReason":{"anyOf":[string(),{"type":"null"}]},
},allOf=[
 {"if":{"properties":{"status":{"const":"not-run"}}},"then":{"properties":{"score":{"type":"null"},"humanDecision":{"const":"not-run"},"candidateFingerprint":{"type":"null"},"finalFingerprint":{"type":"null"}}}},
 {"if":{"properties":{"status":{"const":"completed"}}},"then":{"properties":{"score":{"type":"integer","enum":[0,1,2]},"criterionResults":{"minItems":1}}}},
 {"if":{"properties":{"taskCategory":{"const":"codebase-qa"},"status":{"const":"completed"}}},"then":{"properties":{"humanDecision":{"const":"not-applicable"},"candidateFingerprint":{"type":"null"},"finalFingerprint":{"type":"null"}}}},
]))

versions={key:"example@1" for key in ["implementationPrompt","verificationPolicy","retrievalPolicy","safetyPolicy","taskVersion","requirementsVersion"]}
model={"provider":"synthetic","id":"fixture-model","version":"example@1","temperature":0}
now="2026-11-04T12:00:00Z"
base=hashlib.sha256(b"export const total = 1;\n").hexdigest()
proposed=hashlib.sha256(b"export const total = 2;\n").hexdigest()
plan={"schemaVersion":2,"planId":"plan-example","planRevision":1,"runId":"run-example","workspaceId":"workspace-example","createdAt":now,
 "condition":"C","model":model,"versions":versions,"goal":"Synthetic contract example: update a constant.",
 "requirementIds":["req-agent-plan-first"],"steps":[{"stepId":"s1","summary":"Change total constant.","dependsOn":[]}],
 "affectedFiles":[{"path":"src/total.ts","operation":"modify","reason":"Synthetic acceptance criterion."}],
 "contextSources":[{"path":"src/total.ts","contentHash":base,"reason":"Current constant."}],"riskLevel":"low","requiresApproval":True,"verificationRequired":True}
patch={"schemaVersion":2,"patchSetId":"patch-example","planId":"plan-example","planRevision":1,"workspaceId":"workspace-example",
 "fingerprint":"0"*64,"safetyPolicyVersion":"example@1","createdAt":now,
 "files":[{"path":"src/total.ts","operation":"modify","baseHash":base,"proposedHash":proposed,"stagedContentRef":"stage-example","dependencyGroup":"group-1"}]}
projection={"planId":patch["planId"],"planRevision":patch["planRevision"],"workspaceId":patch["workspaceId"],"safetyPolicyVersion":patch["safetyPolicyVersion"],
 "files":[{k:x[k] for k in ["path","operation","baseHash","proposedHash","dependencyGroup"]} for x in sorted(patch["files"],key=lambda f:f["path"].encode("utf-8"))]}
patch["fingerprint"]=hashlib.sha256(json.dumps(projection,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")).hexdigest()
approval={"schemaVersion":2,"approvalId":"approval-example","actor":"user","workspaceId":"workspace-example","patchSetId":"patch-example",
 "fingerprint":patch["fingerprint"],"selectedPaths":["src/total.ts"],"decision":"approved","decidedAt":now,"expiresAt":"2026-11-04T12:10:00Z"}
transaction={"schemaVersion":2,"transactionId":"transaction-example","runId":"run-example","workspaceId":"workspace-example","patchSetId":"patch-example",
 "fingerprint":patch["fingerprint"],"condition":"C","authorization":{"kind":"human-approval","approvalId":"approval-example"},"state":"committed",
 "journalRef":"journal-example","createdAt":now,"files":[{"path":"src/total.ts","beforeHash":base,"afterHash":proposed,"state":"applied","backupRef":"backup-example"}]}
evidence={"schemaVersion":2,"evidenceId":"evidence-example","runId":"run-example","patchFingerprint":patch["fingerprint"],"treeFingerprint":proposed,
 "recordedAt":now,"requirementIds":["req-agent-plan-first"],"criterionIds":["criterion-1"],"kind":"test",
 "producer":{"kind":"external-harness","id":"synthetic-runner","version":"example@1"},"verdict":"not-run","artifactRef":"synthetic-not-executed","versions":versions}
audit={"schemaVersion":2,"eventId":"event-example","timestamp":now,"eventType":"transaction_committed","runId":"run-example","condition":"C",
 "workspaceId":"workspace-example","actor":"system","decision":"none","versions":versions,"patchSetId":"patch-example","transactionId":"transaction-example"}
for name,value in {"plan-v2":plan,"patch-set":patch,"approval":approval,"transaction":transaction,"evidence":evidence,"audit-event-v2":audit}.items():write(EXAMPLES/(name+".json"),value)
run={"schemaVersion":1,"runId":"synthetic-not-executed","taskId":"pilot-single","taskCategory":"safe-single-file-edit","condition":"C","status":"not-run",
 "fixtureCommit":"0"*40,"protocolVersion":"draft-example","versions":versions,"model":model,"operatorPseudonym":"not-recruited","repeatIndex":1,"randomizationSeed":1,
 "budget":{"maxIterations":2,"maxInputTokens":8000,"maxWallClockSeconds":1200},"candidateFingerprint":None,"finalFingerprint":None,"score":None,"humanDecision":"not-run",
 "metrics":{key:None for key in ["totalMs","reviewMs","ttftMs","inputTokens","outputTokens","estimatedCost","appliedPolicyViolations"]},"criterionResults":[],"deviations":[],"failureReason":None}
write(EXAMPLES/"benchmark-run.json",run)
print("Built 8 contract schemas and 7 explicitly synthetic examples.")
