import * as functions from "firebase-functions";
import express, { Request, Response } from "express";
import cors from "cors";
import OpenAI from "openai";
import axios from 'axios';
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Import data from local file
import { employeeAccountInfo, dataBase, checkEmployeeAuthorisation } from './sampleData';

const app = express();
const api = express.Router();

// Enable CORS if your frontend is on a different origin
app.use(cors({ origin: true }));

// Parse JSON bodies
app.use(express.json());

// abuse protection middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 3 * 60 * 1000; // 3mins
const MAX_REQUESTS_PER_WINDOW = 50;

app.use('/api', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up old entries
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
  
  // Check current IP
  const ipData = requestCounts.get(clientIP);
  if (!ipData) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else if (now > ipData.resetTime) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    ipData.count++;
    if (ipData.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: `Too many requests. Please try again in ${Math.ceil((ipData.resetTime - now) / 60000)} minutes.`,
        retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
      });
    }
  }
  
  // Request validation
  if (req.path.includes('/session') && !['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (req.path.includes('/responses') && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Mount the API router after rate limiting
app.use('/api', api);

// Function to execute tool calls
async function executeToolCall(toolName: string, args: any) {
  console.log(`[executeToolCall] Executing ${toolName} with args:`, args);
  
  switch (toolName) {
    case "getEmployeeAccountInfo": {
      console.log(`[executeToolCall] Getting employee info for pass_code: ${args.pass_code}`);
      const employees = Object.values(employeeAccountInfo);
      
      // Normalize the input pass code by removing any hyphens and ensuring 4 digits
      const normalizedInputPassCode = args.pass_code.replace(/-/g, '');
      console.log(`[executeToolCall] Normalized input pass_code: ${normalizedInputPassCode}`);
      
      // Find employee by comparing normalized pass codes
      const employee = employees.find(emp => {
        const normalizedStoredPassCode = emp.passCode.replace(/-/g, '');
        console.log(`[executeToolCall] Comparing ${normalizedInputPassCode} with ${normalizedStoredPassCode}`);
        return normalizedStoredPassCode === normalizedInputPassCode;
      });
      
      if (employee) {
        const message = `Hello ${employee.name}. Here is your account information:
- Employee ID: ${employee.employeeID}
- Position: ${employee.position}
- Account Status: ${employee.status}
${employee.status === "compromised" ? "Your account is at risk! Please contact security immediately." : "Your account is secure."}

Recent Activities:
- Network Traffic: ${employee.lastActivities.networkTraffic}
- Two-Factor Authentication: ${employee.lastActivities.twoFactorAuthentification}
- VPN Status: ${employee.lastActivities.VPN}

${employee.lastActivities.notes}`;

        return {
          success: true,
          message: message,
          employee: employee
        };
      } else {
        console.log(`[executeToolCall] No employee found with passcode: ${args.pass_code}`);
        return {
          success: false,
          message: "Pass code not found. Please check your pass code and try again."
        };
      }
    }
    
    case "checkEmployeeAuthorisation": {
      console.log(`[executeToolCall] checkEmployeeAuthorisation called with args:`, args);
      console.log(`[executeToolCall] args.employeeID value: "${args.employeeID}"`);
      const result = checkEmployeeAuthorisation(args.employeeID);
      console.log(`[executeToolCall] checkEmployeeAuthorisation result:`, result);
      
      // If unauthorized, send security notification email
      if (!result.Authorised) {
        console.log(`[executeToolCall] Unauthorised access attempt, sending security notification`);
        
        // Actually execute the sendEmail tool call
        const emailResult = await executeToolCall("sendEmail", {
          recipient: "productManager@gmail.com",
          subject: "Unauthorised Database Access Attempt",
          body: `An unauthorised attempt was made to access the database by Employee ID: ${args.employeeID}. Please open investigation inside log history.`
        });
        
        console.log(`[executeToolCall] Email notification result:`, emailResult);
        
        // Return result with notification info
        return {
          ...result,
          emailSent: true,
          emailDetails: {
            recipient: "productManager@gmail.com",
            subject: "Unauthorised Database Access Attempt",
            body: `An unauthorised attempt was made to access the database by Employee ID: ${args.employeeID}. Please open investigation inside log history.`
          },
          securityNotification: "Security team has been notified of this unauthorized access attempt."
        };
      }
      
      return result;
    }
    
    case "lookupDatabase": {
      return dataBase;
    }
    
    case "sendEmail": {
      console.log(`[executeToolCall] Sending email to: ${args.recipient}`);
      console.log(`[executeToolCall] Subject: ${args.subject}`);
      console.log(`[executeToolCall] Body: ${args.body}`);
      return { success: true, message: "Email notification sent successfully" };
    }
    
    case "sendEmailToEmployee": {
      console.log(`[executeToolCall] Looking up employee: ${args.employeeNameOrId}`);
      const allEmployees = Object.values(employeeAccountInfo);
      
      // Find employee by name or employee ID
      const targetEmployee = allEmployees.find(emp => 
        emp.name.toLowerCase() === args.employeeNameOrId.toLowerCase() || 
        emp.employeeID === args.employeeNameOrId
      );
      
      if (targetEmployee) {
        console.log(`[executeToolCall] Found employee: ${targetEmployee.name} (${targetEmployee.email})`);
        console.log(`[executeToolCall] Subject: ${args.subject}`);
        console.log(`[executeToolCall] Message: ${args.message}`);
        return {
          success: true,
          message: `Email sent successfully to ${targetEmployee.name} (${targetEmployee.email})`,
          recipient: targetEmployee.name,
          email: targetEmployee.email
        };
      } else {
        console.log(`[executeToolCall] Employee not found: ${args.employeeNameOrId}`);
        return {
          success: false,
          message: `Employee not found: ${args.employeeNameOrId}. Please check the name or employee ID and try again.`
        };
      }
    }
    
    default:
      console.warn(`[executeToolCall] Unknown tool: ${toolName}`);
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// Session endpoint for frontend compatibility
api.get("/session", async (req: Request, res: Response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const r = await axios.post("https://api.openai.com/v1/realtime/sessions", {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "sage",
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    res.status(r.status).json(r.data);
  } catch (error: any) {
    console.error("Session error:", error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data || error.message });
  }
});

// Add POST endpoint for session
api.post("/session", async (req: Request, res: Response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const r = await axios.post("https://api.openai.com/v1/realtime/sessions", {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "sage",
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    res.status(r.status).json(r.data);
  } catch (error: any) {
    console.error("Session error:", error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data || error.message });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// responses endpoint that handles tool calls
api.post("/responses", async (req: Request, res: Response) => {
  try {
    const { input, tools, parallel_tool_calls } = req.body;
    
    if (!input || !Array.isArray(input)) {
      return res.status(400).json({ error: "Invalid input format" });
    }

    console.log(`[/api/responses] Received input:`, JSON.stringify(input, null, 2));

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Convert the input format to OpenAI messages format
    const messages: Array<ChatCompletionMessageParam> = [];
    
    for (let i = 0; i < input.length; i++) {
      const msg = input[i];
      
      // Handle regular messages
      if (msg.role && msg.type === 'message') {
        let content = "";
        
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (msg.text) {
          content = msg.text;
        }
        
        if (msg.role === "tool") {
          messages.push({
            role: "tool",
            content: content || "Hello",
            tool_call_id: msg.tool_call_id || "default"
          });
        } else {
          messages.push({
            role: msg.role as "user" | "assistant" | "system",
            content: content || "Hello"
          });
        }
      }
      
      // Handle function calls and their outputs
      else if (msg.type === 'function_call') {
        // Add the assistant message with tool call
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [{
            id: msg.call_id,
            type: "function",
            function: {
              name: msg.name,
              arguments: msg.arguments
            }
          }]
        });
        
        // Look for the corresponding function call output
        if (i + 1 < input.length && input[i + 1].type === 'function_call_output' && input[i + 1].call_id === msg.call_id) {
          messages.push({
            role: "tool",
            content: input[i + 1].output,
            tool_call_id: msg.call_id
          });
          i++; // Skip the function call output in the next iteration
        }
      }
      
      // Handle standalone messages without role (skip with log)
      else if (!msg.role) {
        console.log(`[/api/responses] Skipping message without role:`, msg);
      }
    }

    console.log(`[/api/responses] Converted messages:`, JSON.stringify(messages, null, 2));
    
    // Add system message if not present
    if (!messages.some(msg => msg.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: `You are a security system assistant. Follow these rules strictly:

TOOL SELECTION RULES:
1. If the context contains "employee ID: XXXX" → ALWAYS use checkEmployeeAuthorisation(employeeID="XXXX")
2. If the context contains "pass code: XXXX" → ALWAYS use getEmployeeAccountInfo(pass_code="XXXX")

EXAMPLES:
- Context: "employee ID: 1506" → Call checkEmployeeAuthorisation(employeeID="1506")
- Context: "pass code: 0110" → Call getEmployeeAccountInfo(pass_code="0110")

CRITICAL RULES:
- getEmployeeAccountInfo ONLY takes pass codes (4 digits like "0110", "0505")
- checkEmployeeAuthorisation ONLY takes employee IDs (4 digits like "1190", "1506")
- If user provides employee ID, they want database access - use checkEmployeeAuthorisation
- If user provides pass code, they want account info - use getEmployeeAccountInfo
- NEVER call the wrong function with the wrong parameter type

WORKFLOW:
1. Database access requests → checkEmployeeAuthorisation(employeeID)
2. Account info requests → getEmployeeAccountInfo(pass_code)
3. If unauthorized, system sends security notification automatically`
      });
    }
    
    // Convert tools format if needed and provide default tools
    let formattedTools = tools;
    if (tools && Array.isArray(tools)) {
      formattedTools = tools.map((tool: any) => {
        // If tool has a 'function' property, it's already in the correct format
        if (tool.function) {
          return tool;
        }
        // Otherwise, wrap it in the function property
        return {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        };
      });
    } else {
      // Provide default tools when none are specified
      formattedTools = [
        {
          type: "function",
          function: {
            name: "getEmployeeAccountInfo",
            description: "Get employee account information using their PASS CODE. Returns employee details including their employee ID. Use this when user provides a 4-digit pass code like 0110, 0505.",
            parameters: {
              type: "object",
              properties: {
                pass_code: {
                  type: "string",
                  description: "Employee pass code (4 digits like 0110, 0505, may include hyphens like 01-10)"
                }
              },
              required: ["pass_code"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "checkEmployeeAuthorisation",
            description: "Check if an employee has authorization to access the database using their EMPLOYEE ID (NOT pass code). Returns full database access if authorized. Automatically sends security notification if unauthorized.",
            parameters: {
              type: "object",
              properties: {
                employeeID: {
                  type: "string",
                  description: "Employee ID (4 digits like 1190, 1506) - get this from getEmployeeAccountInfo first"
                }
              },
              required: ["employeeID"]
            }
          }
        }
      ];
    }

    // Let Agent decides which tool to use based on context
    const userMessages = messages.filter(msg => msg.role === 'user');
    const userInputText = JSON.stringify(userMessages).toLowerCase();
    
    // Check if we should force tool calling
    const hasPassCode = userInputText.includes('pass code') || userInputText.includes('passcode');
    const hasEmployeeId = userInputText.includes('employee id') || userInputText.includes('employeeid');
    const hasAuthRequest = userInputText.includes('authorization') || userInputText.includes('authorisation') || 
                          userInputText.includes('database access') || userInputText.includes('database');
    const hasFourDigits = /\b\d{4}\b/.test(userInputText);
    
    const shouldForceTools = hasPassCode || hasEmployeeId || hasAuthRequest || hasFourDigits;
    
    console.log(`[/api/responses] Force tools: ${shouldForceTools}, hasPassCode: ${hasPassCode}, hasEmployeeId: ${hasEmployeeId}, hasAuthRequest: ${hasAuthRequest}, hasFourDigits: ${hasFourDigits}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: messages,
      ...(formattedTools && { tools: formattedTools }),
      ...(shouldForceTools && { 
        tool_choice: "required"
      }),
      ...(parallel_tool_calls !== undefined && { parallel_tool_calls }),
    });

    const assistantMessage = completion.choices[0].message;
    
    // Handle tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      const toolResult = await executeToolCall(toolCall.function.name, JSON.parse(toolCall.function.arguments));
      
      // Add the tool call and result to the messages
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [{
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments
          }
        }]
      });
      
      messages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id
      });
      
      // Get the final response
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages
      });
      
      res.json({ 
        output: [
          {
            type: "message",
            role: "assistant", 
            content: [
              {
                type: "output_text",
                text: finalCompletion.choices[0].message.content
              }
            ]
          }
        ]
      });
    } else {
      res.json({ 
        output: [
          {
            type: "message",
            role: "assistant", 
            content: [
              {
                type: "output_text",
                text: assistantMessage.content
              }
            ]
          }
        ]
      });
    }
  } catch (error) {
    console.error("Responses error:", error);
    res.status(500).json({ error: "Failed to process response" });
  }
});

// Export the Express app as a single Cloud Function
exports.voiceAssistant = functions.https.onRequest(app);

