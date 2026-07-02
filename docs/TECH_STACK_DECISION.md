# MEKONG ECO-SHIELD AI - Tech Stack Decision Document

## 1. Backend Stack

### Core Framework
- **FastAPI** (Python 3.11+) - High performance, async support, auto OpenAPI docs
- **Pydantic v2** - Data validation, serialization
- **SQLAlchemy 2.0 + AsyncPG** - Async ORM with PostgreSQL

### Database
- **PostgreSQL 16 + PostGIS 3.4** - Geospatial data, raster support, spatial indexing
- **TimescaleDB** (extension) - Time-series data for sensor readings, forecasts
- **Redis 7** - Caching, rate limiting, Celery broker, WebSocket pub/sub

### Geospatial & Data Processing
- **GeoPandas + Rasterio + Fiona** - Vector/raster processing
- **Xarray + NetCDF4** - Multi-dimensional climate data (ERA5, CHIRPS)
- **GDAL/OGR** - Raster reprojection, tiling, COG generation
- **PDAL** - LiDAR point cloud processing (terrain elevation)

### ML/AI Stack
- **PyTorch + PyTorch Lightning** - Deep learning models
- **scikit-learn + XGBoost/LightGBM** - Classical ML for credit scoring
- **MLflow** - Experiment tracking, model registry
- **ONNX Runtime** - Model serving optimization
- **Ray Serve / BentoML** - Model deployment (scaling)

### Task Queue & Sentinel/ERA5 Data Ingestion
- **Sentinel Hub / Copernicus Data Space** - Sentinel-1 (SAR), Sentinel-2 (Optical)
- **CDS API (Copernicus Climate Data Store)** - ERA5-Land reanalysis
- **CHIRPS / GSMaP** - Precipitation data
- **Google Earth Engine API** (optional) - Large-scale analysis

### Message Queue & Streaming
- **Celery + Redis** - Async tasks (data ingestion, model inference)
- **Kafka / Redpanda** (Phase 2) - Event streaming for real-time alerts

### API & Real-time
- **FastAPI WebSocket** - Real-time alerts to frontend
- **Server-Sent Events (SSE)** - Fallback for simpler clients
- **GraphQL (Strawberry)** - Flexible queries for investor dashboard

### Auth & Security
- **Authlib / python-jose** - OAuth2/OIDC, JWT
- **Passlib[bcrypt]** - Password hashing
- **SlowAPI** - Rate limiting
- **Cryptography** - Encryption for sensitive financial data

### Monitoring & Observability
- **Prometheus + Grafana** - Metrics
- **OpenTelemetry + Jaeger** - Distributed tracing
- **Sentry** - Error tracking
- **Structlog** - Structured logging

---

## 2. Frontend Stack

### Framework
- **Next.js 14 (App Router)** - React 18, SSR/SSG/ISR, TypeScript
- **Tailwind CSS + shadcn/ui** - Component library, dark mode
- **React Query (TanStack Query)** - Server state, caching, mutations

### Mapping & Visualization
- **MapLibre GL JS** (open-source) + **MapTiler/Mapbox** tiles
- **Deck.gl** - Large-scale geospatial visualizations (hexbins, heatmaps)
- **Recharts / Visx** - Charts for time-series, credit scores
- **React Flow** - ESG filter workflow builder

### State & Forms
- **Zustand** - Lightweight global state
- **React Hook Form + Zod** - Form validation
- **i18next** - Internationalization (VN/EN)

### Real-time
- **Native WebSocket API** + React Query subscription
- **Socket.io client** (fallback)

---

## 3. Infrastructure & DevOps

### Container & Orchestration
- **Docker + Docker Compose** (local/dev)
- **Kubernetes (EKS/GKE/AKS)** - Production
- **Helm charts** - K8s deployments
- **ArgoCD / Flux** - GitOps

### CI/CD
- **GitHub Actions** - CI (lint, test, build, scan)
- **Trivy / Snyk** - Container scanning
- **Semantic Release** - Automated versioning

### Cloud Services (Multi-cloud ready)
- **Managed PostgreSQL** (Cloud SQL / RDS / Azure Database) + PostGIS
- **Managed Redis** (ElastiCache / Memorystore)
- **Object Storage** (S3 / GCS / Azure Blob) - Model artifacts, raster tiles
- **CDN** (CloudFront / Cloudflare) - Map tiles, static assets
- **Secrets Manager** - API keys, DB passwords

### IaC
- **Terraform** - Cloud resources
- **Kustomize** - K8s overlays per env

---

## 4. Project Structure

