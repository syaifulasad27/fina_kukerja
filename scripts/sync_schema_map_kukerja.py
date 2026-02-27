#!/usr/bin/env python3
"""
Schema Map Generator for Kukerja-Backend (JavaScript Mongoose Models)
Phase 2: Configuration Update
"""
import json
import re
import os
import glob
from datetime import datetime, timezone

MODELS_DIR = "/var/www/kukerja-backend/src/api/models"
OUT = "/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json"

# Constants mapping for enum reference
CONSTANTS_MAP = {
    "payoutsSalaryStatuses": [
        "initial", "queued", "approved", "processed", "failed",
        "completed", "distributed", "finalized", "invalid"
    ],
    "bpjsKetenagakerjaanTypes": ["JKK", "JKM", "JHT", "JP"],
    "pphTerCategories": ["terA", "terB", "terC", "underPayment", "restitution"],
    "salaryModels": ["fixSalary", "flexibleSalary", "bonus", "salary"],
    "payTypes": ["monthly", "weekly"],
    "attendanceBasedOnTypes": ["daily", "hourly"],
    "userTypes": ["Employer", "Employee", "centralAbsence"],
    "financeRecordCategories": [
        "revenue", "cogs", "opex", "gross_margin", "overload",
        "interest", "tax", "liability", "assets", "capex_amortization",
        "admin", "capital", "debt", "others"
    ],
    "reimbursementStatuses": ["pending", "rejected", "approved", "paid"],
    "tmsBalanceStatuses": ["pending", "received", "hold", "canceled", "failed", "disputed"],
    "managementFeeStatuses": [
        "percentage", "fix0k", "fix200k", "fix250k", "fix300k", "fix325k",
        "fix500k", "fix550k", "fix600k", "fix650k", "fix700k", "fix750k",
        "fix800k", "fix850k", "fix900k", "fix950k", "fix1000k",
        "serviceFee", "serviceFee25k", "monthlyService"
    ],
    "annualNetIncomeCalculationTypes": ["annually", "annualized"],
    "payoutsSalaryFinalizeStatuses": ["initial", "completed", "canceled"]
}


def normalize_type(type_str):
    """Normalize mongoose type to schema-map type"""
    type_str = type_str.strip()
    
    # Handle mongoose types
    if 'Schema.Types.ObjectId' in type_str or 'ObjectId' in type_str:
        return 'objectId'
    if 'Schema.Types.Decimal128' in type_str or 'Decimal128' in type_str:
        return 'decimal'
    if type_str in ('Number', 'number'):
        return 'number'
    if type_str in ('String', 'string'):
        return 'string'
    if type_str in ('Boolean', 'boolean'):
        return 'boolean'
    if type_str in ('Date', 'date'):
        return 'date'
    if '[]' in type_str or 'Array' in type_str:
        return 'array'
    
    return type_str


def extract_enum_from_constants(content, field_name):
    """Try to find enum values from constants reference"""
    # Look for patterns like: enum: SomeConstant.list
    enum_pattern = rf'{field_name}.*?enum:\s*(\w+)\.list'
    match = re.search(enum_pattern, content, re.DOTALL)
    if match:
        const_name = match.group(1)
        # Map common constant names
        const_mapping = {
            'PayoutsSalaryStatuses': 'payoutsSalaryStatuses',
            'PphTerCategories': 'pphTerCategories',
            'SalaryModels': 'salaryModels',
            'PayTypes': 'payTypes',
            'AttendanceBasedOnTypes': 'attendanceBasedOnTypes',
            'UserTypes': 'userTypes',
            'FinanceRecordCategories': 'financeRecordCategories',
            'ReimbursementTransactionStatus': 'reimbursementStatuses',
            'TmsBalanceStatuses': 'tmsBalanceStatuses',
            'ManagementFeeStatuses': 'managementFeeStatuses',
            'AnnualNetIncomeCalculation': 'annualNetIncomeCalculationTypes',
            'CONST.TmsBalanceStatuses': 'tmsBalanceStatuses'
        }
        return CONSTANTS_MAP.get(const_mapping.get(const_name, const_name), [])
    return None


