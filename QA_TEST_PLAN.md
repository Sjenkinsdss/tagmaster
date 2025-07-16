# QA Test Plan - Tagging Interface MVP

## Test Environment Setup
- **URL**: https://[replit-domain]/
- **Database**: Connected to production (shelfdb) + Replit (neondb)
- **Browser**: Chrome, Firefox, Safari recommended
- **Screen Sizes**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)

## Critical Path Testing (Priority 1)

### 1. Core Interface Loading
**Test Case**: Application loads correctly
- [ ] Navigate to application URL
- [ ] Verify three-column layout displays (Content | Tags | Connected Ads)
- [ ] Check header controls are visible (filters, search, buttons)
- [ ] Confirm pagination controls appear at bottom
- [ ] Verify no JavaScript errors in console

**Expected Result**: Interface loads within 3 seconds with all components visible

### 2. Post Selection and Display
**Test Case**: Post selection updates interface
- [ ] Click on any post in left column
- [ ] Verify post highlights with blue border
- [ ] Check Tags column populates with tag sections
- [ ] Confirm Connected Ads column shows related ads
- [ ] Verify post details display correctly

**Expected Result**: Selected post updates all three columns appropriately

### 3. TypeTagSection Functionality
**Test Case**: Each tag type section works correctly
- [ ] Verify all 6 tag types display: ad 📢, campaign 🎯, client 🏢, post 📝, ai 🤖, influencer 👤
- [ ] Check gray box styling and emoji headers
- [ ] Confirm category dropdown populates with options
- [ ] Verify tag dropdown filters by selected category
- [ ] Test "Add Tag" button in each section

**Expected Result**: All sections display correctly with working dropdowns

### 4. Tag Creation Workflow
**Test Case**: Creating new tags works properly
- [ ] Select a category from dropdown
- [ ] Select a tag from filtered tag dropdown
- [ ] Click "Add Tag" button
- [ ] Verify system shows "read-only database" error (production mode)
- [ ] Check error message is user-friendly

**Expected Result**: Proper error message shown due to read-only production database

### 5. Search and Filtering
**Test Case**: All filters work correctly
- [ ] Test campaign filter dropdown
- [ ] Test client filter dropdown  
- [ ] Test post ID filter with partial matches
- [ ] Test search functionality with keywords
- [ ] Verify "Clear All" button resets filters
- [ ] Check filter combinations work together

**Expected Result**: All filters modify displayed posts correctly

### 6. Pagination Testing
**Test Case**: Pagination controls function properly
- [ ] Click "Next" and "Previous" buttons
- [ ] Change page size (10, 20, 50, 100)
- [ ] Verify page counter updates correctly
- [ ] Check pagination resets when filters change
- [ ] Test navigation to specific pages

**Expected Result**: Pagination navigates through 2229+ total posts

## Advanced Features Testing (Priority 2)

### 7. AI Tag Recommendations
**Test Case**: AI recommendations display and function
- [ ] Select a post and wait for recommendations to load
- [ ] Verify confidence scores display (may take 10+ seconds)
- [ ] Check recommendation reasons are shown
- [ ] Test clicking recommended tags
- [ ] Verify recommendation accuracy

**Expected Result**: AI recommendations appear with confidence scores and reasons

### 8. Tag Management Interface
**Test Case**: Advanced tag operations work
- [ ] Click "Tag Management" button in header
- [ ] Verify tag creation form appears
- [ ] Test tag type dropdown population
- [ ] Test category dropdown population
- [ ] Attempt to create new tag (should show read-only error)
- [ ] Test tag merge/split/edit interfaces

**Expected Result**: Tag management interface accessible with proper read-only protection

### 9. Bulk Operations
**Test Case**: Bulk post and tag operations
- [ ] Enable "Bulk Select" mode
- [ ] Select multiple posts with checkboxes
- [ ] Verify bulk tag application interface
- [ ] Test "Select All" and "Deselect All" buttons
- [ ] Attempt bulk tag operations (should show read-only error)

**Expected Result**: Bulk operations interface works with proper error handling

