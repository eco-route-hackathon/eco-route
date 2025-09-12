# Eco-Route MVP Quickstart Guide

## Prerequisites

- Node.js 22 LTS installed
- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Git installed

## 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd eco-route

# Switch to feature branch
git checkout 001-handoff-md-mvp
```

## 2. Environment Configuration

Create `.env` files in both backend and frontend directories:

### Backend (.env)
```bash
# backend/.env
AWS_REGION=ap-northeast-1
ROUTE_CALCULATOR_NAME=eco-route-calculator
S3_BUCKET=eco-route-data
NODE_ENV=development
PORT=3000
```

### Frontend (.env)
```bash
# frontend/.env
VITE_API_URL=http://localhost:3000
```

## 3. Data Setup

### Prepare CSV Data
```bash
# Create data directory
mkdir -p data

# Create modes.csv
cat > data/modes.csv << 'EOF'
mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph
truck,50,0.1,60
ship,20,0.02,20
EOF

# Create locations.csv
cat > data/locations.csv << 'EOF'
id,name,lat,lon,type
1,Tokyo,35.6762,139.6503,city
2,Osaka,34.6937,135.5023,city
3,TokyoPort,35.6551,139.7595,port
4,OsakaPort,34.6500,135.4300,port
5,Nagoya,35.1815,136.9066,city
6,NagoyaPort,35.0833,136.8833,port
EOF

# Create links.csv
cat > data/links.csv << 'EOF'
from,to,mode,distance_km,time_hours
TokyoPort,OsakaPort,ship,410,20.5
TokyoPort,NagoyaPort,ship,280,14.0
NagoyaPort,OsakaPort,ship,130,6.5
EOF
```

### Upload to S3 (Production)
```bash
# Create S3 bucket
aws s3 mb s3://eco-route-data --region ap-northeast-1

# Upload CSV files
aws s3 cp data/ s3://eco-route-data/latest/ --recursive --exclude "*" --include "*.csv"
```

## 4. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run tests (should fail initially - TDD)
npm test

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:3000`

## 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 6. Testing the API

### Test with curl
```bash
# Basic comparison request
curl -X POST http://localhost:3000/compare \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Tokyo",
    "destination": "Osaka",
    "weightKg": 500,
    "weights": {
      "time": 0.5,
      "cost": 0.3,
      "co2": 0.2
    }
  }'
```

### Expected Response
```json
{
  "candidates": [
    {
      "plan": "truck",
      "timeH": 7.2,
      "costJpy": 35000,
      "co2Kg": 25.1
    },
    {
      "plan": "truck+ship",
      "timeH": 14.0,
      "costJpy": 21000,
      "co2Kg": 8.3
    }
  ],
  "recommendation": "truck",
  "rationale": {
    "truck": {
      "distanceKm": 520
    },
    "truck+ship": {
      "legs": [
        {
          "from": "Tokyo",
          "to": "TokyoPort",
          "mode": "truck",
          "distanceKm": 15,
          "timeHours": 0.5
        },
        {
          "from": "TokyoPort",
          "to": "OsakaPort",
          "mode": "ship",
          "distanceKm": 410,
          "timeHours": 20.5
        },
        {
          "from": "OsakaPort",
          "to": "Osaka",
          "mode": "truck",
          "distanceKm": 12,
          "timeHours": 0.4
        }
      ]
    }
  }
}
```

## 7. Run Test Scenarios

### Scenario 1: Time Priority
```bash
# Time-optimized (weight: 0.7)
curl -X POST http://localhost:3000/compare \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Tokyo",
    "destination": "Osaka",
    "weightKg": 500,
    "weights": {"time": 0.7, "cost": 0.2, "co2": 0.1}
  }'
# Expected: Truck recommended
```

### Scenario 2: CO2 Priority
```bash
# CO2-optimized (weight: 0.7)
curl -X POST http://localhost:3000/compare \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Tokyo",
    "destination": "Osaka",
    "weightKg": 500,
    "weights": {"time": 0.1, "cost": 0.2, "co2": 0.7}
  }'
# Expected: Truck+Ship recommended
```

### Scenario 3: Balanced Weights
```bash
# Balanced optimization
curl -X POST http://localhost:3000/compare \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Tokyo",
    "destination": "Osaka",
    "weightKg": 1000,
    "weights": {"time": 0.33, "cost": 0.33, "co2": 0.34}
  }'
# Expected: Recommendation based on normalized score
```

## 8. AWS Deployment (Production)

### Deploy Lambda Function
```bash
cd infra

# Install CDK
npm install -g aws-cdk

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy stack
cdk deploy EcoRouteStack
```

### Deploy Frontend to Amplify
```bash
# In frontend directory
npm run build

# Deploy with Amplify CLI
amplify init
amplify add hosting
amplify publish
```

## 9. Monitoring

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/eco-route-compare --follow
```

### Check API Gateway Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=eco-route-api \
  --statistics Sum \
  --start-time 2025-09-12T00:00:00Z \
  --end-time 2025-09-13T00:00:00Z \
  --period 3600
```

## 10. Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```bash
   export AWS_PROFILE=your-profile
   aws sts get-caller-identity  # Verify credentials
   ```

2. **Port Already in Use**
   ```bash
   lsof -i :3000  # Find process using port
   kill -9 <PID>  # Kill process
   ```

3. **CSV Data Not Loading**
   - Check S3 bucket permissions
   - Verify bucket name in .env
   - Check CloudWatch logs for errors

4. **Route Not Found**
   - Ensure locations exist in locations.csv
   - Check for typos in city names
   - Verify ship routes in links.csv

## Success Criteria

✅ API responds within 2 seconds  
✅ All three test scenarios return consistent results  
✅ Frontend displays comparison table  
✅ Recommendations include rationale  
✅ Error messages are descriptive  

## Next Steps

1. Add more city/port pairs to CSV data
2. Implement caching for better performance
3. Add authentication for production
4. Set up CI/CD pipeline
5. Configure monitoring alerts