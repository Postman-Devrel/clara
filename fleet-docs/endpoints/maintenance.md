# maintenance

## Get Maintenance Records

`GET /maintenance/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| vehicle_id | string | No | - |
| maintenance_type | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "vehicle_id": 1,
    "maintenance_type": "string",
    "description": "string",
    "cost": 1,
    "mileage_at_service": 1,
    "service_date": "2024-01-15T10:30:00Z",
    "service_provider": "string",
    "downtime_hours": 1,
    "next_service_date": null,
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
  "//maintenance/"
```


---

## Create Maintenance Record

`POST /maintenance/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| maintenance_type | string | Yes | - |
| description | string | Yes | - |
| cost | number | Yes | - |
| mileage_at_service | number | Yes | - |
| service_date | string | Yes | - |
| service_provider | string | Yes | - |
| downtime_hours | number | Yes | - |
| next_service_date | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "maintenance_type": "string",
  "description": "string",
  "cost": 1,
  "mileage_at_service": 1,
  "service_date": "2024-01-15T10:30:00Z",
  "service_provider": "string",
  "downtime_hours": 1,
  "next_service_date": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "maintenance_type": "string",
  "description": "string",
  "cost": 1,
  "mileage_at_service": 1,
  "service_date": "2024-01-15T10:30:00Z",
  "service_provider": "string",
  "downtime_hours": 1,
  "next_service_date": null,
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
  -d '{"vehicle_id":1,"maintenance_type":"string","description":"string","cost":1,"mileage_at_service":1,"service_date":"2024-01-15T10:30:00Z","service_provider":"string","downtime_hours":1,"next_service_date":null}' \
  "//maintenance/"
```


---

## Get Maintenance Record

`GET /maintenance/{record_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| record_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "maintenance_type": "string",
  "description": "string",
  "cost": 1,
  "mileage_at_service": 1,
  "service_date": "2024-01-15T10:30:00Z",
  "service_provider": "string",
  "downtime_hours": 1,
  "next_service_date": null,
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
  "//maintenance/1"
```


---

## Update Maintenance Record

`PUT /maintenance/{record_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| record_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| maintenance_type | string | Yes | - |
| description | string | Yes | - |
| cost | number | Yes | - |
| mileage_at_service | number | Yes | - |
| service_date | string | Yes | - |
| service_provider | string | Yes | - |
| downtime_hours | number | Yes | - |
| next_service_date | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "maintenance_type": "string",
  "description": "string",
  "cost": 1,
  "mileage_at_service": 1,
  "service_date": "2024-01-15T10:30:00Z",
  "service_provider": "string",
  "downtime_hours": 1,
  "next_service_date": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "maintenance_type": "string",
  "description": "string",
  "cost": 1,
  "mileage_at_service": 1,
  "service_date": "2024-01-15T10:30:00Z",
  "service_provider": "string",
  "downtime_hours": 1,
  "next_service_date": null,
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
  -d '{"vehicle_id":1,"maintenance_type":"string","description":"string","cost":1,"mileage_at_service":1,"service_date":"2024-01-15T10:30:00Z","service_provider":"string","downtime_hours":1,"next_service_date":null}' \
  "//maintenance/1"
```


---

## Delete Maintenance Record

`DELETE /maintenance/{record_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| record_id | integer | Yes | - |

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
  "//maintenance/1"
```


---
