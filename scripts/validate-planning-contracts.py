"""Validate schemas, planning records, requirement graph and unsafe contract cases.

Run: uv run --with-requirements scripts/requirements-planning.txt python scripts/validate-planning-contracts.py
This validates contracts, not the absent Electron application's runtime behavior.
"""
import copy
import hashlib
import json
from datetime import datetime
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker, ValidationError
from referencing import Registry, Resource

ROOT=Path(__file__).resolve().parents[1]
SCHEMAS=ROOT/"docs/schemas"
schemas={path.stem.replace(".schema",""):json.loads(path.read_text(encoding="utf-8-sig")) for path in SCHEMAS.glob("*.schema.json")}
registry=Registry().with_resources((schema["$id"],Resource.from_contents(schema)) for schema in schemas.values())
for schema in schemas.values():Draft202012Validator.check_schema(schema)
def validate(name,value):Draft202012Validator(schemas[name],registry=registry,format_checker=FormatChecker()).validate(value)

def fingerprint(patch):
    projection={key:patch[key] for key in ["planId","planRevision","workspaceId","safetyPolicyVersion"]}
    projection["files"]=[{key:item[key] for key in ["path","operation","baseHash","proposedHash","dependencyGroup"]} for item in sorted(patch["files"],key=lambda f:f["path"].encode("utf-8"))]
    return hashlib.sha256(json.dumps(projection,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")).hexdigest()

def invariant(condition,message):
    if not condition:raise ValueError(message)

def validate_bundle(bundle):
    for name,value in bundle.items():validate(name,value)
    plan,patch,approval,tx,evidence,audit=[bundle[name] for name in ["plan-v2","patch-set","approval","transaction","evidence","audit-event-v2"]]
    invariant(patch["fingerprint"]==fingerprint(patch),"Patch fingerprint does not bind the recorded content/policy.")
    invariant((patch["planId"],patch["planRevision"])==(plan["planId"],plan["planRevision"]),"Stale plan revision.")
    invariant(all(value["workspaceId"]==plan["workspaceId"] for value in [patch,approval,tx,audit]),"Cross-workspace record.")
    invariant(all(value["runId"]==plan["runId"] for value in [tx,evidence,audit]),"Cross-run record.")
    invariant(all(value["patchSetId"]==patch["patchSetId"] for value in [approval,tx,audit]),"Cross-patch record.")
    invariant(all(value["fingerprint"]==patch["fingerprint"] for value in [approval,tx]),"Stale approval or transaction.")
    invariant(evidence["patchFingerprint"]==patch["fingerprint"],"Evidence belongs to another patch.")
    invariant(evidence["versions"]==plan["versions"]==audit["versions"],"Version manifests disagree.")
    invariant(patch["safetyPolicyVersion"]==plan["versions"]["safetyPolicy"],"Stale safety policy.")
    invariant(audit["transactionId"]==tx["transactionId"],"Audit transaction mismatch.")
    invariant(plan["condition"]==tx["condition"]==audit["condition"],"Experimental condition drift.")
    files={item["path"]:item for item in patch["files"]}
    invariant(len(files)==len(patch["files"]),"Duplicate patch path.")
    allowed={item["path"]:item["operation"] for item in plan["affectedFiles"]}
    invariant(all(allowed.get(path)==entry["operation"] for path,entry in files.items()),"Patch exceeds plan scope.")
    selected=set(approval["selectedPaths"])
    invariant(selected<=set(files),"Approval selects an unknown path.")
    for item in files.values():
        if item["path"] in selected:
            group={entry["path"] for entry in files.values() if entry["dependencyGroup"]==item["dependencyGroup"]}
            invariant(group<=selected,"Partial selection splits a dependency group.")
    invariant({item["path"] for item in tx["files"]}==selected,"Transaction exceeds approved scope.")
    invariant(len(tx["files"])==len(selected),"Duplicate transaction path.")
    for item in tx["files"]:
        entry=files[item["path"]]
        invariant((item["beforeHash"],item["afterHash"])==(entry["baseHash"],entry["proposedHash"]),"Transaction hashes disagree.")
        invariant(entry["operation"]!="modify" or item["backupRef"] is not None,"Modify transaction has no backup reference.")
    decided=datetime.fromisoformat(approval["decidedAt"].replace("Z","+00:00"))
    expires=datetime.fromisoformat(approval["expiresAt"].replace("Z","+00:00"))
    started=datetime.fromisoformat(tx["createdAt"].replace("Z","+00:00"))
    invariant(0<(expires-decided).total_seconds()<=600,"Approval expiry exceeds 10 minutes.")
    if tx["condition"]!="B":
        invariant(approval["decision"]=="approved","Rejected patch cannot apply.")
        invariant(tx["authorization"]["approvalId"]==approval["approvalId"],"Authorization references another approval.")
        invariant(decided<=started<expires,"Approval expired or not yet granted at apply.")
    return True

bundle={name:json.loads((SCHEMAS/"examples"/(name+".json")).read_text(encoding="utf-8")) for name in ["plan-v2","patch-set","approval","transaction","evidence","audit-event-v2"]}
validate_bundle(bundle)
cases=0
def reject(name,mutator):
    global cases
    candidate=copy.deepcopy(bundle);mutator(candidate)
    try:validate_bundle(candidate)
    except (ValidationError,ValueError,KeyError):cases+=1;return
    raise AssertionError("Unsafe contract accepted: "+name)
def change(record,key,value):return lambda b:b[record].__setitem__(key,value)
for record,key,value in [
 ("plan-v2","requiresApproval",False),("plan-v2","verificationRequired",False),
 ("patch-set","fingerprint","a"*64),("patch-set","planRevision",2),
 ("approval","workspaceId","another-workspace"),("approval","patchSetId","another-patch"),
 ("approval","fingerprint","a"*64),("approval","actor","agent"),("approval","decision","rejected"),
 ("approval","selectedPaths",["src/other.ts"]),("approval","selectedPaths",[]),
 ("approval","expiresAt","2026-11-04T11:59:00Z"),("approval","expiresAt","2026-11-04T12:11:00Z"),
 ("transaction","createdAt","2026-11-04T12:10:00Z"),("transaction","workspaceId","elsewhere"),
 ("transaction","authorization",{"kind":"experimental-fixture","fixtureId":"example","capabilityId":"example"}),
 ("transaction","condition","B"),("transaction","runId","another-run"),
 ("evidence","patchFingerprint","a"*64),("evidence","verdict","verified"),
 ("evidence","producer",{"kind":"broker","id":"agent","version":"1"}),
 ("audit-event-v2","condition","B"),("audit-event-v2","transactionId","different-tx"),
 ("audit-event-v2","workspaceRoot","C:/personal/repository"),
]:reject(f"{record}.{key}",change(record,key,value))
for invalid_path in ["../outside.ts","src/../../outside.ts","/tmp/x","C:/x","src\\x","src//x","src/./x","src/","src/x\n"]:
    # An unrelated fingerprint mismatch must not mask a permissive path schema.
    invalid_patch=copy.deepcopy(bundle["patch-set"]);invalid_patch["files"][0]["path"]=invalid_path
    try:validate("patch-set",invalid_patch)
    except ValidationError:pass
    else:raise AssertionError("Path schema accepted "+repr(invalid_path))
    reject("unsafe relative path "+repr(invalid_path),lambda b,p=invalid_path:b["patch-set"]["files"][0].__setitem__("path",p))
reject("duplicate patch file",lambda b:b["patch-set"]["files"].append(copy.deepcopy(b["patch-set"]["files"][0])))
reject("null modify base",lambda b:b["patch-set"]["files"][0].__setitem__("baseHash",None))
reject("missing modify backup",lambda b:b["transaction"]["files"][0].__setitem__("backupRef",None))
reject("missing version",lambda b:b["audit-event-v2"]["versions"].pop("safetyPolicy"))
reject("false committed",lambda b:b["transaction"]["files"][0].__setitem__("state","staged"))
def split_group(b):
    second=copy.deepcopy(b["patch-set"]["files"][0]);second["path"]="src/second.ts";b["patch-set"]["files"].append(second)
    b["plan-v2"]["affectedFiles"].append({"path":second["path"],"operation":"modify","reason":"Dependent refactor."})
    new=fingerprint(b["patch-set"])
    for name in ["patch-set","approval","transaction"]:b[name]["fingerprint"]=new
    b["evidence"]["patchFingerprint"]=new
reject("split dependent file group",split_group)

run_example=json.loads((SCHEMAS/"examples/benchmark-run.json").read_text(encoding="utf-8"))
validate("benchmark-run",run_example)
for field,value in [("score",2),("candidateFingerprint","a"*64),("humanDecision","approved"),("status","completed")]:
    bad=copy.deepcopy(run_example);bad[field]=value
    try:validate("benchmark-run",bad)
    except ValidationError:cases+=1
    else:raise AssertionError("False benchmark result accepted: "+field)
config_example={"schemaVersion":1,"defaultProviderMode":"local-only","providers":{"ollama":{"enabled":True,"baseUrl":"http://localhost:11434","defaultModel":"synthetic"}},"privacy":{"respectAgentIgnore":True,"excludeSecretPatterns":[]},"retention":{"auditDays":30,"undoSets":10,"persistChat":False}}
validate("config",config_example)
for group,field,value in [("retention","auditDays",0),("retention","undoSets",11),("retention","persistChat",True),("privacy","respectAgentIgnore",False),("ollama","baseUrl","https://remote.example")]:
    bad=copy.deepcopy(config_example)
    target=bad["providers"]["ollama"] if group=="ollama" else bad[group]
    target[field]=value
    try:validate("config",bad)
    except ValidationError:cases+=1
    else:raise AssertionError("Unsafe config accepted: "+field)
seed=json.loads((ROOT/"github-projects/requirements-analysis.json").read_text(encoding="utf-8-sig"))
validate("requirements-project",seed)
by_key={entry["key"]:entry for entry in seed["issues"]}
invariant(len(by_key)==len(seed["issues"]),"Duplicate requirement key.")
stable_numbers=[entry["githubIssueNumber"] for entry in seed["issues"] if entry.get("githubIssueNumber")]
invariant(len(set(stable_numbers))==len(stable_numbers),"Duplicate stable GitHub issue number.")
defined_labels={label["name"] for label in seed["labels"]}
visiting=set();visited=set()
def visit(key):
    invariant(key in by_key,"Unknown dependency "+key)
    invariant(key not in visiting,"Dependency cycle at "+key)
    if key in visited:return
    visiting.add(key)
    for dependency in by_key[key].get("blockedByKeys",[]):visit(dependency)
    visiting.remove(key);visited.add(key)
for key,entry in by_key.items():
    visit(key)
    if entry.get("parentKey"):
        parent=entry["parentKey"]
        invariant(parent in by_key and parent!=key,"Unknown/self parent "+key)
        invariant(by_key[parent]["kind"]=="epic","Parent is not an epic "+key)
        ancestors={key};cursor=parent
        while cursor:
            invariant(cursor not in ancestors,"Parent cycle at "+key)
            ancestors.add(cursor);cursor=by_key[cursor].get("parentKey")
    invariant(set(entry["labels"])<=defined_labels,"Undefined label "+key)
    for source in entry["sourceDocuments"]:invariant((ROOT/source).exists(),"Missing source "+source)
    if entry.get("workflowStatus")=="Ready":
        invariant(all(by_key[d]["status"]=="Done" for d in entry.get("blockedByKeys",[])),"Ready item has unfinished dependency "+key)
    if entry["status"]=="Done":
        invariant(bool(entry.get("completionEvidence")),"Done has no evidence "+key)
        invariant(entry.get("workflowStatus")=="Done" and entry.get("readiness")=="Validated","Inconsistent Done state "+key)
        for evidence in entry["completionEvidence"]:
            invariant(evidence.startswith("https://") or (ROOT/evidence).exists(),"Missing completion evidence "+evidence)

pilot_count=0
for example in (ROOT/"docs/benchmark/pilot").glob("pilot-*.json"):
    task=json.loads(example.read_text(encoding="utf-8"));validate("benchmark-task",task)
    fixture=ROOT/task["repositoryFixture"]["path"];invariant(fixture.is_dir(),"Pilot fixture does not exist")
    for path in task.get("allowedFiles",[]):invariant((fixture/path).is_file(),"Pilot allowed file missing: "+path)
    pilot_count+=1
print(json.dumps({"schemas":len(schemas),"positive_contract_records":len(bundle)+1,"unsafe_contract_cases_rejected":cases,"requirements":len(by_key),"pilot_tasks":pilot_count,"dependency_cycle":False,"runtime_validated":False}))
