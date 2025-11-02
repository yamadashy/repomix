# Line Limit Feature - Rollback Plan

## Overview

This document outlines the comprehensive rollback strategy for the line limit feature implementation. The plan includes procedures for identifying rollback triggers, executing rollback operations, and ensuring system stability during and after the rollback process.

## Rollback Triggers and Scenarios

### Critical Rollback Triggers

#### 1. Performance Degradation
**Threshold**: > 50% increase in processing time for typical workloads
**Monitoring**: Automated performance alerts from CI/CD pipeline
**Impact**: High - affects all users
**Response Time**: Immediate (within 1 hour)

#### 2. Data Corruption
**Trigger**: Reports of truncated files causing syntax errors or data loss
**Monitoring**: User feedback, automated syntax validation
**Impact**: Critical - affects user data integrity
**Response Time**: Immediate (within 30 minutes)

#### 3. Backward Compatibility Breaks
**Trigger**: Existing configurations or workflows stop working
**Monitoring**: Regression test failures, user reports
**Impact**: High - affects existing users
**Response Time**: Within 2 hours

#### 4. Security Vulnerabilities
**Trigger**: Security audit findings or vulnerability reports
**Monitoring**: Security scans, dependency checks
**Impact**: Critical - potential security risks
**Response Time**: Immediate (within 30 minutes)

### Moderate Rollback Triggers

#### 1. High Error Rates
**Threshold**: > 10% error rate in production usage
**Monitoring**: Error tracking and analytics
**Impact**: Medium - affects subset of users
**Response Time**: Within 4 hours

#### 2. Memory Leaks
**Trigger**: Memory usage increases over time without recovery
**Monitoring**: Memory profiling and monitoring
**Impact**: Medium - affects long-running processes
**Response Time**: Within 6 hours

#### 3. Poor User Experience
**Trigger**: Significant negative user feedback or low adoption
**Monitoring**: User feedback channels, usage analytics
**Impact**: Low-Medium - affects user satisfaction
**Response Time**: Within 24 hours

## Rollback Procedures

### Immediate Rollback (Critical Issues)

#### Step 1: Issue Identification and Assessment
```bash
# Check current version and deployment status
git log --oneline -5
npm list repomix

# Verify issue severity
npm run test:regression
npm run test:performance

# Check for recent changes
git diff HEAD~1 --name-only
```

#### Step 2: Emergency Rollback Execution
```bash
# Create rollback branch
git checkout -b rollback/line-limit-emergency

# Revert line limit feature commits
git revert <commit-hash-1> --no-edit
git revert <commit-hash-2> --no-edit
git revert <commit-hash-3> --no-edit

# Build and test rollback
npm run build
npm run test:critical

# Tag rollback version
git tag -a v1.x.x-rollback -m "Emergency rollback of line limit feature"
```

#### Step 3: Deployment
```bash
# Deploy rollback version
npm publish --tag rollback

# Verify deployment
npm info repomix
repomix --version

# Run smoke tests
npm run test:smoke
```

#### Step 4: Communication
- Notify users via GitHub releases
- Update documentation with rollback notice
- Monitor user feedback and support tickets
- Prepare post-mortem report

### Scheduled Rollback (Moderate Issues)

#### Step 1: Planning and Preparation
```bash
# Schedule maintenance window
echo "Rollback scheduled for $(date -d '+2 hours')"

# Prepare rollback branch
git checkout -b rollback/line-limit-scheduled

# Identify specific commits to revert
git log --oneline --grep="line limit"
```

#### Step 2: Testing and Validation
```bash
# Create rollback testing environment
git checkout rollback/line-limit-scheduled
npm ci
npm run build

# Run comprehensive tests
npm run test:all
npm run test:integration
npm run test:performance

# Validate rollback doesn't break existing functionality
npm run test:regression
```

#### Step 3: Rollback Execution
```bash
# Revert specific feature commits
git revert <feature-commit-1> --no-edit
git revert <feature-commit-2> --no-edit

# Update version and changelog
npm version patch --no-git-tag-version
# Update CHANGELOG.md with rollback information

# Commit rollback changes
git add .
git commit -m "feat: rollback line limit feature due to [reason]"
```

#### Step 4: Deployment and Verification
```bash
# Deploy rollback
npm publish

# Verify deployment
npm dist-tag ls repomix
npm info repomix

# Run production verification
npm run test:production-smoke
```

## Rollback Implementation Details

### Code Changes to Revert

#### 1. CLI Integration Changes
**Files to Revert**:
- [`src/cli/cliRun.ts`](src/cli/cliRun.ts) - Line limit option parsing
- [`src/cli/actions/defaultAction.ts`](src/cli/actions/defaultAction.ts) - Line limit handling

**Revert Commands**:
```bash
git revert <cli-commit-hash> --no-edit
```

#### 2. Configuration Schema Changes
**Files to Revert**:
- [`src/config/configSchema.ts`](src/config/configSchema.ts) - Line limit schema extension

