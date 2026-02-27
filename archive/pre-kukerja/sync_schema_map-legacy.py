#!/usr/bin/env python3
import json, re, os, glob
from datetime import datetime, timezone

MODELS_DIR = "/var/www/dashboard-finance/src/infrastructure/database/models"
OUT = "/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json"


def infer_collection(model):
    s = model.lower()
    if s.endswith('y'):
        return s[:-1] + 'ies'
    if s.endswith('s'):
        return s
    return s + 's'


def normalize_ts_type(t):
    t=t.strip()
    if 'Decimal128' in t: return 'decimal'
    if 'ObjectId' in t: return 'objectId'
    if t in ('number','Number'): return 'number'
    if t in ('string','String'): return 'string'
    if t in ('boolean','Boolean'): return 'boolean'
    if t in ('Date','date'): return 'date'
    if '|' in t: return 'enum'
    if t.endswith('[]'): return 'array'
    return t


def parse_interface(content):
    fields = {}
    m = re.search(r'export\s+interface\s+I\w+\s+extends\s+Document\s*\{([\s\S]*?)\n\}', content)
    if not m:
        return fields
    body = m.group(1)
    for ln in body.splitlines():
        ln = ln.strip()
        if not ln or ln.startswith('//'):
            continue
        # field?: type;
        mm = re.match(r'([A-Za-z_][A-Za-z0-9_]*)\??\s*:\s*([^;]+);', ln)
        if not mm:
            continue
        name, typ = mm.group(1), mm.group(2).strip()
        optional = '?' in ln.split(':',1)[0]
        fields[name] = {
            'name': name,
            'type': normalize_ts_type(typ),
            'required': not optional
        }
        if '|' in typ:
            enums = [x.strip().strip('"\'') for x in typ.split('|')]
            fields[name]['enum'] = enums
    return fields


def parse_schema_required(content):
    required = {}
    refs = {}
    enums = {}
    # very lightweight per-line parse inside schema object
    schema_obj = re.search(r'new\s+Schema<[^>]+>\s*\(\s*\{([\s\S]*?)\}\s*,\s*\{', content)
    if not schema_obj:
        return required, refs, enums
    body = schema_obj.group(1)
    for ln in body.splitlines():
        line = ln.strip()
        # fieldName: { ... }
        fm = re.match(r'([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{([^}]*)\}\s*,?$', line)
        if not fm:
            continue
        field, obj = fm.group(1), fm.group(2)
        if 'required: true' in obj:
            required[field] = True
        if 'required: false' in obj:
            required[field] = False
        rm = re.search(r'ref:\s*"([^"]+)"', obj)
        if rm:
            refs[field] = rm.group(1)
        em = re.search(r'enum:\s*\[([^\]]+)\]', obj)
        if em:
            vals = [x.strip().strip('"\'') for x in em.group(1).split(',') if x.strip()]
            enums[field] = vals
    return required, refs, enums


def parse_indexes(content):
    idx = []
    for m in re.finditer(r'\.index\s*\(\s*\{([^}]*)\}', content):
        raw = m.group(1)
        fields = []
        for part in raw.split(','):
            p = part.strip()
            if not p:
                continue
            k = p.split(':',1)[0].strip()
            if k:
                fields.append(k)
        if fields:
            idx.append(','.join(fields))
    return idx


def main():
    files = sorted(glob.glob(os.path.join(MODELS_DIR, '*.ts')))
    collections = []
    for fp in files:
        name = os.path.splitext(os.path.basename(fp))[0]
        with open(fp,'r',encoding='utf-8') as f:
            c = f.read()
        iface = parse_interface(c)
        req_map, refs, enum_map = parse_schema_required(c)
        fields = []
        for k,v in iface.items():
            item = dict(v)
            if k in req_map:
                item['required'] = req_map[k]
            if k in refs:
                item['ref'] = refs[k]
            if k in enum_map:
                item['enum'] = enum_map[k]
            fields.append(item)
        collections.append({
            'name': infer_collection(name),
            'model': name,
            'description': f'{name} model from dashboard-finance',
            'fields': fields,
            'indexes': parse_indexes(c)
        })

    out = {
        'meta': {
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': MODELS_DIR,
            'version': 'auto-1'
        },
        'collections': collections,
        'notes': 'Auto-generated from TypeScript model files. Review before enabling write mode.'
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT,'w',encoding='utf-8') as f:
        json.dump(out,f,ensure_ascii=False,indent=2)
    print(f'Generated: {OUT}')
    print(f'Collections: {len(collections)}')

if __name__ == '__main__':
    main()
