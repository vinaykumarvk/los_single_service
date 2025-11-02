# Pre-Deployment Checklist

## ✅ Critical Items Before Production Deployment

### 1. **New Services Integration**

#### Scoring Service (Port 3018)
- [ ] Add to Gateway routing
- [ ] Create Dockerfile
- [ ] Add to docker-compose.prod.yml
- [ ] Update environment variables template
- [ ] Add health check endpoint

#### Analytics Service (Port 3019)
- [ ] Add to Gateway routing
- [ ] Create Dockerfile
- [ ] Add to docker-compose.prod.yml
- [ ] Update environment variables template
- [ ] Add health check endpoint

### 2. **Gateway Configuration**
- [ ] Add `/scoring` route
- [ ] Add `/analytics` route
- [ ] Configure rate limiting for new services
- [ ] Add user forwarding headers

### 3. **Environment Variables**
- [ ] Update `infra/env.prod.template` with:
  - `SCORING_SERVICE_URL`
  - `SCORING_PORT=3018`
  - `ANALYTICS_PORT=3019`
  - Third-party scoring API keys (if using)
  - `EXPERIAN_API_KEY`, `EQUIFAX_API_KEY`, etc.

### 4. **Docker Configuration**
- [ ] Create Dockerfiles for scoring and analytics
- [ ] Update docker-compose.prod.yml with new services
- [ ] Configure service dependencies
- [ ] Add health checks

### 5. **Database Migrations**
- [ ] Ensure all migrations are run
- [ ] Create migration for scoring history (if needed)
- [ ] Create migration for saved reports (if needed)

### 6. **Security**
- [ ] Review API rate limits
- [ ] Verify authentication on all endpoints
- [ ] Check PII masking in logs
- [ ] Review secret management
- [ ] Verify HTTPS configuration
- [ ] Check CORS settings

### 7. **Monitoring & Observability**
- [ ] Add health checks for all services
- [ ] Configure logging levels
- [ ] Set up error tracking (Sentry/DataDog)
- [ ] Configure metrics collection
- [ ] Set up alerting rules

### 8. **Testing**
- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Run E2E tests
- [ ] Load testing
- [ ] Security testing

### 9. **Documentation**
- [ ] Update README.md with new services
- [ ] Update API documentation
- [ ] Create deployment runbook
- [ ] Document environment variables

### 10. **Frontend**
- [ ] Build production bundle
- [ ] Verify PWA icons are in place
- [ ] Test service worker registration
- [ ] Verify manifest.json
- [ ] Test on mobile devices

### 11. **CI/CD**
- [ ] Update build pipelines
- [ ] Add new services to deployment scripts
- [ ] Configure staging environment
- [ ] Set up automated testing

---

## 🚨 High Priority Items

1. **Gateway Routes** - New services won't be accessible without this
2. **Docker Configuration** - Services won't deploy without Dockerfiles
3. **Environment Variables** - Services need configuration
4. **Health Checks** - Monitoring requires this

---

## 📋 Detailed Actions

See `DEPLOYMENT_FIXES.md` for implementation details.

