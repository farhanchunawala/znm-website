# Operational Runbook: Categories & Collections Module

## Quick Reference

| Task               | Command                                                       | Time       |
| ------------------ | ------------------------------------------------------------- | ---------- |
| Initialize data    | `ts-node scripts/seedCategories.ts`                           | <1m        |
| Run tests          | `npm test`                                                    | 2-5m       |
| Start evaluator    | `node -r ts-node/register lib/workers/collectionEvaluator.ts` | Continuous |
| Check health       | `curl http://localhost:3000/api/admin/health`                 | <1s        |
| Recalculate counts | `ts-node scripts/recalculate-counts.ts`                       | 1-5m       |

## Daily Operations

### 1. Verify Collections Are Updated

Every morning, verify that dynamic collections were evaluated overnight:

```bash
# Check evaluator logs (if running)
tail -f logs/collection-evaluator.log

# Or check latest evaluation via API
curl -s http://localhost:3000/api/collections | \
  jq '.data[] | select(.type=="dynamic") | {title, cachedAt, matchedProducts: (.cachedProductIds | length)}'
```

Expected output:

```json
{
	"title": "New Arrivals",
	"cachedAt": "2024-01-15T02:00:00Z",
	"matchedProducts": 42
}
```

### 2. Monitor Category Product Counts

Daily check for count inconsistencies:

```bash
# Find categories with potentially incorrect counts
ts-node scripts/audit-category-counts.ts

# Output example:
# ✓ Category "Men": 156 products (count=156)
# ⚠ Category "Kurtas": 42 products (count=38) - MISMATCH
# ✓ Category "Shirts": 23 products (count=23)
```

If mismatches found:

```bash
# Recalculate all counts
ts-node scripts/recalculate-counts.ts

# Verify fix
ts-node scripts/audit-category-counts.ts
```

### 3. Check API Health

```bash
# All category endpoints
curl -s http://localhost:3000/api/categories | jq '.meta'

# All collection endpoints
curl -s http://localhost:3000/api/collections | jq '.meta'

# Sample output:
# {
#   "count": 45,
#   "totalPages": 5,
#   "currentPage": 1
# }
```

## Emergency Procedures

### Dynamic Collection Not Evaluating

**Symptoms**: Collection products count hasn't updated in hours

**Fix**:

```bash
# 1. Check if evaluator is running
ps aux | grep collectionEvaluator

# 2. If not running, start it
node -r ts-node/register lib/workers/collectionEvaluator.ts &

# 3. Manually trigger evaluation
curl -X POST http://localhost:3000/api/collections/[COLLECTION_ID]/evaluate

# 4. Verify result
curl http://localhost:3000/api/collections/[COLLECTION_ID] | \
  jq '.data | {title, cachedAt, matchedProducts: (.cachedProductIds | length)}'
```

### Category Product Count Mismatch

**Symptoms**: Product count showing incorrect number in admin

**Investigation**:

```bash
# Get actual vs stored count
db.categories.findOne({_id: ObjectId("[ID]")})
# Compare productCount field with actual product count:
db.products.countDocuments({categories: ObjectId("[ID]"), status: {$ne: "archived"}})
```

**Fix**:

```bash
# Recalculate specific category
db.categories.updateOne(
  {_id: ObjectId("[ID]")},
  [{$set: {productCount: db.products.countDocuments({categories: ObjectId("[ID]"), status: {$ne: "archived"}})}}]
)

# Or recalculate all
ts-node scripts/recalculate-counts.ts
```

### Cannot Create Category (Slug Collision)

**Symptom**: "Slug already exists" error even for unique names

**Cause**: Collision handling reached high suffix number

**Fix**:

```bash
# Check existing similar slugs
db.categories.find({slug: /^kurta/})

# Manual rename if needed
db.categories.updateOne(
  {_id: ObjectId("[ID]")},
  {$set: {slug: "kurtas-premium-hand-woven"}}
)
```

### Cannot Delete Category (Cyclic Reference)

**Symptom**: "Would create circular reference" error

**Cause**: Trying to assign parent to a descendant

**Fix**:

```bash
# Find the problematic hierarchy
db.categories.findOne({_id: ObjectId("[CHILD_ID]")})
# Check ancestors field to understand structure

# Correct approach: Assign to a valid ancestor
curl -X PATCH http://localhost:3000/api/categories/[CHILD_ID] \
  -H "Content-Type: application/json" \
  -d '{"parentId": "[VALID_PARENT_ID]"}'
```

