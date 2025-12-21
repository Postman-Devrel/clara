# drivers

## Get Drivers

`GET /drivers/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| status | string | No | - |
| organization_id | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "organization_id": 1,
    "first_name": "string",
    "last_name": "string",
    "email": "user@example.com",
    "phone": "string",
    "license_number": "string",
    "license_expiry": "2024-01-15T10:30:00Z",
    "hire_date": "2024-01-15T10:30:00Z",
    "status": "active",
    "rating": 5,
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
  "//drivers/"
```


---

## Create Driver

`POST /drivers/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| first_name | string | Yes | - |
| last_name | string | Yes | - |
| email | string | Yes | - |
| phone | string | Yes | - |
| license_number | string | Yes | - |
| license_expiry | string | Yes | - |
| hire_date | string | Yes | - |
| status | any | No | - |
| rating | any | No | - |

**Example:**

```json
{
  "organization_id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "string",
  "license_number": "string",
  "license_expiry": "2024-01-15T10:30:00Z",
  "hire_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "rating": 5
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "string",
  "license_number": "string",
  "license_expiry": "2024-01-15T10:30:00Z",
  "hire_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "rating": 5,
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
  -d '{"organization_id":1,"first_name":"string","last_name":"string","email":"user@example.com","phone":"string","license_number":"string","license_expiry":"2024-01-15T10:30:00Z","hire_date":"2024-01-15T10:30:00Z","status":"active","rating":5}' \
  "//drivers/"
```


---

## Get Driver

`GET /drivers/{driver_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| driver_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "string",
  "license_number": "string",
  "license_expiry": "2024-01-15T10:30:00Z",
  "hire_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "rating": 5,
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
  "//drivers/1"
```


---

## Update Driver

`PUT /drivers/{driver_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| driver_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| first_name | string | Yes | - |
| last_name | string | Yes | - |
| email | string | Yes | - |
| phone | string | Yes | - |
| license_number | string | Yes | - |
| license_expiry | string | Yes | - |
| hire_date | string | Yes | - |
| status | any | No | - |
| rating | any | No | - |

**Example:**

```json
{
  "organization_id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "string",
  "license_number": "string",
  "license_expiry": "2024-01-15T10:30:00Z",
  "hire_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "rating": 5
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "string",
  "license_number": "string",
  "license_expiry": "2024-01-15T10:30:00Z",
  "hire_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "rating": 5,
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
  -d '{"organization_id":1,"first_name":"string","last_name":"string","email":"user@example.com","phone":"string","license_number":"string","license_expiry":"2024-01-15T10:30:00Z","hire_date":"2024-01-15T10:30:00Z","status":"active","rating":5}' \
  "//drivers/1"
```


---

## Delete Driver

`DELETE /drivers/{driver_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| driver_id | integer | Yes | - |

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
  "//drivers/1"
```


---
