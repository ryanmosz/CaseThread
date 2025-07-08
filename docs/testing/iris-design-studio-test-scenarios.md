# Iris Design Studio - Document Generation Test Scenarios

## Background Context
Iris Design Studio is currently in a trademark dispute with Iris Creative Group. They have prior use rights (since 2015) but are facing opposition to their federal trademark application. The parties are currently negotiating a coexistence agreement.

## Test Scenario 1: Trademark Application Amendment
**Document Type:** Trademark Application  
**Scenario:** After negotiations with Iris Creative Group, Samantha agrees to file an amended application for "IRIS DESIGN STUDIO SF" to add geographic distinction.

**Test Input:**
```
Generate a trademark application for:
- Mark: IRIS DESIGN STUDIO SF
- Applicant: Iris Design Studio (Samantha Lee, sole proprietor)
- Address: 789 Creative Way, Studio B, San Jose, CA 95110
- Classes: 35 (advertising/business), 42 (design services)
- Services: Graphic design services; brand identity design; logo design; user interface design for tech startups and established brands
- Filing basis: Use in commerce since January 2023 (when they started using the SF addition)
- Specimen: Website header showing "IRIS DESIGN STUDIO SF" with the iris-to-pixel logo
- Prior application reference: 97/123,456 (being superseded)
- Attorney: Michael Rodriguez, Peninsula IP Partners
```

**Expected Output:** Complete trademark application with proper formatting, including all required sections and the geographic identifier prominently featured.

---

## Test Scenario 2: Mutual NDA for Settlement Discussions
**Document Type:** Non-Disclosure Agreement (IP-Specific)  
**Scenario:** Both parties agree to enter confidential settlement negotiations and need an NDA before sharing sensitive business information.

**Test Input:**
```
Generate a mutual NDA for:
- First Party: Iris Design Studio (Samantha Lee)
- Second Party: Iris Creative Group, Inc. (New York corporation)
- Purpose: To discuss potential trademark coexistence agreement and settlement terms
- Specific confidential info: Customer lists, revenue data, expansion plans, marketing strategies, settlement proposals
- IP provisions: Yes (include provisions about trademark rights and potential licensing)
- Term: 2 years
- Governing state: California
- Special considerations: Information shared during settlement negotiations should be inadmissible in any subsequent proceedings
- Attorney preparing: Michael Rodriguez
```

**Expected Output:** Mutual NDA with specific provisions for settlement discussions and IP considerations.

---

## Test Scenario 3: Cease and Desist Letter (Defensive)
**Document Type:** Cease and Desist Letter  
**Scenario:** A third company "Iris Digital Designs" starts operating in San Francisco, potentially infringing on Iris Design Studio's common law rights.

**Test Input:**
```
Generate a cease and desist letter for:
- Sender: Iris Design Studio
- Recipient: Iris Digital Designs, 456 Market Street, San Francisco, CA 94105
- Issue: Trademark infringement and unfair competition
- Our rights: Common law trademark rights in "IRIS DESIGN STUDIO" since 2015 in Bay Area for design services
- Their infringement: Using "IRIS DIGITAL DESIGNS" for similar graphic design services in same geographic area starting March 2023
- Evidence: Customer confusion (two clients called asking if it's a rebrand), similar services, same geographic market
- Demands: 
  1. Cease use of IRIS DIGITAL DESIGNS
  2. Transfer domain irisdigitaldesigns.com
  3. Destroy marketing materials
  4. Account for any profits
- Deadline: 14 days
- Tone: Firm but professional (Michael Rodriguez style - business-focused)
```

**Expected Output:** Cease and desist letter that balances firmness with Michael's accessible communication style.

---

## Test Scenario 4: Office Action Response
**Document Type:** Office Action Response  
**Scenario:** After filing the amended application for "IRIS DESIGN STUDIO SF", the USPTO issues an office action citing potential confusion with a different mark "IRIS GRAPHICS SF" (Reg. No. 5,234,567).

**Test Input:**
```
Generate an office action response for:
- Application Number: 97/456,789
- Applicant: Iris Design Studio (Samantha Lee)
- Mark: IRIS DESIGN STUDIO SF
- Examiner: John Smith
- Art Unit: 1234
- Office Action Date: August 15, 2023
- Rejection Type: Section 2(d) - Likelihood of confusion with "IRIS GRAPHICS SF"
- Arguments:
  1. Different services (general graphics vs. specialized UI/UX design)
  2. Different customer base (print media vs. tech startups)
  3. Coexistence with other IRIS marks
  4. Consent agreement pending with Iris Creative Group
  5. Strong secondary meaning in Bay Area market
- Amendment: Amend services to emphasize "specialized user interface and user experience design for technology companies"
- Attorney: Michael Rodriguez
- Response strategy: Argue differences and amend description
```

**Expected Output:** Office action response with Michael Rodriguez's accessible style explaining the distinctions and proposing amendments.

---

## Notes for Testing

1. **Style Consistency**: All documents should reflect Michael Rodriguez's communication style - clear, accessible, business-focused
2. **Cross-References**: Documents should reference the ongoing dispute and matter number IDS-2023-002 where appropriate
3. **Realistic Details**: Use actual dates, addresses, and business details from the mock data
4. **Legal Accuracy**: Ensure proper legal language while maintaining readability
5. **Context Awareness**: System should recognize and incorporate relevant background from existing documents

## Additional Test Variations

- Test with missing information to see how system handles required fields
- Test with conflicting information (e.g., wrong attorney name) to check validation
- Test tone variations (formal vs. friendly) to ensure style consistency
- Test with additional context from mock data files to see integration 