### 10. Connected Ads Management
**Test Case**: Paid ads display and link correctly
- [ ] Select post with connected ads
- [ ] Verify ads display in right column
- [ ] Check ad performance metrics (CTR, Reach, Spend)
- [ ] Test ad linking/unlinking controls
- [ ] Verify "Connect New Paid Ad" form
- [ ] Test ad creation workflow (should show read-only error)

**Expected Result**: Connected ads display with proper metrics and controls

## Error Handling Testing (Priority 3)

### 11. Database Error Scenarios
**Test Case**: System handles database errors gracefully
- [ ] Test with network disconnection
- [ ] Verify error messages are user-friendly
- [ ] Check system doesn't crash on errors
- [ ] Test fallback to cached data
- [ ] Verify read-only protection messages

**Expected Result**: Graceful error handling with informative messages

### 12. Input Validation Testing
**Test Case**: Form inputs validate correctly
- [ ] Test empty form submissions
- [ ] Test invalid data entry
- [ ] Test special characters in search
- [ ] Test extremely long post ID filters
- [ ] Verify XSS protection

**Expected Result**: All inputs validate properly without security issues

## Performance Testing (Priority 3)

### 13. Load Time Testing
**Test Case**: Application performs within acceptable limits
- [ ] Measure initial page load time (<3 seconds)
- [ ] Test post selection response time (<500ms)
- [ ] Verify filter operation speed (<1 second)
- [ ] Check pagination response time (<500ms)
- [ ] Monitor memory usage during extended use

**Expected Result**: All operations complete within specified time limits

### 14. Browser Compatibility
**Test Case**: Works across different browsers
- [ ] Test in Chrome (latest version)
- [ ] Test in Firefox (latest version)
- [ ] Test in Safari (latest version)
- [ ] Test in Edge (latest version)
- [ ] Verify responsive design on mobile

**Expected Result**: Consistent functionality across all browsers

## Security Testing (Priority 2)

### 15. Data Security
**Test Case**: Sensitive data is protected
- [ ] Verify no API keys visible in frontend
- [ ] Check database credentials are secured
- [ ] Test SQL injection protection
- [ ] Verify read-only database protection
- [ ] Check HTTPS enforcement

**Expected Result**: All security measures properly implemented

## Regression Testing (Priority 1)

### 16. Previous Features Still Work
**Test Case**: Removal of Connected Tags section didn't break functionality
- [ ] Verify TypeTagSection replaced connected tags display
- [ ] Check bulk edit mode still works
- [ ] Confirm tag selection functionality preserved
- [ ] Test all existing features still operational
- [ ] Verify no broken links or components

**Expected Result**: All previously working features continue to function

## Test Data Requirements

### Sample Test Cases
1. **Post ID**: 1283185187 (known post with tags and ads)
2. **Search Terms**: "Sam's Club", "Curology", "fashion"
3. **Filter Combinations**: Campaign + Client + Search
4. **Tag Categories**: Product, Influencer, Campaign types
5. **Pagination**: Test pages 1, 2, 50, 100, last page

## Bug Reporting Template
```
**Bug ID**: [Unique identifier]
**Severity**: Critical/High/Medium/Low
**Priority**: P1/P2/P3/P4
**Component**: [Interface section]
**Steps to Reproduce**: [Numbered steps]
**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Browser**: [Browser and version]
**Screenshots**: [If applicable]
**Console Errors**: [Any JavaScript errors]
```

## Test Sign-off Criteria
- [ ] All Priority 1 tests pass
- [ ] No critical or high-severity bugs
- [ ] Performance meets requirements
- [ ] Security testing complete
- [ ] Cross-browser compatibility verified
- [ ] Documentation updated

## Test Environment Checklist
- [ ] Application server running
- [ ] Database connections verified
- [ ] Test data populated
- [ ] Browser dev tools available
- [ ] Network monitoring tools ready
- [ ] Screenshot capability available

## Post-QA Requirements
1. **Bug Fixes**: Address any critical issues found
2. **Performance Optimization**: Improve AI recommendation loading
3. **Documentation Updates**: Update user guides if needed
4. **Deployment Preparation**: Ensure production readiness
5. **Monitoring Setup**: Implement error tracking and analytics