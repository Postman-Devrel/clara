# admin

## Seed Database Full

`POST /admin/seed-full`

Seed the database with complete dataset: 50 vehicles, 1000 deliveries, 6 months history

### Responses

#### 200 Successful Response

```json
null
```

### Example Request

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  "//admin/seed-full"
```


---

## Clear Database

`DELETE /admin/clear`

Clear all data from the database (use with caution!)

### Responses

#### 200 Successful Response

```json
null
```

### Example Request

```bash
curl \
  -X DELETE \
  -H "Content-Type: application/json" \
  "//admin/clear"
```


---
