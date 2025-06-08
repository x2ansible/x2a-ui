/**
 * Enhanced NextJS API Route for Validation - Production Ready
 * 
 * Features:
 * - Comprehensive error handling and logging
 * - Request/response validation
 * - Timeout handling with proper cleanup
 * - Retry logic with exponential backoff
 * - Detailed request/response logging
 * - CORS handling and security headers
 */

import { NextRequest, NextResponse } from "next/server";

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const REQUEST_TIMEOUT = 65000; // 65 seconds (slightly more than backend timeout)
const MAX_RETRIES = 2;
const VALID_PROFILES = ["basic", "production", "safety", "test", "minimal"];
const MAX_PLAYBOOK_SIZE = 1024 * 1024; // 1MB

// Types for better type safety
interface ValidateRequestBody {
  playbook: string;
  lint_profile?: string;
}

interface ErrorResponse {
  error: string;
  detail?: string;
  code?: string;
  timestamp?: string;
  request_id?: string;
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateRequestBody(body: any): { isValid: boolean; error?: string; data?: ValidateRequestBody } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object' };
  }

  if (!body.playbook || typeof body.playbook !== 'string') {
    return { isValid: false, error: 'playbook field is required and must be a string' };
  }

  if (body.playbook.trim().length === 0) {
    return { isValid: false, error: 'playbook content cannot be empty' };
  }

  if (body.playbook.length > MAX_PLAYBOOK_SIZE) {
    return { isValid: false, error: `playbook content too large (max ${MAX_PLAYBOOK_SIZE / 1024}KB)` };
  }

  const lintProfile = body.lint_profile || "production";
  if (!VALID_PROFILES.includes(lintProfile)) {
    return { isValid: false, error: `Invalid lint_profile. Must be one of: ${VALID_PROFILES.join(', ')}` };
  }

  return {
    isValid: true,
    data: {
      playbook: body.playbook.trim(),
      lint_profile: lintProfile
    }
  };
}

