# Error Handling

This guide describes how to handle errors returned by the API.

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request body and parameters |
| 401 | Unauthorized | Verify authentication credentials |
| 403 | Forbidden | Check permissions for this resource |
| 404 | Not Found | Verify the resource ID exists |
| 422 | Validation Error | Fix the validation issues in request |
| 429 | Rate Limited | Wait and retry with backoff |
| 500 | Server Error | Retry later, contact support if persists |

## Error Response Format

Error responses follow this structure:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": [
    {
      "field": "field_name",
      "message": "What was wrong with this field"
    }
  ]
}
```

## Handling Errors Programmatically

```javascript
async function callAPI(endpoint, options) {
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
      case 422:
        // Validation error - check error.details for field-level issues
        console.error('Validation failed:', error.details);
        break;
      case 401:
        // Re-authenticate
        await refreshToken();
        return callAPI(endpoint, options);
      case 429:
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        return callAPI(endpoint, options);
      default:
        throw new Error(error.message);
    }
  }

  return response.json();
}
```