### Rule Evaluation Not Matching Products

**Symptoms**: Dynamic collection showing 0 products despite matching products existing

**Investigation**:

```bash
# 1. Check collection rules are valid
curl http://localhost:3000/api/collections/[ID] | jq '.data.rules'

# 2. Check if collection is dynamic
curl http://localhost:3000/api/collections/[ID] | jq '.data.type'

# 3. Manually test a rule
ts-node -e "
import { evaluateRule } from '@/lib/services/collectionService';
const product = {price: 2500, status: 'active'};
const rule = {field: 'price', operator: 'gt', value: 2000};
console.log(evaluateRule(product, rule));
"
```

**Fix**:

```bash
# 1. Validate rules
curl -X PATCH http://localhost:3000/api/collections/[ID] \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {"field": "status", "operator": "eq", "value": "active"},
      {"field": "price", "operator": "between", "value": {"min": 1000, "max": 5000}}
    ]
  }'

# 2. Re-evaluate
curl -X POST http://localhost:3000/api/collections/[ID]/evaluate
```

## Backup & Recovery

### Backup Collections Data

```bash
# Export categories
mongoexport --db znm_website --collection categories --out backup-categories-$(date +%Y%m%d).json

# Export collections
mongoexport --db znm_website --collection collections --out backup-collections-$(date +%Y%m%d).json
```

### Restore from Backup

```bash
# Import categories
mongoimport --db znm_website --collection categories --file backup-categories-20240115.json

# Import collections
mongoimport --db znm_website --collection collections --file backup-collections-20240115.json
```

### Reset to Seed Data

If data is corrupted and you need to start fresh:

```bash
# 1. Clear collections
db.categories.deleteMany({})
db.collections.deleteMany({})

# 2. Reseed
ts-node scripts/seedCategories.ts

# 3. Verify
curl -s http://localhost:3000/api/categories | jq '.meta.count'
```

## Monitoring & Analytics

### Category Tree Health

```bash
# Check hierarchy depth
ts-node -e "
import { getCategoryTree } from '@/lib/services/categoryService';
const tree = await getCategoryTree();
function getDepth(node, d = 0) {
  return node.children ? Math.max(d, ...node.children.map(c => getDepth(c, d+1))) : d;
}
console.log('Max depth:', Math.max(...tree.map(t => getDepth(t))));
"

# Expected: 3-4 levels max for good UX
```

### Collection Performance

```bash
# Find slowest evaluating collections
db.collections.aggregate([
  {$match: {type: "dynamic"}},
  {$addFields: {
    evaluationTime: {$subtract: ["$cachedAt", "$updatedAt"]}
  }},
  {$sort: {evaluationTime: -1}},
  {$limit: 5},
  {$project: {title: 1, evaluationTime: 1, matchedProducts: {$size: "$cachedProductIds"}}}
])

# Output:
# {
#   title: "Products with complex rules",
#   evaluationTime: 45000,
#   matchedProducts: 1250
# }
```

### Storage Usage

```bash
# Categories collection size
db.categories.stats().size

# Collections collection size
db.collections.stats().size

# Example output: ~5-10 MB per 10,000 categories
```

## Maintenance Tasks

### Weekly

**Monday AM**:

```bash
# Verify evaluator is running
ps aux | grep collectionEvaluator || echo "Evaluator not running - restart if needed"

# Check for count mismatches
ts-node scripts/audit-category-counts.ts

# Verify dynamic collection cache freshness
curl -s http://localhost:3000/api/collections | \
  jq '.data[] | select(.type=="dynamic") | .cachedAt' | \
  grep -E 'Z$' # Should be from last 24 hours
```

**Wednesday PM**:

```bash
# Run full test suite
npm test -- lib/services/__tests__/categoryService.test.ts lib/services/__tests__/collectionService.test.ts

# Expected: All tests pass
```

**Friday PM**:

```bash
# Backup production data
mongoexport --db znm_website --collection categories --out backups/categories-$(date +%Y%m%d).json
mongoexport --db znm_website --collection collections --out backups/collections-$(date +%Y%m%d).json

# Clean backups older than 30 days
find backups/ -name "*.json" -mtime +30 -delete
```

### Monthly

**1st of Month**:

