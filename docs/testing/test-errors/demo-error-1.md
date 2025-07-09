╔═══════════════════════════════════════════════════════════════════╗
║          CaseThread CLI - Legal Document Generation Demo          ║
║                    Multi-Agent System with ChromaDB                ║
╚═══════════════════════════════════════════════════════════════════╝

🔍 Checking system health...
  ChromaDB Vector Database: ✓ Online
  Docker Container: ✓ Running

📁 Creating output directory: docs/testing/test-results/demo-20250708-190900

🎯 Starting Full Test Suite (8 Document Types)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1/8: Patent Assignment Agreement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Document Type: patent-assignment-agreement
📂 Input File: docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml

Input Preview:
  # Metadata
  client: "TechFlow Solutions"
  attorney: "Sarah Chen"
  document_type: "patent-assignment-agreement"
  template: "patent-assignment-agreement.json"
  ...

🚀 Generating document...


> casethread-poc@0.1.0 cli
> ts-node src/index.ts generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --output docs/testing/test-results/demo-20250708-190900

⠋ Initializing CaseThread CLI...The 'path' argument is deprecated. Please use 'ssl', 'host', and 'port' instead
head: Error reading stdin
⏎                                                                
…W4-CaseThread feature/integrate-multi-agent 11m 12.8s | 141 1 ❱ 