def parse_mongoose_schema(content):
    """Parse mongoose schema from JavaScript file"""
    fields = []
    
    # Extract collection name
    collection_match = re.search(r"collection:\s*['\"]([^'\"]+)['\"]", content)
    collection_name = collection_match.group(1) if collection_match else None
    
    # Extract schema name from model definition
    model_match = re.search(r"mongoose\.model\(['\"]([^'\"]+)['\"]", content)
    model_name = model_match.group(1) if model_match else "Unknown"
    
    # Find schema definition - look for new mongoose.Schema or new Schema
    schema_patterns = [
        r'new\s+mongoose\.Schema\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\{',
        r'new\s+Schema\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\{'
    ]
    
    schema_body = None
    for pattern in schema_patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            schema_body = match.group(1)
            break
    
    if not schema_body:
        return model_name, collection_name, fields
    
    # Extract field definitions
    # Pattern: fieldName: { type: Type, required: true/false, ... }
    field_pattern = r'([A-Za-z_][A-Za-z0-9_]*):\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
    
    for match in re.finditer(field_pattern, schema_body):
        field_name = match.group(1)
        field_def = match.group(2)
        
        field_info = {
            'name': field_name,
            'type': 'unknown',
            'required': False
        }
        
        # Extract type
        type_match = re.search(r'type:\s*([^,\n]+)', field_def)
        if type_match:
            raw_type = type_match.group(1).strip()
            field_info['type'] = normalize_type(raw_type)
            
            # Check for ref
            ref_match = re.search(r'ref:\s*["\']([^"\']+)["\']', field_def)
            if ref_match:
                field_info['ref'] = ref_match.group(1)
        
        # Extract required
        if 'required: true' in field_def:
            field_info['required'] = True
        elif 'required: false' in field_def:
            field_info['required'] = False
        
        # Extract default
        default_match = re.search(r'default:\s*([^,\n]+)', field_def)
        if default_match:
            field_info['default'] = default_match.group(1).strip()
        
        # Extract enum - check for direct enum array
        enum_match = re.search(r'enum:\s*\[([^\]]+)\]', field_def)
        if enum_match:
            enum_values = [v.strip().strip('"\'') for v in enum_match.group(1).split(',') if v.strip()]
            if enum_values and enum_values[0]:  # Make sure not empty
                field_info['enum'] = enum_values
        else:
            # Try to find enum from constants
            const_enum = extract_enum_from_constants(content, field_name)
            if const_enum:
                field_info['enum'] = const_enum
        
        fields.append(field_info)
    
    # Also handle simple field definitions: fieldName: Type
    simple_field_pattern = r'([A-Za-z_][A-Za-z0-9_]*):\s*\{\s*type:\s*([^,\n]+)\s*\}'
    
    return model_name, collection_name, fields


def find_model_files(directory):
    """Recursively find all .js model files"""
    files = []
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if filename.endswith('.js'):
                files.append(os.path.join(root, filename))
    return sorted(files)


def main():
    files = find_model_files(MODELS_DIR)
    collections = []
    
    print(f"Found {len(files)} model files")
    
    for fp in files:
        rel_path = os.path.relpath(fp, MODELS_DIR)
        try:
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {rel_path}: {e}")
            continue
        
        model_name, collection_name, fields = parse_mongoose_schema(content)
        
        if not fields:
            print(f"  ⚠️  {rel_path}: No fields parsed")
            continue
        
        # Use collection name from file if found, otherwise infer from model
        if not collection_name:
            collection_name = model_name.lower()
        
        collections.append({
            'name': collection_name,
            'model': model_name,
            'sourceFile': rel_path,
            'description': f'{model_name} model from kukerja-backend',
            'fields': fields,
            'indexes': []  # Would need to parse .index() calls
        })
        
        print(f"  ✓ {rel_path}: {len(fields)} fields")
    
    # Build output
    output = {
        'meta': {
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'source': MODELS_DIR,
            'version': 'auto-kukerja-1'
        },
        'collections': collections,
        'constants': CONSTANTS_MAP,
        'notes': 'Auto-generated from JavaScript Mongoose models. Review before enabling write mode.'
    }
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    
    # Write schema-map.json
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Generated: {OUT}")
    print(f"   Collections: {len(collections)}")
    print(f"   Total fields: {sum(len(c['fields']) for c in collections)}")


if __name__ == '__main__':
    main()
