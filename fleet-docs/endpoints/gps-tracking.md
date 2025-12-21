# gps-tracking

## Get Gps Tracking

`GET /gps/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| vehicle_id | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "vehicle_id": 1,
    "timestamp": "2024-01-15T10:30:00Z",
    "latitude": 1,
    "longitude": 1,
    "speed_kmh": 1,
    "heading": 1,
    "altitude": null,
    "id": 1
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
  "//gps/"
```


---

## Create Gps Tracking

`POST /gps/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vehicle_id | integer | Yes | - |
| timestamp | string | Yes | - |
| latitude | number | Yes | - |
| longitude | number | Yes | - |
| speed_kmh | number | Yes | - |
| heading | number | Yes | - |
| altitude | any | No | - |

**Example:**

```json
{
  "vehicle_id": 1,
  "timestamp": "2024-01-15T10:30:00Z",
  "latitude": 1,
  "longitude": 1,
  "speed_kmh": 1,
  "heading": 1,
  "altitude": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "timestamp": "2024-01-15T10:30:00Z",
  "latitude": 1,
  "longitude": 1,
  "speed_kmh": 1,
  "heading": 1,
  "altitude": null,
  "id": 1
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
  -d '{"vehicle_id":1,"timestamp":"2024-01-15T10:30:00Z","latitude":1,"longitude":1,"speed_kmh":1,"heading":1,"altitude":null}' \
  "//gps/"
```


---

## Get Latest Gps For Vehicle

`GET /gps/vehicle/{vehicle_id}/latest`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| vehicle_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "timestamp": "2024-01-15T10:30:00Z",
  "latitude": 1,
  "longitude": 1,
  "speed_kmh": 1,
  "heading": 1,
  "altitude": null,
  "id": 1
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
  "//gps/vehicle/1/latest"
```


---

## Get Gps Tracking By Id

`GET /gps/{tracking_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| tracking_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "vehicle_id": 1,
  "timestamp": "2024-01-15T10:30:00Z",
  "latitude": 1,
  "longitude": 1,
  "speed_kmh": 1,
  "heading": 1,
  "altitude": null,
  "id": 1
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
  "//gps/1"
```


---

## Delete Gps Tracking

`DELETE /gps/{tracking_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| tracking_id | integer | Yes | - |

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
  "//gps/1"
```


---