```
mekong-eco-shield/
├── docs/                    # Architecture, API specs, runbooks
├── infra/                   # Terraform, Helm, Docker Compose
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routes (v1, v2)
│   │   ├── core/           # Config, security, database, lifespan
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas (request/response)
│   │   ├── services/       # Business logic (ingestion, scoring, alerts)
│   │   ├── ml/             # ML model wrappers, inference
│   │   └── utils/          # Helpers
│   ├── tests/              # Pytest (unit, integration, e2e)
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── alembic/            # Migrations
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Next.js App Router pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Helpers, API client
│   │   └── types/          # TypeScript types (shared with backend via openapi)
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── ml/
│   ├── data/               # Data download/prep scripts
│   ├── notebooks/          # EDA, experimentation
│   ├── models/             # Model definitions, training scripts
│   └── pipelines/          # MLflow/Argo/Kubeflow pipelines
└── scripts/                # Operational scripts (backup, seed, migrate)
```

---

## 5. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **PostGIS + TimescaleDB** | Native geospatial + time-series; single DB reduces ops complexity |
| **FastAPI over Django/NestJS** | Async native, better for ML inference serving, auto OpenAPI |
| **MapLibre over Mapbox GL** | Open-source, no token costs, self-hosted tiles possible |
| **MLflow + Ray Serve** | MLOps standard, scales inference independently |
| **Celery + Redis** | Simple, proven, handles burst ingestion workloads |
| **Next.js App Router** | Server components reduce JS bundle, better SEO for public pages |
| **Terraform + Helm** | GitOps, multi-cloud, reproducible environments |

---

## 6. Data Flow Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Satellite  │────▶│  Ingestion   │────▶│  PostGIS/      │
│  / Sensor   │     │  Workers     │     │  TimescaleDB   │
│  (SAR, Opt) │     │  (Celery)    │     │  (Raw + Proc)  │
└─────────────┘     └──────────────┘     └───────┬────────┘
                                                 │
                    ┌──────────────┐             │
                    │  ML Pipeline │◀────────────┘
                    │  (Training)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌──────────────┐
                    │  Model       │────▶│  Inference   │
                    │  Registry    │     │  API (Ray)   │
                    │  (MLflow)    │     └──────┬───────┘
                    └──────────────┘            │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Farmer/    │◀────│  FastAPI     │◀────│  Scoring &     │
│  Investor   │     │  + WebSocket │     │  Alert Engine  │
│  Dashboard  │     │  (Next.js)   │     │  (Green Credit)│
└─────────────┘     └──────────────┘     └────────────────┘
```

---

## 7. Development Phases

### Phase 1 (Month 1-2): Foundation
- [ ] Infra: Docker Compose, PostgreSQL+PostGIS, Redis, MinIO
- [ ] Backend: Core config, Auth (JWT/OAuth2), RBAC, Alembic migrations
- [ ] Data: Ingestion pipelines for Sentinel-1/2, ERA5, CHIRPS
- [ ] ML: Baseline flood/salinity models (Random Forest → CNN)
- [ ] API: CRUD for farms, zones, sensors; WebSocket scaffold

### Phase 2 (Month 3-4): Core Features
- [ ] AI: Production flood forecasting (7-day), salinity intrusion (14-day), soil health index
- [ ] Fintech: Green Credit Scoring Engine (XGBoost + SHAP explainability)
- [ ] ESG: Filter builder, Impact metrics calculator
- [ ] Frontend: Farmer dashboard (map, alerts, advisories), Investor portal (portfolio, ESG reports)

### Phase 3 (Month 5-6): Scale & Polish
- [ ] Multi-tenancy, white-label for partners
- [ ] Real-time alerting (SMS, Zalo, push, email)
- [ ] Carbon credit estimation module
- [ ] Compliance: SOC2 prep, data residency (Vietnam)
- [ ] Load testing, chaos engineering
- [ ] Investor deck + financial model finalization

---

## 8. Estimated Resource Requirements

| Component | Dev | Staging | Prod (Initial) |
|-----------|-----|---------|----------------|
| PostgreSQL | 2 vCPU, 8GB, 100GB | 4 vCPU, 16GB, 500GB | 8 vCPU, 32GB, 2TB + Read Replica |
| Redis | 1 vCPU, 4GB | 2 vCPU, 8GB | 4 vCPU, 16GB (Cluster) |
| Backend API | 2 pods × 1 vCPU, 2GB | 3 pods × 2 vCPU, 4GB | 6 pods × 4 vCPU, 8GB (HPA) |
| ML Inference | 1 GPU (T4) | 2 GPU (T4) | 4 GPU (A10G) + Ray Cluster |
| Object Storage | 50 GB | 500 GB | 10 TB + CDN |
| Kubernetes | - | Dev cluster | EKS/GKE (3 AZs) |

---

## 9. Open Questions for Team

1. **Vietnam data residency**: Must all data stay in VN? (Affects cloud provider choice)
2. **Zalo integration**: Official API or unofficial? (For farmer notifications)
3. **Payment gateway**: VNPAY, MoMo, or Stripe (for intl investors)?
4. **Satellite data budget**: Sentinel Hub paid plan vs. free Copernicus Data Space?
5. **Team ML experience**: Need pre-trained models or build from scratch?