async function makeBackendRequest(url: string, body: ValidateRequestBody, requestId: string, attempt: number = 1): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    console.log(` [${requestId}] Attempt ${attempt}: Sending request to ${url}`);
    console.log(`📊 [${requestId}] Request body:`, {
      playbook_length: body.playbook.length,
      lint_profile: body.lint_profile,
      playbook_preview: body.playbook.substring(0, 100) + (body.playbook.length > 100 ? '...' : '')
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "x2ansible-frontend/2.0.0",
        "X-Request-ID": requestId,
        "X-Attempt": attempt.toString()
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`📥 [${requestId}] Backend response:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      attempt: attempt
    });

    return response;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`⏰ [${requestId}] Request timed out after ${REQUEST_TIMEOUT}ms (attempt ${attempt})`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    }
    
    console.error(` [${requestId}] Network error (attempt ${attempt}):`, error);
    throw error;
  }
}

async function handleBackendResponse(response: Response, requestId: string): Promise<any> {
  const contentType = response.headers.get("content-type");
  console.log(`📄 [${requestId}] Response content-type: ${contentType}`);

  if (!contentType || !contentType.includes("application/json")) {
    const textResponse = await response.text();
    console.error(` [${requestId}] Backend returned non-JSON response:`, {
      status: response.status,
      content_type: contentType,
      response_preview: textResponse.substring(0, 500)
    });
    
    throw new Error(`Backend returned invalid response format (${contentType || 'unknown'})`);
  }

  try {
    const data = await response.json();
    
    if (!response.ok) {
      console.error(` [${requestId}] Backend error response:`, {
        status: response.status,
        data: data
      });
      
      // Extract meaningful error message
      let errorMessage = 'Unknown backend error';
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.detail.message) {
          errorMessage = data.detail.message;
        } else if (data.detail.error) {
          errorMessage = data.detail.error;
        }
      } else if (data.error) {
        errorMessage = data.error;
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.data = data;
      throw error;
    }

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response structure from backend');
    }

    // Log successful response details
    console.log(` [${requestId}] Backend response processed:`, {
      success: data.success,
      validation_passed: data.validation_passed,
      issues_count: data.issues?.length || 0,
      processing_time: data.processing_time,
      agent_analysis_length: data.agent_analysis?.length || 0
    });

    return data;

  } catch (parseError) {
    console.error(` [${requestId}] Failed to parse JSON response:`, parseError);
    throw new Error('Failed to parse backend response');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(` [${requestId}] Validation request started`);
  console.log(`🌐 [${requestId}] Backend URL: ${BACKEND_URL}`);
  console.log(`📋 [${requestId}] Request headers:`, {
    'content-type': request.headers.get('content-type'),
    'user-agent': request.headers.get('user-agent'),
    'origin': request.headers.get('origin')
  });

  try {
    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(` [${requestId}] Failed to parse request JSON:`, parseError);
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          detail: "Request body must be valid JSON",
          code: "INVALID_JSON",
          timestamp: new Date().toISOString(),
          request_id: requestId
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate request structure
    const validation = validateRequestBody(body);
    if (!validation.isValid) {
      console.error(` [${requestId}] Request validation failed: ${validation.error}`);
      return NextResponse.json(
        {
          error: "Invalid request",
          detail: validation.error,
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
          request_id: requestId
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const validatedData = validation.data!;
    console.log(` [${requestId}] Request validation passed`);

    // Prepare backend request
    const backendUrl = `${BACKEND_URL}/api/validate`;
    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        // Add delay for retries (exponential backoff)
        if (attempt > 1) {
          const delay = Math.pow(2, attempt - 2) * 1000; // 1s, 2s, 4s
          console.log(`⏳ [${requestId}] Waiting ${delay}ms before retry ${attempt}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Make backend request
        const response = await makeBackendRequest(backendUrl, validatedData, requestId, attempt);
        
        // Handle response
        const data = await handleBackendResponse(response, requestId);
        
        // Success! Calculate total time and return
        const totalTime = Date.now() - startTime;
        console.log(`🎉 [${requestId}] Request completed successfully in ${totalTime}ms`);
        
        // Add metadata to response
        data.request_id = requestId;
        data.total_processing_time = totalTime / 1000;
        
        return NextResponse.json(data, {
          headers: {
            'X-Request-ID': requestId,
            'X-Processing-Time': totalTime.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

      } catch (error) {
        lastError = error as Error;
        console.error(` [${requestId}] Attempt ${attempt} failed:`, error);

        // Don't retry on certain errors
        if (error instanceof Error) {
          const errorAny = error as any;
          
          // Don't retry on client errors (4xx)
          if (errorAny.status >= 400 && errorAny.status < 500) {
            console.log(`🚫 [${requestId}] Not retrying due to client error (${errorAny.status})`);
            break;
          }
          
          // Don't retry on request validation errors
          if (error.message.includes('Invalid request') || error.message.includes('validation')) {
            console.log(`🚫 [${requestId}] Not retrying due to validation error`);
            break;
          }
        }

        // If this was the last attempt, break
        if (attempt > MAX_RETRIES) {
          console.error(` [${requestId}] All ${MAX_RETRIES + 1} attempts failed`);
          break;
        }

        console.log(`🔄 [${requestId}] Will retry (${attempt}/${MAX_RETRIES} failed)`);
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    const errorMessage = lastError?.message || 'Unknown error occurred';
    const errorStatus = (lastError as any)?.status || 500;
    
    console.error(` [${requestId}] Request failed after ${totalTime}ms:`, errorMessage);

    return NextResponse.json(
      {
        error: "Backend request failed",
        detail: errorMessage,
        code: errorStatus >= 500 ? "BACKEND_ERROR" : "CLIENT_ERROR",
        timestamp: new Date().toISOString(),
        request_id: requestId,
        attempts_made: MAX_RETRIES + 1,
        total_time: totalTime
      } as ErrorResponse,
      { 
        status: errorStatus >= 500 ? 502 : errorStatus, // Convert 5xx to 502 Bad Gateway
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': totalTime.toString()
        }
      }
    );

  } catch (error) {
    // Catch any unexpected errors
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(` [${requestId}] Unexpected error after ${totalTime}ms:`, error);

    return NextResponse.json(
      {
        error: "Internal server error",
        detail: errorMessage,
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        request_id: requestId,
        total_time: totalTime
      } as ErrorResponse,
      { 
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': totalTime.toString()
        }
      }
    );
  }
}

// Health check endpoint
export async function GET() {
  const requestId = generateRequestId();
  
  try {
    console.log(`🏥 [${requestId}] Health check request`);
    
    // Test backend connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
    
    try {
      const response = await fetch(`${BACKEND_URL}/validate/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'x2ansible-frontend-health/2.0.0',
          'X-Request-ID': requestId
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      const backendData = response.ok ? await response.json() : null;
      
      return NextResponse.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        frontend: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          backend_url: BACKEND_URL
        },
        backend: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          response_code: response.status,
          data: backendData
        },
        request_id: requestId
      }, {
        status: isHealthy ? 200 : 503,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
    } catch (healthError) {
      clearTimeout(timeoutId);
      throw healthError;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(` [${requestId}] Health check failed:`, error);
    
    return NextResponse.json({
      status: 'unhealthy',
      frontend: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      backend: {
        status: 'unhealthy',
        error: errorMessage
      },
      request_id: requestId
    }, {
      status: 503,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}