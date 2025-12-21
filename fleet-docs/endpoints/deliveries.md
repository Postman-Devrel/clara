# deliveries

## Get Deliveries

`GET /deliveries/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| status | string | No | - |
| priority | string | No | - |
| route_id | string | No | - |
| tracking_number | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "route_id": 1,
    "location_id": 1,
    "tracking_number": "string",
    "customer_name": "string",
    "customer_email": "string",
    "customer_phone": "string",
    "package_count": 1,
    "weight_kg": 1,
    "scheduled_delivery": "2024-01-15T10:30:00Z",
    "status": "pending",
    "priority": "standard",
    "signature_required": false,
    "actual_delivery": null,
    "delivery_notes": null,
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
  "//deliveries/"
```


---

## Create Delivery

`POST /deliveries/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| route_id | integer | Yes | - |
| location_id | integer | Yes | - |
| tracking_number | string | Yes | - |
| customer_name | string | Yes | - |
| customer_email | string | Yes | - |
| customer_phone | string | Yes | - |
| package_count | integer | Yes | - |
| weight_kg | number | Yes | - |
| scheduled_delivery | string | Yes | - |
| status | any | No | - |
| priority | any | No | - |
| signature_required | any | No | - |
| actual_delivery | any | No | - |
| delivery_notes | any | No | - |

**Example:**

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null,
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
  -d '{"route_id":1,"location_id":1,"tracking_number":"string","customer_name":"string","customer_email":"string","customer_phone":"string","package_count":1,"weight_kg":1,"scheduled_delivery":"2024-01-15T10:30:00Z","status":"pending","priority":"standard","signature_required":false,"actual_delivery":null,"delivery_notes":null}' \
  "//deliveries/"
```


---

## Get Delivery

`GET /deliveries/{delivery_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| delivery_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null,
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
  "//deliveries/1"
```


---

## Update Delivery

`PUT /deliveries/{delivery_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| delivery_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| route_id | integer | Yes | - |
| location_id | integer | Yes | - |
| tracking_number | string | Yes | - |
| customer_name | string | Yes | - |
| customer_email | string | Yes | - |
| customer_phone | string | Yes | - |
| package_count | integer | Yes | - |
| weight_kg | number | Yes | - |
| scheduled_delivery | string | Yes | - |
| status | any | No | - |
| priority | any | No | - |
| signature_required | any | No | - |
| actual_delivery | any | No | - |
| delivery_notes | any | No | - |

**Example:**

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null,
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
  -d '{"route_id":1,"location_id":1,"tracking_number":"string","customer_name":"string","customer_email":"string","customer_phone":"string","package_count":1,"weight_kg":1,"scheduled_delivery":"2024-01-15T10:30:00Z","status":"pending","priority":"standard","signature_required":false,"actual_delivery":null,"delivery_notes":null}' \
  "//deliveries/1"
```


---

## Delete Delivery

`DELETE /deliveries/{delivery_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| delivery_id | integer | Yes | - |

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
  "//deliveries/1"
```


---

## Get Delivery By Tracking

`GET /deliveries/tracking/{tracking_number}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| tracking_number | string | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "route_id": 1,
  "location_id": 1,
  "tracking_number": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "package_count": 1,
  "weight_kg": 1,
  "scheduled_delivery": "2024-01-15T10:30:00Z",
  "status": "pending",
  "priority": "standard",
  "signature_required": false,
  "actual_delivery": null,
  "delivery_notes": null,
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
  "//deliveries/tracking/1"
```


---
