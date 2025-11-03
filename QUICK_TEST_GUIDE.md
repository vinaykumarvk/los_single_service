# Quick Testing Guide
## 30-Minute Pre-Deployment Test

---

## ⚡ Quick Smoke Test (5 minutes)

### Desktop Browser
1. **Start the app**: `cd web && pnpm run dev`
2. **Login**: Navigate to http://localhost:5173/login
   - [ ] Login page loads
   - [ ] Can login with test credentials
   - [ ] Redirects to dashboard
3. **Dashboard**: Check http://localhost:5173/rm
   - [ ] Dashboard loads
   - [ ] Statistics cards visible
   - [ ] Recent applications shown
4. **Applications**: Navigate to Applications list
   - [ ] List loads
   - [ ] Can see applications
   - [ ] Can click to view details

### Mobile Browser (or DevTools mobile view)
1. **Resize to mobile** (375px width)
   - [ ] Bottom navigation appears
   - [ ] Layout is responsive
   - [ ] Touch targets are large enough
2. **Swipe test**: On Applications list
   - [ ] Can swipe cards left/right
   - [ ] Actions appear
3. **Dark mode**: Toggle theme
   - [ ] All text is readable
   - [ ] Contrast is good
   - [ ] No UI breaks

---

## 🧪 Automated Tests (10 minutes)

### Run Functional Tests
```bash
cd /Users/n15318/LoS
chmod +x scripts/comprehensive-functional-tests.sh
./scripts/comprehensive-functional-tests.sh
```

**Expected**: All tests pass

### Run Edge Case Tests
```bash
chmod +x scripts/edge-case-tests.sh
./scripts/edge-case-tests.sh
```

**Expected**: All tests pass

---

## 🔍 Build Verification (5 minutes)

```bash
cd web
pnpm run build
```

**Check for**:
- [ ] No build errors
- [ ] Bundle sizes reasonable
- [ ] No TypeScript errors
- [ ] No linting errors

---

## 📱 Mobile Features Test (10 minutes)

### Test on Mobile Device or DevTools
1. **Bottom Navigation**
   - [ ] Visible on mobile (< 768px)
   - [ ] Hidden on desktop (>= 768px)
   - [ ] All links work
   - [ ] Active state highlighted

2. **Swipe Gestures**
   - [ ] Swipe right on application card
   - [ ] Actions appear (View, Delete)
   - [ ] Can tap action button
   - [ ] Card snaps back

3. **Pull-to-Refresh**
   - [ ] Pull down on Dashboard
   - [ ] Refresh indicator appears
   - [ ] Data refreshes

4. **Dark Mode**
   - [ ] Toggle works
   - [ ] All pages readable
   - [ ] No contrast issues
   - [ ] Theme persists

5. **Forms**
   - [ ] Input fields work
   - [ ] Validation messages appear
   - [ ] Can submit forms
   - [ ] Error handling works

---

## ✅ Critical Path Test (5 minutes)

1. **Login Flow**
   - [ ] Enter credentials
   - [ ] Submit form
   - [ ] Redirects to dashboard
   - [ ] User info displayed

2. **Application Creation**
   - [ ] Click "New Application"
   - [ ] Fill form
   - [ ] Submit
   - [ ] Application appears in list

3. **Data Entitlements**
   - [ ] Login as RM1
   - [ ] See only assigned applications
   - [ ] Login as RM2
   - [ ] See different applications

4. **Hierarchical Dashboard**
   - [ ] Login as Regional Head
   - [ ] See aggregated data
   - [ ] Can drill down to SRM
   - [ ] Can drill down to RM

---

## 🚨 Common Issues to Check

### If Tests Fail
1. **Services not running?**
   ```bash
   ./scripts/start-all-services.sh
   ```

2. **Database connection issues?**
   - Check PostgreSQL is running
   - Verify connection strings

3. **Port conflicts?**
   - Check if ports are in use
   - Kill conflicting processes

### If Build Fails
1. **TypeScript errors?**
   ```bash
   cd web && pnpm run type-check
   ```

2. **Missing dependencies?**
   ```bash
   cd web && pnpm install
   ```

3. **Linter errors?**
   ```bash
   cd web && pnpm run lint
   ```

---

## 📊 Performance Quick Check

### Lighthouse Audit (5 minutes)
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

---

## 🎯 Decision Matrix

### Ready for Deployment If:
- ✅ All smoke tests pass
- ✅ Functional tests pass
- ✅ Edge case tests pass
- ✅ Build succeeds
- ✅ Mobile features work
- ✅ Dark mode works
- ✅ No critical bugs found

### Need Fixes If:
- ❌ Any test fails
- ❌ Build errors
- ❌ Critical bugs found
- ❌ Performance below targets
- ❌ Accessibility issues

---

## 📝 Test Report Template

```
Date: __________
Environment: Local / Staging / Production
Tester: __________

Smoke Tests: [ ] Pass [ ] Fail
Functional Tests: [ ] Pass [ ] Fail
Edge Case Tests: [ ] Pass [ ] Fail
Build: [ ] Pass [ ] Fail
Mobile: [ ] Pass [ ] Fail
Performance: [ ] Pass [ ] Fail

Issues:
1. __________
2. __________

Recommendation: [ ] Deploy [ ] Fix First
```

---

## 🚀 Next Steps

1. **Run quick smoke test** (5 min)
2. **Run automated tests** (10 min)
3. **Check build** (5 min)
4. **Test mobile features** (10 min)
5. **Review results** (5 min)

**Total: ~35 minutes**

If all pass → **Ready for deployment!**
If any fail → **Fix and retest**

