# Comprehensive Testing Checklist
## Pre-Deployment Testing Plan

---

## 🎯 Testing Scope

### Critical Path Testing
- [ ] Authentication flow (Login, JWT, Keycloak)
- [ ] Persona-based routing (RM, Admin, Operations)
- [ ] Application creation workflow
- [ ] Data entitlements (RM sees only assigned applications)
- [ ] Hierarchical dashboards (Regional Head → SRM → RM)
- [ ] Real-time updates (SSE)

### Mobile & UX Testing
- [ ] Mobile responsiveness (all breakpoints)
- [ ] Dark mode (contrast, readability)
- [ ] Touch targets (44px minimum)
- [ ] Swipe gestures (mobile cards)
- [ ] Bottom navigation (mobile)
- [ ] Pull-to-refresh
- [ ] Bottom sheets (modals)
- [ ] Lazy image loading
- [ ] Form validation
- [ ] Error handling

### Performance Testing
- [ ] Initial load time
- [ ] Bundle sizes
- [ ] Core Web Vitals (FCP, LCP, FID, CLS)
- [ ] Code splitting (verify chunks)
- [ ] Service worker caching
- [ ] Offline functionality

### Browser Compatibility
- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Firefox
- [ ] Edge

### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators
- [ ] ARIA labels

---

## 📋 Test Categories

### 1. Functional Tests
**Location**: `scripts/comprehensive-functional-tests.sh`

**Test Cases**:
- [ ] User authentication
- [ ] Application CRUD operations
- [ ] Data filtering and search
- [ ] Pagination
- [ ] Status transitions
- [ ] File uploads
- [ ] Form submissions
- [ ] Error scenarios

### 2. Edge Case Tests
**Location**: `scripts/edge-case-tests.sh`

**Test Cases**:
- [ ] Invalid UUIDs
- [ ] Non-existent IDs
- [ ] Boundary values
- [ ] Empty data
- [ ] Large datasets
- [ ] Special characters
- [ ] Concurrent requests
- [ ] Network failures

### 3. Integration Tests
**Areas to Test**:
- [ ] API Gateway routing
- [ ] Service-to-service communication
- [ ] Database connections
- [ ] Event streaming (Kafka)
- [ ] File storage (MinIO/S3)
- [ ] Authentication flow

### 4. UI/UX Tests
**Manual Testing Required**:
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Forms submit properly
- [ ] Modals open/close
- [ ] Dark mode toggle
- [ ] Mobile gestures
- [ ] Responsive layouts

### 5. Performance Tests
**Metrics to Verify**:
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.8s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size < 500KB

---

## 🧪 Testing Commands

### Run Functional Tests
```bash
chmod +x scripts/comprehensive-functional-tests.sh
./scripts/comprehensive-functional-tests.sh
```

### Run Edge Case Tests
```bash
chmod +x scripts/edge-case-tests.sh
./scripts/edge-case-tests.sh
```

### Check Linter Errors
```bash
cd web && pnpm run lint
```

### Build Test (Check for errors)
```bash
cd web && pnpm run build
```

### Performance Audit
```bash
# Open browser DevTools
# Run Lighthouse audit
# Check Network tab for bundle sizes
```

---

## 📱 Mobile Testing Checklist

### Device Testing
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Android Tablet (Chrome)

### Mobile Features
- [ ] Bottom navigation visible/hidden correctly
- [ ] Swipe gestures work
- [ ] Pull-to-refresh works
- [ ] Touch targets are 44px+
- [ ] Forms are mobile-friendly
- [ ] Keyboard handling
- [ ] Safe area insets
- [ ] PWA install prompt

### Mobile UX
- [ ] No horizontal scroll
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Modals are mobile-optimized
- [ ] Loading states visible
- [ ] Error messages clear

---

## 🔍 Smoke Tests (Quick Verification)

### Critical Path (5 minutes)
1. [ ] Login works
2. [ ] Dashboard loads
3. [ ] Create new application
4. [ ] View application details
5. [ ] Navigate between pages

### Mobile (5 minutes)
1. [ ] Open on mobile device
2. [ ] Bottom nav appears
3. [ ] Swipe on a card
4. [ ] Toggle dark mode
5. [ ] Pull to refresh

---

## 🚨 Known Issues to Verify

### Fixes Applied
- [ ] Verify dark mode contrast ratios
- [ ] Verify theme toggle on all pages
- [ ] Verify bottom nav only shows on mobile
- [ ] Verify swipe gestures don't break desktop
- [ ] Verify service worker caching
- [ ] Verify code splitting works

---

## 📊 Test Coverage Goals

### Target Coverage
- **Critical Path**: 100%
- **API Endpoints**: 80%+
- **UI Components**: 70%+
- **Edge Cases**: 60%+

### Current Status
- Functional tests: ✅ Available
- Edge case tests: ✅ Available
- Unit tests: ❌ Not implemented
- E2E tests: ❌ Not implemented
- Integration tests: ⚠️ Partial

---

## ✅ Pre-Deployment Checklist

### Before Deploying
- [ ] All functional tests pass
- [ ] All edge case tests pass
- [ ] No linter errors
- [ ] Build succeeds without warnings
- [ ] Performance metrics meet targets
- [ ] Mobile tested on real devices
- [ ] Dark mode tested
- [ ] Accessibility verified
- [ ] Browser compatibility checked
- [ ] Security review completed

---

## 🎯 Recommended Testing Order

1. **Smoke Tests** (5-10 min) - Quick verification
2. **Functional Tests** (15-20 min) - Automated script
3. **Edge Case Tests** (10-15 min) - Automated script
4. **Manual UI Testing** (30-45 min) - All pages
5. **Mobile Testing** (20-30 min) - Real devices
6. **Performance Testing** (15-20 min) - Lighthouse
7. **Accessibility Testing** (15-20 min) - Screen reader, keyboard

**Total Time**: ~2-3 hours for comprehensive testing

---

## 📝 Test Results Template

### Test Execution Log
```
Date: __________
Tester: __________
Environment: __________

Functional Tests: [ ] Pass [ ] Fail
Edge Case Tests: [ ] Pass [ ] Fail
Mobile Tests: [ ] Pass [ ] Fail
Performance: [ ] Pass [ ] Fail
Accessibility: [ ] Pass [ ] Fail

Issues Found:
1. __________
2. __________
3. __________

Recommendation: [ ] Ready for Deployment [ ] Needs Fixes
```

---

## 🚀 Quick Start Testing

### Minimum Viable Testing (30 minutes)
1. Run functional tests script
2. Run edge case tests script
3. Manual smoke test on desktop
4. Manual smoke test on mobile
5. Check Lighthouse score

If all pass → Ready for deployment
If any fail → Fix and retest
