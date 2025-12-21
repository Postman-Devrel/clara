# organizations

## Get Organizations

`GET /organizations/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### Example Request

```bash
curl \
  -H "Content-Type: application/json" \
  "//organizations/"
```


---

## Create Organization

`POST /organizations/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | - |
| email | string | Yes | - |
| phone | string | Yes | - |
| address | string | Yes | - |

**Example:**

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}
```

### Responses

#### 200 Successful Response

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "id": 1,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### Example Request

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"string","email":"string","phone":"string","address":"string"}' \
  "//organizations/"
```


---

## Get Organization

`GET /organizations/{organization_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| organization_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "id": 1,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### Example Request

```bash
curl \
  -H "Content-Type: application/json" \
  "//organizations/1"
```


---

## Update Organization

`PUT /organizations/{organization_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| organization_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | - |
| email | string | Yes | - |
| phone | string | Yes | - |
| address | string | Yes | - |

**Example:**

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}
```

### Responses

#### 200 Successful Response

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "id": 1,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### Example Request

```bash
curl \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"name":"string","email":"string","phone":"string","address":"string"}' \
  "//organizations/1"
```


---

## Delete Organization

`DELETE /organizations/{organization_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| organization_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
null
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### Example Request

```bash
curl \
  -X DELETE \
  -H "Content-Type: application/json" \
  "//organizations/1"
```


---
