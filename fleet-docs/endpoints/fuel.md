# fuel

## Get Fuel Logs

`GET /fuel/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| vehicle_id | string | No | - |
| fuel_type | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "vehicle_id": 1,
    "date": "2024-01-15T10:30:00Z",
    "location": "string",
    "liters": 1,
    "cost_per_liter": 1,
    "total_cost": 1,
    "mileage": 1,
    "fuel_type": "diesel",
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
  "//fuel/"
```


---

## Create Fuel Log

`POST /fuel/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| date | string | Yes | - |
| location | string | Yes | - |
| liters | number | Yes | - |
| cost_per_liter | number | Yes | - |
| total_cost | number | Yes | - |
| mileage | number | Yes | - |
| fuel_type | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "liters": 1,
  "cost_per_liter": 1,
  "total_cost": 1,
  "mileage": 1,
  "fuel_type": "diesel"
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "liters": 1,
  "cost_per_liter": 1,
  "total_cost": 1,
  "mileage": 1,
  "fuel_type": "diesel",
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
  -d '{"vehicle_id":1,"date":"2024-01-15T10:30:00Z","location":"string","liters":1,"cost_per_liter":1,"total_cost":1,"mileage":1,"fuel_type":"diesel"}' \
  "//fuel/"
```


---

## Get Fuel Log

`GET /fuel/{log_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| log_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "liters": 1,
  "cost_per_liter": 1,
  "total_cost": 1,
  "mileage": 1,
  "fuel_type": "diesel",
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
  "//fuel/1"
```


---

## Update Fuel Log

`PUT /fuel/{log_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| log_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| date | string | Yes | - |
| location | string | Yes | - |
| liters | number | Yes | - |
| cost_per_liter | number | Yes | - |
| total_cost | number | Yes | - |
| mileage | number | Yes | - |
| fuel_type | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "liters": 1,
  "cost_per_liter": 1,
  "total_cost": 1,
  "mileage": 1,
  "fuel_type": "diesel"
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "liters": 1,
  "cost_per_liter": 1,
  "total_cost": 1,
  "mileage": 1,
  "fuel_type": "diesel",
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
  -d '{"vehicle_id":1,"date":"2024-01-15T10:30:00Z","location":"string","liters":1,"cost_per_liter":1,"total_cost":1,"mileage":1,"fuel_type":"diesel"}' \
  "//fuel/1"
```


---

## Delete Fuel Log

`DELETE /fuel/{log_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| log_id | integer | Yes | - |

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
  "//fuel/1"
```


---
