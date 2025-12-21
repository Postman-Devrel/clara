# vehicles

## Get Vehicles

`GET /vehicles/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| status | string | No | - |
| vehicle_type | string | No | - |
| organization_id | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "organization_id": 1,
    "vin": "string",
    "make": "string",
    "model": "string",
    "year": 1,
    "license_plate": "string",
    "vehicle_type": "string",
    "capacity_kg": 1,
    "current_mileage": 1,
    "status": "active",
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
  "//vehicles/"
```


---

## Create Vehicle

`POST /vehicles/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| vin | string | Yes | - |
| make | string | Yes | - |
| model | string | Yes | - |
| year | integer | Yes | - |
| license_plate | string | Yes | - |
| vehicle_type | string | Yes | - |
| capacity_kg | number | Yes | - |
| current_mileage | number | Yes | - |
| status | any | No | - |

**Example:**

```json
{
  "organization_id": 1,
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": 1,
  "license_plate": "string",
  "vehicle_type": "string",
  "capacity_kg": 1,
  "current_mileage": 1,
  "status": "active"
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": 1,
  "license_plate": "string",
  "vehicle_type": "string",
  "capacity_kg": 1,
  "current_mileage": 1,
  "status": "active",
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
  -d '{"organization_id":1,"vin":"string","make":"string","model":"string","year":1,"license_plate":"string","vehicle_type":"string","capacity_kg":1,"current_mileage":1,"status":"active"}' \
  "//vehicles/"
```


---

## Get Vehicle

`GET /vehicles/{vehicle_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| vehicle_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": 1,
  "license_plate": "string",
  "vehicle_type": "string",
  "capacity_kg": 1,
  "current_mileage": 1,
  "status": "active",
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
  "//vehicles/1"
```


---

## Update Vehicle

`PUT /vehicles/{vehicle_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| vehicle_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization_id | integer | Yes | - |
| vin | string | Yes | - |
| make | string | Yes | - |
| model | string | Yes | - |
| year | integer | Yes | - |
| license_plate | string | Yes | - |
| vehicle_type | string | Yes | - |
| capacity_kg | number | Yes | - |
| current_mileage | number | Yes | - |
| status | any | No | - |

**Example:**

```json
{
  "organization_id": 1,
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": 1,
  "license_plate": "string",
  "vehicle_type": "string",
  "capacity_kg": 1,
  "current_mileage": 1,
  "status": "active"
}
```

### Responses

#### 200 Successful Response

```json
{
  "organization_id": 1,
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": 1,
  "license_plate": "string",
  "vehicle_type": "string",
  "capacity_kg": 1,
  "current_mileage": 1,
  "status": "active",
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
  -d '{"organization_id":1,"vin":"string","make":"string","model":"string","year":1,"license_plate":"string","vehicle_type":"string","capacity_kg":1,"current_mileage":1,"status":"active"}' \
  "//vehicles/1"
```


---

## Delete Vehicle

`DELETE /vehicles/{vehicle_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| vehicle_id | integer | Yes | - |

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
  "//vehicles/1"
```


---
