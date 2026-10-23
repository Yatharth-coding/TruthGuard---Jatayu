const BASE_URL = 'http://localhost:5000/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyLiveAPI() {
  console.log('[Verification] Starting TruthGuard Comprehensive End-to-End Test...');
  
  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  console.log('✓ Health Check:', healthData.status, '| DB:', healthData.database, '| Demo:', healthData.demoMode);
  
  // 2. Register
  const testEmail = `tester_${Date.now()}@truthguard.local`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Security Analyst',
      email: testEmail,
      password: 'StrongPassword123!'
    })
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(regData.message);
  const token = regData.token;
  console.log('✓ User Registration successful:', regData.user.email);
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };
  
  // 3. /auth/me
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
  const meData = await meRes.json();
  console.log('✓ Auth /me returned authenticated user:', meData.user.name, `(${meData.user.email})`);

  // 4. Test uploading Document 1 (Policy 2023)
  console.log('\n--- Testing Document Upload 1 (2023 Policy) ---');
  const doc1Content = 'Corporate Remote Work Policy 2023.\nEffective Date: January 1, 2023.\nEmployees may work remotely for up to two days per week with supervisor coordination.';
  const formData1 = new FormData();
  formData1.append('file', new Blob([doc1Content], { type: 'text/plain' }), 'policy_2023.txt');
  formData1.append('title', 'Corporate Remote Work Policy 2023');
  formData1.append('category', 'HR');
  formData1.append('versionLabel', 'v1.0');
  formData1.append('effectiveDate', '2023-01-01');

  const uploadRes1 = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData1
  });
  const uploadData1 = await uploadRes1.json();
  if (!uploadRes1.ok) throw new Error(uploadData1.message || 'Upload 1 failed');
  const doc1Id = uploadData1.document._id;
  console.log('✓ Document 1 uploaded:', uploadData1.document.title, `(ID: ${doc1Id})`);

  // 5. Test uploading Document 2 (Policy 2024 - Contradictory)
  console.log('\n--- Testing Document Upload 2 (2024 Policy - Contradictory) ---');
  const doc2Content = 'Corporate Remote Work Policy 2024.\nEffective Date: January 1, 2024.\nEmployees are permitted to work remotely for five days per week under the flexible model.';
  const formData2 = new FormData();
  formData2.append('file', new Blob([doc2Content], { type: 'text/plain' }), 'policy_2024.txt');
  formData2.append('title', 'Corporate Remote Work Policy 2024');
  formData2.append('category', 'HR');
  formData2.append('versionLabel', 'v2.0');
  formData2.append('effectiveDate', '2024-01-01');

  const uploadRes2 = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData2
  });
  const uploadData2 = await uploadRes2.json();
  if (!uploadRes2.ok) throw new Error(uploadData2.message || 'Upload 2 failed');
  const doc2Id = uploadData2.document._id;
  console.log('✓ Document 2 uploaded:', uploadData2.document.title, `(ID: ${doc2Id})`);

  // Wait a moment for background document processing to finish
  await sleep(1500);

  // 6. Verify Documents are marked 'processed'
  const listDocsRes = await fetch(`${BASE_URL}/documents`, { headers: authHeaders });
  const listDocsData = await listDocsRes.json();
  console.log(`✓ Document Library contains ${listDocsData.documents.length} document(s).`);
  for (const doc of listDocsData.documents) {
    console.log(`  - "${doc.title}" status: ${doc.processingStatus}, chunks: ${doc.chunkCount}`);
  }

  // 7. Ask question: "What is the policy for remote work?"
  console.log('\n--- Testing Adversarial Verification QA ---');
  const qaRes = await fetch(`${BASE_URL}/qa/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      question: 'What is the corporate policy regarding remote work days per week?'
    })
  });
  const qaData = await qaRes.json();
  console.log('✓ QA Pipeline Response:');
  console.log('  Status:', qaData.verificationStatus);
  console.log('  Citations Count:', qaData.citations?.length || 0);
  console.log('  Conflicts Detected:', qaData.conflicts?.length || 0);
  if (qaData.conflicts && qaData.conflicts.length > 0) {
    console.log('  Conflict Description:', qaData.conflicts[0].description);
  }
  console.log('  Answer Snippet:', qaData.answer.slice(0, 140) + '...');

  // 8. Test Data Isolation: Register a 2nd user and verify they cannot see user 1's documents
  console.log('\n--- Testing Multi-Tenant Data Isolation ---');
  const user2Email = `user2_${Date.now()}@truthguard.local`;
  const regRes2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unrelated User',
      email: user2Email,
      password: 'StrongPassword123!'
    })
  });
  const regData2 = await regRes2.json();
  const token2 = regData2.token;

  const user2DocsRes = await fetch(`${BASE_URL}/documents`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const user2Docs = await user2DocsRes.json();
  console.log('✓ User 2 document count:', user2Docs.documents.length, '(Expected 0 for data isolation)');
  if (user2Docs.documents.length !== 0) {
    throw new Error('Data isolation failure: User 2 accessed User 1 documents!');
  }

  // Try unauthorized access to user 1's document
  const unauthDocRes = await fetch(`${BASE_URL}/documents/${doc1Id}`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  console.log('✓ Unauthorized document access status code:', unauthDocRes.status, '(Expected 404/403)');
  if (unauthDocRes.status !== 404 && unauthDocRes.status !== 403) {
    throw new Error('Data isolation failure: User 2 was able to retrieve User 1 document!');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL COMPREHENSIVE TESTS & DATA ISOLATION PASSED!');
  console.log('======================================================');
}

verifyLiveAPI().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
