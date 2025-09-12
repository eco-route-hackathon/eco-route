# Research Document: Eco-Route MVP Implementation

## Executive Summary
This document consolidates research findings for implementing the Eco-Route MVP transport comparison system. Key decisions include using Amazon Location Service for route calculations, leveraging オープンデータ for shipping information, and implementing a weighted scoring algorithm for multi-criteria optimization.

## 1. Amazon Location Service Routes API

### Decision
Use Amazon Location Service with HERE provider for route calculations.

### Rationale
- Most accurate mapping data for Japan domestic routes
- Native AWS integration reduces complexity
- Cost-effective for MVP scale (first 1000 requests free)
- Supports truck routing with vehicle specifications

### Implementation Details
```typescript
// Route calculation parameters
{
  DeparturePosition: [lng, lat],
  DestinationPosition: [lng, lat],
  TravelMode: "Truck",
  TruckModeOptions: {
    GrossWeight: weight_kg,
    WeightPerAxle: weight_kg / 4
  }
}
```

### Alternatives Considered
- **Google Maps API**: More expensive, requires external integration
- **OpenStreetMap/OSRM**: Less accurate for Japan, requires self-hosting
- **MapBox**: Similar cost but less AWS integration

## 2. オープンデータ CSV Structure Analysis

### Available Data Sources
```
オープンデータ/
├── 内航海運業データ/
│   ├── 01_naikoukaiungyou_jigyougaikyouhoukoku.csv  # 事業概況報告
│   ├── 02_naikoukaiungyou_naikousenpakuyusoutoukei.csv  # 内航船舶輸送統計
│   └── 03_kouwanchousa.csv  # 港湾調査
├── モーダルシフト/
│   ├── 01_naikousenpakuyusoutoukeityousa.csv  # 内航船舶輸送統計調査
│   └── 02_jidousyayusoutoukeityousa.csv  # 自動車輸送統計調査
├── 貨物自動車運送事業データ/
│   └── 01_jigyoujissekihoukokusyo.csv  # 事業実績報告書
└── 一般旅客定期航路事業データ/
    └── 01_ippanryokyakuteikikourojigyoukyokashinseisyo.csv  # 定期航路許可申請書
```

### Data Mapping Strategy
- **Port locations**: Extract from 港湾調査 (03_kouwanchousa.csv)
- **Shipping routes**: Parse from 内航船舶輸送統計
- **Truck coefficients**: Derive from 事業実績報告書
- **Modal shift data**: Use for CO2/cost calibration

### Sample Data Structure
```csv
# modes.csv
mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,50,0.1,60
ship,20,0.02,20

# links.csv  
from,to,mode,distance_km,time_hours
TokyoPort,OsakaPort,ship,410,20.5
OsakaPort,KobePort,ship,30,1.5

# locations.csv
id,name,lat,lon,type
1,Tokyo,35.6762,139.6503,city
2,TokyoPort,35.6551,139.7595,port
```

## 3. Weighted Scoring Algorithm

### Decision
Implement linear weighted sum method with normalization.

### Formula
```
Score = w_time × (time_h / max_time) + 
        w_cost × (cost_jpy / max_cost) + 
        w_co2 × (co2_kg / max_co2)

where: w_time + w_cost + w_co2 = 1.0
```

### Rationale
- Simple to implement and explain
- Transparent to users
- Computationally efficient
- Handles trade-offs intuitively

### Normalization Strategy
- Normalize weights if sum ≠ 1.0
- Scale metrics to 0-1 range for fair comparison
- Use min-max normalization per comparison set

### Alternatives Considered
- **TOPSIS**: Too complex for MVP
- **AHP**: Requires pairwise comparisons
- **Pareto optimization**: Multi-objective, harder to explain

## 4. Lambda Performance Optimization

### Decision
Implement provisioned concurrency with connection pooling.

### Optimization Strategies
1. **Cold Start Mitigation**:
   - Provisioned concurrency: 2 instances
   - Webpack bundling to reduce package size
   - Lazy load AWS SDK clients

2. **Memory Configuration**:
   - 512MB for MVP (balance cost/performance)
   - Monitor and adjust based on metrics

3. **Data Caching**:
   ```typescript
   // Cache CSV data in Lambda memory
   let cachedData: DataCache | null = null;
   
   export const handler = async (event) => {
     if (!cachedData || isExpired(cachedData)) {
       cachedData = await loadFromS3();
     }
     // Use cachedData for calculations
   };
   ```

### Performance Targets
- Cold start: < 3s
- Warm invocation: < 500ms
- Memory usage: < 256MB

## 5. S3 Data Management

### Decision
Store CSV files in S3 with CloudFront caching.

### Structure
```
s3://eco-route-data/
├── latest/
│   ├── modes.csv
│   ├── links.csv
│   └── locations.csv
└── versions/
    └── 2025-09-12/
        ├── modes.csv
        ├── links.csv
        └── locations.csv
```

### Caching Strategy
- CloudFront TTL: 1 hour for latest/
- Lambda memory cache: 15 minutes
- ETag validation for updates

### Update Process
1. Upload new CSVs to versions/{date}/
2. Copy to latest/ after validation
3. Invalidate CloudFront cache

## 6. Error Handling Strategy

### API Error Responses
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
  timestamp: string;
}
```

### Error Categories
1. **Validation Errors** (400):
   - Invalid origin/destination
   - Negative weight
   - Invalid weight values

2. **Data Errors** (404):
   - Route not found
   - No ship connection available

3. **Service Errors** (500):
   - AWS service failures
   - Calculation errors

## 7. Testing Strategy

### Test Data Sets
1. **Tokyo → Osaka**: Standard route with ship option
2. **Sapporo → Fukuoka**: Long distance, multiple ports
3. **Nagoya → Sendai**: No direct ship route

### Mock Services
- LocalStack for AWS services
- Static test CSVs in fixtures/
- Deterministic route calculations

### Performance Benchmarks
- API response time: p95 < 2s
- Calculation time: < 500ms
- CSV parsing: < 100ms

## 8. Security Considerations

### API Security
- API Gateway throttling: 100 req/s
- CORS configuration for frontend domain only
- Input validation and sanitization

### Data Security
- S3 bucket: Private with IAM roles
- CloudFront: Signed URLs if needed
- No PII in logs

### Environment Variables
```bash
AWS_REGION=ap-northeast-1
ROUTE_CALCULATOR_NAME=eco-route-calculator
S3_BUCKET=eco-route-data
CLOUDFRONT_DISTRIBUTION=d1234567890.cloudfront.net
```

## Conclusions

The research confirms feasibility of the MVP with the selected technology stack:
1. Amazon Location Service provides accurate routing for Japan
2. オープンデータ offers comprehensive shipping/transport data
3. Simple weighted scoring meets user requirements
4. AWS services enable scalable, cost-effective deployment

All technical unknowns have been resolved. Ready to proceed with Phase 1 design.