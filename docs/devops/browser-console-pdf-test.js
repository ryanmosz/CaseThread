// Browser Console PDF Test Script
// Copy and paste this into the browser console after opening the app

// Find and click on a document to load it
async function loadFirstDocument() {
  const links = document.querySelectorAll('a[href^="#"]');
  for (const link of links) {
    const text = link.textContent;
    if (text && text.includes('.md')) {
      console.log('Loading document:', text);
      link.click();
      // Wait for document to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  }
  return false;
}

// Trigger PDF generation
async function testPDFGeneration() {
  console.log('=== Starting PDF Generation Test ===');
  
  // First, load a document
  const documentLoaded = await loadFirstDocument();
  if (!documentLoaded) {
    console.error('No document found to load');
    return;
  }
  
  // Wait a bit more for content to fully load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find the Generate PDF button
  const buttons = Array.from(document.querySelectorAll('button'));
  const generateButton = buttons.find(btn => 
    btn.textContent && btn.textContent.includes('Generate PDF')
  );
  
  if (!generateButton) {
    console.error('Generate PDF button not found');
    return;
  }
  
  console.log('Found Generate PDF button, clicking...');
  
  // Add a listener to catch any errors
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
  });
  
  // Click the button
  generateButton.click();
  
  console.log('PDF generation triggered, check the console for errors');
}

// Run the test
testPDFGeneration().catch(console.error); 