```bash
# Recalculate all category counts
ts-node scripts/recalculate-counts.ts

# Audit hierarchy for cycles (should be 0)
ts-node scripts/audit-cycles.ts

# Check database indexes are present
db.categories.getIndexes()
db.collections.getIndexes()

# Expected:
# {key: {slug: 1}, unique: true}
# {key: {parentId: 1}}
# {key: {status: 1}}
# {key: {handle: 1}, unique: true} (for collections)
```

**2nd of Month**:

```bash
# Generate analytics report
ts-node scripts/generate-analytics.ts

# Output includes:
# - Total categories by level
# - Dynamic vs manual collections
# - Collection evaluation success rate
# - Average evaluation time
# - Product count distribution
```

### Quarterly

**1st of Quarter**:

```bash
# Review and optimize slow queries
# Check slow query logs
db.system.profile.find({millis: {$gt: 1000}}).pretty()

# Add indexes if needed
db.categories.createIndex({status: 1})
db.collections.createIndex({startAt: 1, endAt: 1})
```

**Performance review**:

```bash
# Check disk usage growth
du -sh /data/db/znm_website

# Review evaluator performance
grep "Evaluation complete" logs/*.log | tail -10

# Archive old logs
find logs/ -name "*.log" -mtime +90 -move logs/archive/
```

## Rollback Procedures

### Rollback Collection Changes

If collection changes cause issues:

```bash
# 1. Identify latest good backup
ls -ltr backups/collections-*.json | tail -5

# 2. Restore from backup
mongoimport --db znm_website --collection collections --file backups/collections-20240110.json --drop

# 3. Verify
curl -s http://localhost:3000/api/collections | jq '.meta.count'
```

### Rollback Code Changes

If API code changes are problematic:

```bash
# 1. Check git history
git log --oneline app/api/collections/ | head -10

# 2. Revert specific commit
git revert [COMMIT_HASH]

# 3. Restart server
npm run dev

# 4. Verify endpoints work
curl http://localhost:3000/api/collections
```

## Performance Tuning

### Optimize Dynamic Collection Evaluation

If evaluations are slow:

```typescript
// lib/workers/collectionEvaluator.ts

// Option 1: Increase interval (less frequent but faster startup)
const evaluator = new CollectionEvaluator(2 * 60 * 60 * 1000); // 2 hours

// Option 2: Batch evaluate (evaluate multiple in parallel)
async evaluateMultiple(collectionIds: string[]) {
  const promises = collectionIds.map(id => evaluateCollectionRules(id));
  await Promise.all(promises);
}

// Option 3: Stagger evaluations
const interval = 60 * 60 * 1000 / collections.length; // Spread across hour
```

### Optimize Category Queries

If category tree loading is slow:

```bash
# Verify indexes exist
db.categories.getIndexes()

# Add missing indexes
db.categories.createIndex({parentId: 1})
db.categories.createIndex({ancestors: 1})
db.categories.createIndex({status: 1, parentId: 1})

# Rebuild indexes if corrupted
db.categories.reIndex()
```

## Incident Response

### Communication Template

When issues occur:

```
INCIDENT: [Issue Name]
SEVERITY: [Low/Medium/High/Critical]
IMPACT: [Description of what's not working]
AFFECTED: [Categories/Collections/Both]

ROOT CAUSE:
[Analysis]

RESOLUTION:
[Steps taken]

PREVENTION:
[How to prevent in future]
```

### Escalation

If unable to resolve within 1 hour:

1. Notify platform team lead
2. Check Slack #znm-incident channel
3. Review recent commits: `git log --since="1 hour ago"`
4. Check error logs: `tail -100 /var/log/app/error.log`

## Support Contacts

| Role          | Contact     | Availability |
| ------------- | ----------- | ------------ |
| Platform Lead | [Slack]     | 9-5 EST      |
| DBA           | [Slack]     | 9-5 EST      |
| On-Call       | [PagerDuty] | 24/7         |

## SLA & Targets

| Metric                | Target | Response             |
| --------------------- | ------ | -------------------- |
| API Response Time     | <100ms | Optimize queries     |
| Collection Evaluation | <30s   | Batch or split rules |
| Data Availability     | 99.9%  | Maintain backups     |
| Recovery Time         | <15m   | Restore from backup  |

---

**Last Updated**: January 15, 2024
**Next Review**: February 15, 2024
