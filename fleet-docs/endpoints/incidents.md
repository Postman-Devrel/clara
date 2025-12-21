# incidents

## Get Incidents

`GET /incidents/`

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| skip | integer | No | - |
| limit | integer | No | - |
| driver_id | string | No | - |
| incident_type | string | No | - |
| severity | string | No | - |
| resolved | string | No | - |

### Responses

#### 200 Successful Response

```json
[
  {
    "driver_id": 1,
    "incident_type": "string",
    "severity": "string",
    "description": "string",
    "date": "2024-01-15T10:30:00Z",
    "location": "string",
    "resolved": false,
    "cost": null,
    "resolution_notes": null,
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
  "//incidents/"
```


---

## Create Incident

`POST /incidents/`

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driver_id | integer | Yes | - |
| incident_type | string | Yes | - |
| severity | string | Yes | - |
| description | string | Yes | - |
| date | string | Yes | - |
| location | string | Yes | - |
| resolved | any | No | - |
| cost | any | No | - |
| resolution_notes | any | No | - |

**Example:**

```json
{
  "driver_id": 1,
  "incident_type": "string",
  "severity": "string",
  "description": "string",
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "resolved": false,
  "cost": null,
  "resolution_notes": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "driver_id": 1,
  "incident_type": "string",
  "severity": "string",
  "description": "string",
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "resolved": false,
  "cost": null,
  "resolution_notes": null,
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
  -d '{"driver_id":1,"incident_type":"string","severity":"string","description":"string","date":"2024-01-15T10:30:00Z","location":"string","resolved":false,"cost":null,"resolution_notes":null}' \
  "//incidents/"
```


---

## Get Incident

`GET /incidents/{incident_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| incident_id | integer | Yes | - |

### Responses

#### 200 Successful Response

```json
{
  "driver_id": 1,
  "incident_type": "string",
  "severity": "string",
  "description": "string",
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "resolved": false,
  "cost": null,
  "resolution_notes": null,
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
  "//incidents/1"
```


---

## Update Incident

`PUT /incidents/{incident_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| incident_id | integer | Yes | - |

### Request Body

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driver_id | integer | Yes | - |
| incident_type | string | Yes | - |
| severity | string | Yes | - |
| description | string | Yes | - |
| date | string | Yes | - |
| location | string | Yes | - |
| resolved | any | No | - |
| cost | any | No | - |
| resolution_notes | any | No | - |

**Example:**

```json
{
  "driver_id": 1,
  "incident_type": "string",
  "severity": "string",
  "description": "string",
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "resolved": false,
  "cost": null,
  "resolution_notes": null
}
```

### Responses

#### 200 Successful Response

```json
{
  "driver_id": 1,
  "incident_type": "string",
  "severity": "string",
  "description": "string",
  "date": "2024-01-15T10:30:00Z",
  "location": "string",
  "resolved": false,
  "cost": null,
  "resolution_notes": null,
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
  -d '{"driver_id":1,"incident_type":"string","severity":"string","description":"string","date":"2024-01-15T10:30:00Z","location":"string","resolved":false,"cost":null,"resolution_notes":null}' \
  "//incidents/1"
```


---

## Delete Incident

`DELETE /incidents/{incident_id}`

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| incident_id | integer | Yes | - |

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
  "//incidents/1"
```


---
