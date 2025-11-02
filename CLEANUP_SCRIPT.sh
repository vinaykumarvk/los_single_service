#!/bin/bash
# Cleanup script to prepare codebase for GitHub
# Removes deprecated files, temporary files, and unnecessary documentation

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║   Codebase Cleanup for GitHub                  ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Remove backup files
echo "📁 Removing backup files..."
find . -type f \( -name "*.backup" -o -name "*.old" -o -name "*.bak" -o -name "*~" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -delete 2>/dev/null || true
echo "✅ Backup files removed"

# Remove temporary files
echo "🗑️  Removing temporary files..."
find . -type f \( -name "*.tmp" -o -name "*.temp" -o -name ".DS_Store" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -delete 2>/dev/null || true
echo "✅ Temporary files removed"

# Remove PID files from /tmp (not in repo, but checking)
echo "🔍 Checking for PID files..."
if [ -f /tmp/*.pid ]; then
    rm -f /tmp/*-service.pid 2>/dev/null || true
    echo "✅ PID files cleaned"
fi

# Remove test log files
echo "📝 Removing test log files..."
find . -type f -name "*.log" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./infra/*" \
  -delete 2>/dev/null || true
echo "✅ Log files removed"

# Clean up unnecessary documentation (keep essential)
echo "📚 Organizing documentation..."
# We'll keep essential docs in root, remove redundant ones

# Remove duplicate/redundant test result files
if [ -f "/tmp/edge-case-results.txt" ]; then
    rm -f /tmp/*-results.txt /tmp/*-output.txt 2>/dev/null || true
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "  • Backup files removed"
echo "  • Temporary files removed"
echo "  • Test logs removed"
echo ""
echo "⚠️  Note: Review documentation files manually if needed"

