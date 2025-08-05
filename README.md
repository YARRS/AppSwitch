# Vallmark Gift Articles - Enterprise E-commerce Platform

## 🚀 Overview

Vallmark Gift Articles is a comprehensive, enterprise-grade e-commerce platform designed for gift article retailers with advanced multi-role management, commission tracking, and automated sales processes. Built with modern technologies for scalability and security.

## 🏗️ Architecture

- **Backend**: FastAPI (Python) with async/await support
- **Frontend**: React 18 with modern hooks and context
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with role-based access control (RBAC)
- **UI Framework**: Tailwind CSS with dark mode support
- **Security**: bcrypt password hashing, data encryption, CORS protection

## 🎯 Key Features

### Multi-Role Management System
- **Super Admin**: Full system control and user management
- **Admin**: System administration and user management
- **Store Owner**: Store management and salesperson oversight  
- **Store Manager**: Inventory and operational management
- **Sales Manager**: Team performance and commission oversight
- **Salesperson**: Product management and sales activities
- **Marketing Manager**: Campaign and promotional management
- **Customer**: Product browsing and purchasing

### Core Functionality
- **Product Management**: Advanced product catalog with assignment system
- **Commission System**: Automated commission calculation and tracking
- **Inventory Management**: Real-time stock tracking and alerts
- **Order Processing**: Complete order lifecycle management
- **Campaign Management**: Marketing campaigns with discount systems
- **Analytics Dashboard**: Role-specific performance metrics
- **Inquiry System**: Customer support and ticket management
- **File Upload System**: Secure image and document handling

## 🐳 Docker Setup (Recommended)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 1.29+
- 4GB+ RAM recommended

### Quick Start with Docker

1. **Clone and Navigate**
```bash
git clone <repository-url>
cd vallmark-gift-articles
```

2. **Create Docker Environment File**
```bash
# Create .env.docker
cat > .env.docker << EOF
MONGO_URL=mongodb://mongo:27017/vallmark_db
JWT_SECRET_KEY=your-super-secure-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ENCRYPTION_KEY=9tmn4ravQUE8Dya4jUv9kuGgaKtjo6a9LQxpUPJCAo8=
AUTO_SEED_USERS=true

# Frontend
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_APP_NAME=Vallmark Gift Articles
REACT_APP_VERSION=1.0.0
EOF
```

3. **Create Docker Compose File**
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongo:
    image: mongo:6.0
    container_name: vallmark_mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d
    environment:
      MONGO_INITDB_DATABASE: vallmark_db
    networks:
      - vallmark_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: vallmark_backend
    restart: unless-stopped
    ports:
      - "8001:8001"
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads
    env_file:
      - .env.docker
    depends_on:
      - mongo
    networks:
      - vallmark_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: vallmark_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    env_file:
      - .env.docker
    depends_on:
      - backend
    networks:
      - vallmark_network

volumes:
  mongo_data:
  backend_uploads:

networks:
  vallmark_network:
    driver: bridge
EOF
```

4. **Create Backend Dockerfile**
```bash
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/api/health || exit 1

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
EOF
```

5. **Create Frontend Dockerfile**
```bash
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
EOF
```

6. **Launch the Application**
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

7. **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **MongoDB**: localhost:27017

## 🖥️ Local Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB 6.0+
- Python 3.11+ (for backend development)

### MongoDB Setup
```bash
# Install MongoDB (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
mongo --eval 'db.runCommand({ connectionStatus: 1 })'
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Create environment file
cp .env.example .env

# Start development server
npm start
# or
yarn start
```

### Backend Setup (For Development)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## 📊 Default User Accounts

After initial setup, the system automatically creates these test accounts:

| Role | Email | Username | Password |
|------|--------|----------|----------|
| Super Admin | superadmin@vallmark.com | superadmin | SuperAdmin123! |
| Admin | admin@vallmark.com | admin | Admin123! |
| Store Owner | storeowner@vallmark.com | storeowner | StoreOwner123! |
| Store Manager | storemanager@vallmark.com | storemanager | StoreManager123! |
| Sales Manager | salesmanager@vallmark.com | salesmanager | SalesManager123! |
| Salesperson | salesperson@vallmark.com | salesperson | Salesperson123! |
| Marketing Manager | marketing@vallmark.com | marketing | Marketing123! |
| Support Executive | support@vallmark.com | support | Support123! |
| Customer | customer@vallmark.com | customer | Customer123! |

**⚠️ Important**: Change these default passwords in production!

## 🔐 Enterprise Security Best Practices

### Authentication & Authorization
- **JWT Token Security**: Implement token rotation and short expiry times
- **Role-Based Access Control**: Granular permissions per user role
- **Password Policy**: Enforce strong passwords with complexity requirements
- **Rate Limiting**: Implement API rate limiting to prevent abuse
- **Session Management**: Secure session handling with HttpOnly cookies

### Data Protection
```python
# Password Security
- Use bcrypt with salt rounds ≥ 12
- Implement password history to prevent reuse
- Enable account lockout after failed attempts

