// Test script to verify UI validation request behavior
// This simulates the exact same request pattern the UI uses

const testValidationRequests = async () => {
  console.log('🧪 Starting UI validation request test...');
  
  const playbookContent = `---
- name: Playbook with relative paths
  hosts: localhost
  tasks:
    - name: Copy a file using a relative path
      ansible.builtin.copy:
        src: ../some_files/my_config.conf
        dest: /etc/my_config.conf

    - name: Template a file using a relative path
      ansible.builtin.template:
        src: ../some_templates/my_template.j2
        dest: /tmp/output.txt
`;

  const requestBody = {
    playbook_content: playbookContent,
    profile: "basic"
  };

  console.log('📤 Sending validation request...');
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('http://localhost:8000/api/validate/playbook/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:', errorText);
      return;
    }

    const contentType = response.headers.get('content-type');
    console.log('📥 Content-Type:', contentType);

    if (contentType?.includes('text/event-stream')) {
      console.log('📊 Processing streaming response...');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('📊 Stream reading completed');
            break;
          }
          
          if (!value) continue;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            eventCount++;
            console.log(`📊 Event ${eventCount}:`, trimmedLine);
            
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === '[DONE]') {
                console.log('📊 Received [DONE] signal');
                return;
              }
              
              try {
                const data = JSON.parse(dataStr);
                console.log('📊 Parsed data:', JSON.stringify(data, null, 2));
                
                if (data.type === 'result' && data.data) {
                  console.log('✅ Received validation result');
                  console.log('Result passed:', data.data.passed);
                  console.log('Issues count:', data.data.issues_count);
                  return;
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse line:', trimmedLine, parseError);
              }
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (lockError) {
          console.warn('⚠️ Error releasing reader lock:', lockError);
        }
      }
    } else {
      console.log('📊 Processing JSON response...');
      const data = await response.json();
      console.log('✅ Received JSON response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('💡 Make sure the backend is running on http://localhost:8000');
    }
  }
};

// Test multiple rapid requests to see if they cause issues
const testMultipleRequests = async () => {
  console.log('\n🧪 Testing multiple rapid requests...');
  
  const promises = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n📤 Starting request ${i}...`);
    promises.push(testValidationRequests());
    
    // Small delay between requests
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  try {
    await Promise.all(promises);
    console.log('\n✅ All requests completed');
  } catch (error) {
    console.error('\n❌ Some requests failed:', error);
  }
};

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testValidationRequests().then(() => {
    console.log('\n✅ Single request test completed');
    return testMultipleRequests();
  }).then(() => {
    console.log('\n✅ Multiple requests test completed');
  }).catch(console.error);
} else {
  // Browser environment
  testValidationRequests().then(() => {
    console.log('\n✅ Single request test completed');
    return testMultipleRequests();
  }).then(() => {
    console.log('\n✅ Multiple requests test completed');
  }).catch(console.error);
} 