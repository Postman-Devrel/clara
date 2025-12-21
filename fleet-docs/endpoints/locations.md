# locations

## Get Locations

`GET /locations/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| type | string | No | - |
| city | string | No | - |
| state | string | No | - |
| organization_id | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "organization_id": 1,
    "name": "string",
    "type": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "postal_code": "string",
    "country": "string",
    "latitude": 1,
    "longitude": 1,
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
  "//locations/"
```


---

## Create Location

`POST /locations/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| name | string | Yes | - |
| type | string | Yes | - |
| address | string | Yes | - |
| city | string | Yes | - |
| state | string | Yes | - |
| postal_code | string | Yes | - |
| country | string | Yes | - |
| latitude | number | Yes | - |
| longitude | number | Yes | - |

**Example:**

```json
{
  "organization_id": 1,
  "name": "string",
  "type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "postal_code": "string",
  "country": "string",
  "latitude": 1,
  "longitude": 1
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "name": "string",
  "type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "postal_code": "string",
  "country": "string",
  "latitude": 1,
  "longitude": 1,
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
  -d '{"organization_id":1,"name":"string","type":"string","address":"string","city":"string","state":"string","postal_code":"string","country":"string","latitude":1,"longitude":1}' \
  "//locations/"
```


---

## Get Location

`GET /locations/{location_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| location_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "name": "string",
  "type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "postal_code": "string",
  "country": "string",
  "latitude": 1,
  "longitude": 1,
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
  "//locations/1"
```


---

## Update Location

`PUT /locations/{location_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| location_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| name | string | Yes | - |
| type | string | Yes | - |
| address | string | Yes | - |
| city | string | Yes | - |
| state | string | Yes | - |
| postal_code | string | Yes | - |
| country | string | Yes | - |
| latitude | number | Yes | - |
| longitude | number | Yes | - |

**Example:**

```json
{
  "organization_id": 1,
  "name": "string",
  "type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "postal_code": "string",
  "country": "string",
  "latitude": 1,
  "longitude": 1
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "name": "string",
  "type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "postal_code": "string",
  "country": "string",
  "latitude": 1,
  "longitude": 1,
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
  -d '{"organization_id":1,"name":"string","type":"string","address":"string","city":"string","state":"string","postal_code":"string","country":"string","latitude":1,"longitude":1}' \
  "//locations/1"
```


---

## Delete Location

`DELETE /locations/{location_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| location_id | integer | Yes | - |

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
  "//locations/1"
```


---
