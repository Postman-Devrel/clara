# routes

## Get Routes

`GET /routes/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| status | string | No | - |
| vehicle_id | string | No | - |
| driver_id | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "vehicle_id": 1,
    "driver_id": 1,
    "origin_location_id": 1,
    "destination_location_id": 1,
    "scheduled_departure": "2024-01-15T10:30:00Z",
    "scheduled_arrival": "2024-01-15T10:30:00Z",
    "distance_km": 1,
    "status": "scheduled",
    "actual_departure": null,
    "actual_arrival": null,
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
  "//routes/"
```


---

## Create Route

`POST /routes/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| driver_id | integer | Yes | - |
| origin_location_id | integer | Yes | - |
| destination_location_id | integer | Yes | - |
| scheduled_departure | string | Yes | - |
| scheduled_arrival | string | Yes | - |
| distance_km | number | Yes | - |
| status | any | No | - |
| actual_departure | any | No | - |
| actual_arrival | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "origin_location_id": 1,
  "destination_location_id": 1,
  "scheduled_departure": "2024-01-15T10:30:00Z",
  "scheduled_arrival": "2024-01-15T10:30:00Z",
  "distance_km": 1,
  "status": "scheduled",
  "actual_departure": null,
  "actual_arrival": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "origin_location_id": 1,
  "destination_location_id": 1,
  "scheduled_departure": "2024-01-15T10:30:00Z",
  "scheduled_arrival": "2024-01-15T10:30:00Z",
  "distance_km": 1,
  "status": "scheduled",
  "actual_departure": null,
  "actual_arrival": null,
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
  -d '{"vehicle_id":1,"driver_id":1,"origin_location_id":1,"destination_location_id":1,"scheduled_departure":"2024-01-15T10:30:00Z","scheduled_arrival":"2024-01-15T10:30:00Z","distance_km":1,"status":"scheduled","actual_departure":null,"actual_arrival":null}' \
  "//routes/"
```


---

## Get Route

`GET /routes/{route_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| route_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "origin_location_id": 1,
  "destination_location_id": 1,
  "scheduled_departure": "2024-01-15T10:30:00Z",
  "scheduled_arrival": "2024-01-15T10:30:00Z",
  "distance_km": 1,
  "status": "scheduled",
  "actual_departure": null,
  "actual_arrival": null,
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
  "//routes/1"
```


---

## Update Route

`PUT /routes/{route_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| route_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| driver_id | integer | Yes | - |
| origin_location_id | integer | Yes | - |
| destination_location_id | integer | Yes | - |
| scheduled_departure | string | Yes | - |
| scheduled_arrival | string | Yes | - |
| distance_km | number | Yes | - |
| status | any | No | - |
| actual_departure | any | No | - |
| actual_arrival | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "origin_location_id": 1,
  "destination_location_id": 1,
  "scheduled_departure": "2024-01-15T10:30:00Z",
  "scheduled_arrival": "2024-01-15T10:30:00Z",
  "distance_km": 1,
  "status": "scheduled",
  "actual_departure": null,
  "actual_arrival": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "origin_location_id": 1,
  "destination_location_id": 1,
  "scheduled_departure": "2024-01-15T10:30:00Z",
  "scheduled_arrival": "2024-01-15T10:30:00Z",
  "distance_km": 1,
  "status": "scheduled",
  "actual_departure": null,
  "actual_arrival": null,
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
  -d '{"vehicle_id":1,"driver_id":1,"origin_location_id":1,"destination_location_id":1,"scheduled_departure":"2024-01-15T10:30:00Z","scheduled_arrival":"2024-01-15T10:30:00Z","distance_km":1,"status":"scheduled","actual_departure":null,"actual_arrival":null}' \
  "//routes/1"
```


---

## Delete Route

`DELETE /routes/{route_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| route_id | integer | Yes | - |

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
  "//routes/1"
```


---