# Data Encryption
- Encrypt sensitive data at rest (PII, payment info)
- Use TLS 1.3 for data in transit
- Implement field-level encryption for critical data
```

### API Security
```python
# FastAPI Security Headers
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Never use "*" in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### Database Security
- **Connection Security**: Use encrypted connections to MongoDB
- **Input Validation**: Sanitize all user inputs to prevent injection
- **Access Control**: Implement database-level access controls
- **Audit Logging**: Log all database operations for compliance

## ⚡ Enterprise Performance Optimization

### Backend Performance
```python
# MongoDB Optimization
- Create proper indexes on frequently queried fields
- Use aggregation pipelines for complex queries  
- Implement connection pooling
- Enable MongoDB oplog for real-time features

# FastAPI Optimization
- Use async/await for I/O operations
- Implement response caching with Redis
- Enable gzip compression
- Use connection pooling for database
```

### Frontend Performance
```javascript
// React Optimization
- Implement code splitting with React.lazy()
- Use React.memo for expensive components
- Optimize bundle size with webpack analysis
- Implement service workers for caching

// User Experience
- Add skeleton loading states
- Implement infinite scroll for large datasets
- Use optimistic updates for better UX
- Implement offline functionality
```

### Infrastructure Scaling
```yaml
# Production Deployment
- Use load balancers for horizontal scaling
- Implement CDN for static assets
- Use Redis for session storage and caching
- Set up monitoring with Prometheus/Grafana
- Implement log aggregation with ELK stack
```

## 🔧 Production Deployment

### Environment Configuration
```bash
# Production Environment Variables
JWT_SECRET_KEY=<generate-secure-256-bit-key>
MONGO_URL=mongodb://mongo-cluster:27017/vallmark_prod
AUTO_SEED_USERS=false
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Docker Production Setup
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  mongo:
    image: mongo:6.0
    volumes:
      - mongo_prod_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASS}
    command: mongod --auth
```

### Monitoring & Logging
```bash
# Health Check Endpoints
GET /api/health          # Application health
GET /api/health/db       # Database connectivity
GET /api/health/detailed # Comprehensive system status

# Logging Configuration
- Structured JSON logging
- Error tracking with Sentry
- Performance monitoring with APM tools
- Security audit logs
```

## 🧪 Testing Strategy

### Backend Testing
```bash
cd backend
pytest tests/ -v --cov=. --cov-report=html
```

### Frontend Testing
```bash
cd frontend
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report
```

### Load Testing
```bash
# Using Artillery.js
artillery run load-test.yml
```

## 📈 Monitoring & Analytics

### Application Metrics
- **Performance**: Response times, throughput, error rates
- **Business**: Sales conversion, user engagement, revenue
- **Security**: Failed login attempts, suspicious activities
- **Infrastructure**: CPU, memory, disk usage, network traffic

### Alerting
- Set up alerts for critical system failures
- Monitor business KPIs and thresholds
- Implement escalation procedures
- Use tools like PagerDuty for incident management

## 🚀 API Documentation

### Core Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/logout` - User logout

#### Products
- `GET /api/products/` - List products with filtering
- `POST /api/products/` - Create product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

#### Orders
- `POST /api/orders/` - Create order
- `GET /api/orders/` - List user orders
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}` - Update order status

#### Admin Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/analytics` - Advanced analytics
- `GET /api/users/` - User management
- `PUT /api/users/{id}/role` - Update user role

## 🤝 Contributing

### Code Standards
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript
- Write comprehensive unit tests
- Document all API endpoints
- Follow semantic versioning

### Development Workflow
1. Create feature branch from `develop`
2. Implement feature with tests
3. Submit pull request with description
4. Code review and approval
5. Merge to `develop` branch

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support and inquiries:
- **Email**: support@vallmark.com
- **Documentation**: [Internal Wiki]
- **Issue Tracking**: [Internal Jira]

---

**⚠️ Production Checklist**
- [ ] Change all default passwords
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure monitoring and alerting
- [ ] Enable backup procedures
- [ ] Security audit completion
- [ ] Load testing validation
- [ ] Disaster recovery plan