**Revert Commands**:
```bash
git revert <config-commit-hash> --no-edit
```

#### 3. Core Processing Changes
**Files to Revert**:
- [`src/core/file/fileProcessContent.ts`](src/core/file/fileProcessContent.ts) - Line limiting algorithm
- [`src/core/treeSitter/`](src/core/treeSitter/) - Language-specific modifications

**Revert Commands**:
```bash
git revert <core-commit-hash> --no-edit
```

#### 4. Test Changes
**Files to Revert**:
- All test files related to line limit feature
- Test fixtures and data

**Revert Commands**:
```bash
git revert <test-commit-hash> --no-edit
```

### Database and Configuration Rollback

#### Configuration Files
```bash
# Remove line limit from default configuration
# This happens automatically when reverting configSchema.ts

# Update documentation
git revert <docs-commit-hash> --no-edit
```

#### Package.json Updates
```bash
# Version rollback
npm version patch --no-git-tag-version

# Update dependencies if needed
npm install --save-exact repomix@<previous-version>
```

## Testing Rollback Procedures

### Pre-Rollback Testing

#### 1. Critical Functionality Tests
```bash
# Test basic Repomix functionality without line limit
npm run test:cli
npm run test:config
npm run test:output

# Test with various configurations
npm run test:integration
```

#### 2. Performance Validation
```bash
# Ensure performance returns to baseline
npm run test:performance-baseline

# Compare with previous benchmarks
npm run test:performance-compare
```

#### 3. Regression Testing
```bash
# Verify no regressions introduced by rollback
npm run test:regression

# Test edge cases
npm run test:edge-cases
```

### Post-Rollback Verification

#### 1. Smoke Tests
```bash
# Basic functionality verification
repomix --version
repomix --help
repomix ./test-repo --output xml
```

#### 2. Integration Tests
```bash
# Test with real repositories
npm run test:real-world

# Test various output formats
npm run test:output-formats
```

#### 3. User Workflow Tests
```bash
# Test common user workflows
npm run test:user-workflows

# Test configuration file handling
npm run test:config-workflows
```

## Communication Plan

### Internal Communication

#### Development Team
- Immediate notification of rollback decision
- Clear assignment of rollback responsibilities
- Technical details and rollback procedures
- Post-mortem meeting schedule

#### QA Team
- Notification of rollback testing requirements
- Updated test cases and expectations
- Regression testing priorities
- Sign-off procedures

#### Support Team
- Training on rollback implications
- Updated troubleshooting procedures
- Customer communication templates
- Escalation procedures

### External Communication

#### GitHub Release
```markdown
## Rollback Notice - Line Limit Feature

### Summary
The line limit feature has been temporarily rolled back due to [reason].

### Impact
- The `--line` CLI option is no longer available
- Configuration files with `lineLimit` will be ignored
- All other Repomix functionality remains unchanged

### Alternatives
- Continue using Repomix without line limits
- Manually preprocess files before using Repomix
- Use existing file filtering options

### Timeline
- Rollback effective: [timestamp]
- Next update: [timeline for fix or re-release]

We apologize for any inconvenience and appreciate your understanding.
```

#### Documentation Updates
- Update README.md to remove line limit feature
- Update CLI help text
- Update configuration documentation
- Add rollback notice to website

#### Community Communication
- GitHub issues response template
- Discord/Slack announcements
- Twitter/social media updates
- Email newsletter notice

## Monitoring and Validation

### Post-Rollback Monitoring

#### 1. Performance Monitoring
```bash
# Monitor processing times
npm run monitor:performance

# Track error rates
npm run monitor:errors

# Memory usage tracking
npm run monitor:memory
```

#### 2. Usage Analytics
- Track feature usage drop to zero
- Monitor for unexpected behavior
- Collect user feedback on rollback
- Watch for related issues

#### 3. System Health Checks
```bash
# Automated health checks
npm run health:check

# Integration with monitoring services
npm run monitor:integration

# Alert configuration
npm run monitor:alerts
```

### Validation Criteria

#### Success Metrics
- Processing times return to baseline levels
- Error rates drop below 1%
- No new issues reported in first 24 hours
- User feedback indicates stable operation

#### Failure Indicators
- Performance continues to degrade
- New errors introduced by rollback
- Users report broken functionality
- System instability persists

## Recovery and Re-release Planning

### Root Cause Analysis

#### 1. Issue Investigation
```bash
# Analyze failed commits
git bisect start
git bisect bad <problematic-commit>
git bisect good <known-good-commit>

# Review code changes
git show <problematic-commit>

# Analyze test failures
npm run test:analyze-failures
```

#### 2. Performance Analysis
```bash
# Profile performance issues
npm run profile:performance

# Memory leak detection
npm run profile:memory

# Bottleneck identification
npm run profile:bottlenecks
```

