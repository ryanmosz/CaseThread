# CaseThread Quick Start Guide

Get CaseThread running in 5 minutes! 🚀

## 1. Prerequisites
- Docker Desktop installed and running
- OpenAI API key (with o3 model access)

## 2. Setup (2 minutes)

```bash
# Clone and enter project
git clone https://github.com/[username]/CaseThread.git
cd CaseThread

# Create .env file with your OpenAI key
echo "OPENAI_API_KEY=your-key-here" > .env
echo "NODE_ENV=development" >> .env
echo "LOG_LEVEL=info" >> .env
echo "LOG_FORMAT=pretty" >> .env

# Build and start Docker
docker-compose up -d
```

## 3. Generate Your First Document (3 minutes)

```bash
# Generate a Patent Assignment Agreement
docker exec casethread-dev npm run cli -- generate \
  patent-assignment-agreement \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
  --output ./output

# View the generated document
cat output/patent-assignment-agreement-*.md
```

## 4. Try Other Document Types

```bash
# Trademark Application
docker exec casethread-dev npm run cli -- generate \
  trademark-application \
  docs/testing/scenario-inputs/rtp-02-trademark-application.yaml \
  --output ./output

# Cease and Desist Letter
docker exec casethread-dev npm run cli -- generate \
  cease-and-desist-letter \
  docs/testing/scenario-inputs/cil-05-cease-desist-false-claims.yaml \
  --output ./output
```

## 5. Available Templates

- `provisional-patent-application`
- `nda-ip-specific`
- `patent-license-agreement`
- `trademark-application`
- `patent-assignment-agreement`
- `office-action-response`
- `cease-and-desist-letter`
- `technology-transfer-agreement`

## 6. Test Input Files

Find example YAML files in `docs/testing/scenario-inputs/`:
- `tfs-*` - TechFlow Solutions scenarios
- `cil-*` - ChemInnovate Labs scenarios
- `ids-*` - Iris Design Studio scenarios
- `rtp-*` - Rainbow Tales Publishing scenarios

## Need Help?

- Run with `--debug` flag for detailed logging
- Check Docker logs: `docker logs casethread-dev`
- See full README.md for comprehensive documentation

## Stop the Container

```bash
docker-compose down
```

Happy document generating! 📄✨ 