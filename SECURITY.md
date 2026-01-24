# Security & Hardening Documentation

This document outlines the security measures and error handling implemented in the Sentinel Timer application.

## Security Features

### 1. Input Validation & Sanitization
- **GSI Data Validation**: All incoming game state data is validated and sanitized using `validateAndSanitizeGSIData()`
- **Type Safety**: Strong TypeScript typing with runtime validation
- **Number Bounds**: All numeric values are clamped to safe ranges
- **Prototype Pollution Prevention**: Safe cloning prevents prototype pollution attacks

### 2. IPC Security
- **Rate Limiting**: IPC calls are rate-limited to prevent abuse (10 calls per second)
- **Message Validation**: All IPC messages are validated before processing
- **Callback Validation**: Callback functions are validated before registration
- **Data Sanitization**: All data passed through IPC is sanitized

### 3. Error Handling
- **Error Boundaries**: React Error Boundaries catch and handle component errors gracefully
- **Global Error Handlers**: Window-level error handlers catch unhandled errors
- **Promise Rejection Handling**: Unhandled promise rejections are caught and logged
- **Retry Logic**: Automatic retry with exponential backoff for transient failures

### 4. Process Management
- **Crash Recovery**: GSI server process automatically restarts on crash (with limits)
- **Restart Limits**: Maximum 5 restarts per minute to prevent restart loops
- **Graceful Shutdown**: Proper cleanup on application exit
- **Process Monitoring**: Uncaught exceptions in child processes are handled

### 5. Memory Management
- **Health Monitoring**: Automatic memory usage tracking and leak detection
- **Timer Tracking**: All timers are tracked and can be cleaned up
- **Listener Tracking**: Event listeners are tracked to prevent leaks
- **Memory Thresholds**: Warnings when memory usage exceeds 200MB

### 6. Timeout Protection
- **Request Timeouts**: All network requests have timeouts (2-3 seconds)
- **Operation Timeouts**: Long-running operations are wrapped with timeouts
- **Tracked Timers**: All timers use tracked timeout utilities for cleanup

### 7. Content Security Policy
- **CSP Headers**: Content Security Policy headers are set in Electron
- **Restricted Resources**: Only necessary resources are allowed
- **No Inline Scripts**: Unsafe inline scripts are restricted

## Error Recovery

### Automatic Recovery
- **Retry Logic**: Failed operations automatically retry with exponential backoff
- **State Recovery**: Application state is preserved during errors
- **Graceful Degradation**: Features degrade gracefully when dependencies fail

### User-Facing Recovery
- **Error Boundaries**: User-friendly error screens with retry options
- **Toast Notifications**: Non-critical errors shown as toast notifications
- **Status Indicators**: Connection status clearly displayed to users

## Monitoring & Logging

### Logging
- **Structured Logging**: All logs include context and timestamps
- **Log Rotation**: Only recent logs are kept (100 entries max)
- **Sensitive Data Redaction**: Passwords and tokens are redacted from logs
- **Development vs Production**: Different logging levels for dev/prod

### Health Monitoring
- **Memory Usage**: Tracked every 30 seconds
- **Component Mounts**: Tracked to detect memory leaks
- **Active Timers**: Monitored to prevent timer leaks
- **Active Listeners**: Monitored to prevent listener leaks

## Best Practices

### For Developers
1. Always use `validateAndSanitizeGSIData()` for GSI data
2. Use tracked timers (`createTrackedInterval`, `createTrackedTimeout`)
3. Wrap async operations with `retryWithBackoff()` for resilience
4. Use `logger` instead of `console.log` for production logging
5. Always clean up listeners and timers in useEffect cleanup

### Security Checklist
- ✅ Input validation on all external data
- ✅ Rate limiting on IPC calls
- ✅ Timeout protection on all async operations
- ✅ Memory leak prevention
- ✅ Error boundary coverage
- ✅ Process crash recovery
- ✅ Secure IPC communication
- ✅ Content Security Policy

## Testing Recommendations

1. **Error Injection**: Test with invalid GSI data
2. **Rate Limiting**: Verify IPC rate limits work
3. **Memory Leaks**: Monitor memory usage over extended periods
4. **Crash Recovery**: Test GSI server crash scenarios
5. **Network Failures**: Test behavior with network interruptions
6. **Timeout Scenarios**: Test with slow or unresponsive servers
