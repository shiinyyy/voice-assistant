# Voice Assistant - Lucida

A real-time voice assistant designed for enterprise security workflows, featuring multi-model AI integration for authentication, fraud detection, and database access control.

## Project Overview

Lucida is an intelligent voice assistant that performs security-critical operations for data management. The system implements authentication pipeline with real-time fraud detection capabilities, designed to integrate into enterprise security workflows where voice-based authentication and data access control are essential.

## Core Functionality

### Security Operations
- **Authentication**: Pass code verification with employee database lookup
- **Fraud Detection**: Real-time monitoring and alerting for unauthorised access attempts  
- **Database Access Control**: Role-based authorisation with audit trail logging
- **Email Alert*: Automated notifications for security violations

### Workflow Integration
The assistant fits into enterprise security workflows as:
- **First-line Authentication**: Voice-based identity verification for secure systems
- **Security Monitoring**: Continuous fraud detection and incident response
- **Audit Compliance**: Complete logging of authentication attempts and access requests
- **Incident Response**: Automated alerting to security personnel for unauthorised activities

## Technical Architecture

### AI Models and Tools

**Primary Models:**
- **gpt-4.1**: Handles complex reasoning, context analysis, and decision-making
- **gpt-4o-realtime**: Processes real-time audio and text input/output streams

**Integration Framework:**
- **OpenAI Realtime SDK**: Real-time bidirectional communication
- **OpenAI Agents SDK**: Multi-agent coordination and tool execution
- **Firebase Functions**: Serverless backend infrastructure
- **Next.js**: Frontend framework with API routing

**Backend Services:**
- **Node.js/TypeScript**: Server-side logic and API endpoints
- **Firebase Hosting**: Static asset delivery and routing
- **Express.js**: RESTful API handling

## Hosting Infrastructure

**Production Environment:**
- **Frontend**: Deployed on Firebase Hosting
- **Backend**: Firebase Functions (serverless)
- **Endpoints**: 
  - `/api/session` - OpenAI session management
  - `/api/responses` - Model response handling

## Setup Guide

### Prerequisites
```bash
Node.js 20 // firebase does not support > 20
Firebase CLI
OpenAI API Key
```

### Installation
```bash
# Clone repository
git clone https://github.com/shiinyyy/voice-assistant
cd voice-assistant

# Install dependencies
npm install
cd functions && npm install && cd ..

# Environment setup
echo "OPENAI_API_KEY=your_openai_key" > .env.local
echo "OPENAI_API_KEY=your_openai_key" > functions/.env
```

### Development
```bash
# Start development server
npm run dev

# Deploy functions
cd functions
npm run deploy
```

### Production Build
```bash
npm run build
firebase deploy
```

## Security Features

### Authentication
1. **Voice Input Processing**: Speech-to-text conversion
2. **Verification**: Database lookup against employee records  
3. **Identity Confirmation**: Multi-factor verification with employee ID
4. **Access Authorisation**: Role-based permissions enforcement

### Fraud Detection
- **Unauthorised Access Monitoring**: Real-time detection of invalid credentials
- **Behavioral Analysis**: Pattern recognition for suspicious activities
- **Automated Alerting**: Email notifications to security personnel
- **Audit Trail**: Complete logging of all authentication attempts

## Technical Challenges and Solutions

### Server Architecture Challenges
**Challenge**: Integrating real-time voice processing with serverless functions
**Solution**: Implemented hybrid architecture using Firebase Functions for business logic and OpenAI Realtime SDK for voice processing, with proper session management

**Challenge**: Handling concurrent voice sessions and maintaining state
**Solution**: Stateless design with session tokens and proper cleanup mechanisms, avoiding memory leaks in serverless environment.

### Model Context Management
**Challenge**: Maintaining conversation context across multiple model interactions
**Solution**: Developed sophisticated context extraction system that preserves conversation state while preventing context pollution from previous interactions.

**Challenge**: Coordinating between multiple AI models
**Solution**: Implemented agent handoff system with clear role separation and context passing.

### System Architecture Complexity
**Challenge**: Balancing real-time performance with security identification
**Solution**: Designed multi-layered architecture with edge-side processing for latency and server-side validation for security.

**Challenge**: Ensuring consistent behavior across development and production environments
**Solution**: Environment configuration with proper API routing and CORS handling for cross-origin requests.

## API Configuration

### Model Parameters
```typescript
// Realtime Model Configuration
model: "gpt-4o-realtime-preview-2024-12-17"
voice: "sage"
max_tokens: 1000

// Responses Model Configuration  
model: "gpt-4.1"
max_completion_tokens: 500
```

### Security Configuration
```typescript
// Authentication Settings
pass_code_format: "XX-XX" (4 digits with hyphen)
employee_id_format: "XXXX" (4 digits)
session_timeout: 300000
max_attempts: 3
```

## System Requirements

**Minimum Requirements:**
- Modern web browser with WebRTC support
- Microphone and audio output capabilities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Happy testing
```bash
voice.minhducdo.info
```bash