#### 3. User Feedback Analysis
- Collect and categorize user reports
- Identify common patterns
- Prioritize issues for fixing
- Document lessons learned

### Re-release Strategy

#### 1. Fix Implementation
```bash
# Create fix branch
git checkout -b fix/line-limit-issues

# Implement fixes based on analysis
# ... fix implementation ...

# Comprehensive testing
npm run test:comprehensive
```

#### 2. Staged Rollout
```bash
# Release to beta channel first
npm publish --tag beta

# Monitor beta usage
npm run monitor:beta

# Gradual rollout to stable
npm publish --tag latest
```

#### 3. Enhanced Testing
- Additional automated tests
- Extended performance testing
- Real-world validation
- User acceptance testing

## Rollback Automation

### Automated Rollback Scripts

#### 1. Emergency Rollback Script
```bash
#!/bin/bash
# rollback-emergency.sh

set -e

echo "Starting emergency rollback of line limit feature..."

# Check current state
CURRENT_VERSION=$(npm view repomix version)
echo "Current version: $CURRENT_VERSION"

# Create rollback branch
git checkout -b rollback/emergency-$(date +%Y%m%d-%H%M%S)

# Revert feature commits
FEATURE_COMMITS=$(git log --oneline --grep="line limit" --reverse | cut -d' ' -f1)

for commit in $FEATURE_COMMITS; do
    echo "Reverting commit: $commit"
    git revert $commit --no-edit
done

# Build and test
npm ci
npm run build
npm run test:critical

# Tag and deploy
ROLLBACK_VERSION="${CURRENT_VERSION}-rollback-$(date +%Y%m%d)"
npm version $ROLLBACK_VERSION --no-git-tag-version
git add .
git commit -m "Emergency rollback: $ROLLBACK_VERSION"

echo "Rollback completed. Version: $ROLLBACK_VERSION"
echo "Run 'npm publish' to deploy the rollback."
```

#### 2. Health Check Script
```bash
#!/bin/bash
# health-check.sh

set -e

echo "Running post-rollback health checks..."

# Basic functionality tests
repomix --version
repomix --help

# Test with sample repository
TEST_REPO="/tmp/test-repo"
git clone https://github.com/example/small-repo.git $TEST_REPO
repomix $TEST_REPO --output plain

# Performance check
START_TIME=$(date +%s)
repomix $TEST_REPO --output xml
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $DURATION -gt 30 ]; then
    echo "WARNING: Performance degradation detected"
    exit 1
fi

echo "Health checks passed"
rm -rf $TEST_REPO
```

### CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/rollback.yml
name: Rollback Procedures

on:
  workflow_dispatch:
    inputs:
      rollback_type:
        description: 'Type of rollback'
        required: true
        default: 'scheduled'
        type: choice
        options:
        - emergency
        - scheduled

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Execute rollback
        run: |
          chmod +x scripts/rollback-${{ github.event.inputs.rollback_type }}.sh
          ./scripts/rollback-${{ github.event.inputs.rollback_type }}.sh
      
      - name: Run health checks
        run: |
          chmod +x scripts/health-check.sh
          ./scripts/health-check.sh
      
      - name: Deploy rollback
        if: success()
        run: npm publish --tag rollback
      
      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Rollback ${{ github.event.inputs.rollback_type }} completed
            Status: ${{ job.status }}
```

## Documentation and Knowledge Transfer

### Rollback Documentation

#### 1. Runbook Creation
- Step-by-step rollback procedures
- Contact information for key personnel
- Escalation procedures
- Post-rollback validation steps

#### 2. Training Materials
- Rollback procedure training for team members
- Troubleshooting guides
- Communication templates
- Monitoring and alerting setup

#### 3. Knowledge Base Articles
- Common rollback scenarios
- Lessons learned from rollbacks
- Best practices for feature releases
- Rollback prevention strategies

### Post-Mortem Process

#### 1. Incident Timeline
```markdown
## Line Limit Feature Rollback Post-Mortem

### Timeline
- [Time]: Issue detected via [monitoring/alert]
- [Time]: Investigation started
- [Time]: Rollback decision made
- [Time]: Rollback executed
- [Time]: Service restored
```

#### 2. Impact Assessment
- Number of users affected
- Duration of impact
- Business impact metrics
- Customer feedback summary

#### 3. Root Cause Analysis
- Technical root causes
- Process gaps
- Testing deficiencies
- Communication issues

#### 4. Action Items
- Preventive measures
- Process improvements
- Testing enhancements
- Monitoring improvements

## Conclusion

This rollback plan provides a comprehensive framework for safely reverting the line limit feature if issues arise. The plan emphasizes quick response times, thorough testing, clear communication, and systematic monitoring to ensure system stability during and after rollback operations.

The automated scripts and CI/CD integration enable rapid rollback execution while maintaining quality standards. The post-mortem process ensures continuous improvement and learning from rollback incidents.

Regular review and updating of this plan will ensure its effectiveness and relevance as the system evolves.