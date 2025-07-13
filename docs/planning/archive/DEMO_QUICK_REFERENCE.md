# CaseThread Demo Quick Reference Card

## 🚀 Quick Start
```bash
cd ~/Dropbox/gauntlet/cohort2/G2W4-CaseThread
git checkout feature/integrate-multi-agent
docker-compose up -d
chmod +x docs/testing/test-scripts/*.sh
```

## ✅ Pre-Demo Verification
```bash
docker ps                                    # Should show 2 containers
curl http://localhost:8000/api/v1/heartbeat # Should return {"status":"ok"}
```

## 📝 Key Commands

### 1. Show Architecture
```bash
cat docs/architecture/tech-stack.md
ls -la src/agents/
```

### 2. Show Mock Data
```bash
ls -la mock-data/attorneys/
cat mock-data/firm-profile.json | jq '.'
```

### 3. Learn Command
```bash
docker exec casethread-dev npm run cli -- learn --help
docker exec casethread-dev npm run cli -- learn --clear
```

### 4. Run Full Demo Test
```bash
./docs/testing/test-scripts/test-all-documents-demo.sh
```

### 5. Single Document Generation
```bash
docker exec -it casethread-dev npm run cli -- generate \
    patent-assignment-agreement \
    docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
```

## 📊 Key Statistics

- **Document Types:** 8 fully functional
- **Average Generation Time:** 33 seconds
- **Test Coverage:** 65.77% (improving to 80%)
- **Total Tests:** 266 passing
- **Mock Documents Indexed:** 23
- **Price:** $99/month vs Harvey's $100K+/year

## 🎯 Key Features to Highlight

1. **Multi-Agent System**
   - ContextBuilder Agent
   - Drafting Agent
   - Future: QA, Risk, Compliance agents

2. **ChromaDB Integration**
   - Vector search for context
   - Learns from firm's documents
   - Works offline as fallback

3. **Docker Deployment**
   - Easy setup
   - Consistent environment
   - Production-ready

4. **Open Source Benefits**
   - Full transparency
   - Community contributions
   - No vendor lock-in

## ⚡ Troubleshooting

**If ChromaDB is down:**
```bash
docker restart casethread-chromadb
```

**If generation fails:**
```bash
docker logs casethread-dev --tail 50
```

**If tests won't run:**
```bash
chmod +x docs/testing/test-scripts/*.sh
```

## 📱 Contact Info

- GitHub: https://github.com/ryanmosz/CaseThread
- Branch: feature/integrate-multi-agent
- License: MIT

---
*Making legal AI accessible to every IP attorney* 