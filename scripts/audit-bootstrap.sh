#!/bin/bash
# Bootstrap Consistency Audit Script
# v0.2.0 Stabilization - Phase 02
# This script scans Handlebars templates for Bootstrap consistency issues

set -e

VIEWS_DIR="ProjectSourceCode/src/express/views"

echo "=============================================="
echo "Bootstrap Consistency Audit Report"
echo "=============================================="
echo ""

# Check 1: Inline styles
echo "1. INLINE STYLES AUDIT"
echo "----------------------"
inline_count=$(grep -r 'style=' "${VIEWS_DIR}" 2>/dev/null | wc -l)
echo "Total inline style occurrences: ${inline_count}"
echo ""
echo "Files with inline styles:"
grep -r -c 'style=' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | sort -t: -k2 -rn || true
echo ""

# Check 2: Container usage
echo "2. CONTAINER USAGE AUDIT"
echo "------------------------"
container_count=$(grep -r -c 'class="container' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
container_fluid_count=$(grep -r -c 'class="container-fluid' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
echo "Files using .container: ${container_count}"
echo "Files using .container-fluid: ${container_fluid_count}"
echo ""

# Check 3: Bootstrap card components
echo "3. CARD COMPONENT USAGE"
echo "-----------------------"
card_count=$(grep -r -c 'class="card' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
card_body_count=$(grep -r -c 'card-body' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
card_title_count=$(grep -r -c 'card-title' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
echo "Files using .card: ${card_count}"
echo "Files using .card-body: ${card_body_count}"
echo "Files using .card-title: ${card_title_count}"
echo ""

# Check 4: Button classes
echo "4. BUTTON CLASS USAGE"
echo "---------------------"
btn_count=$(grep -r -c 'class="btn' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
btn_primary=$(grep -r -c 'btn-primary' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
btn_secondary=$(grep -r -c 'btn-secondary' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
btn_success=$(grep -r -c 'btn-success' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
echo "Files using .btn: ${btn_count}"
echo "Files using .btn-primary: ${btn_primary}"
echo "Files using .btn-secondary: ${btn_secondary}"
echo "Files using .btn-success: ${btn_success}"
echo ""

# Check 5: Form classes
echo "5. FORM CLASS USAGE"
echo "-------------------"
form_control=$(grep -r -c 'form-control' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
form_label=$(grep -r -c 'form-label' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
echo "Files using .form-control: ${form_control}"
echo "Files using .form-label: ${form_label}"
echo ""

# Check 6: Grid classes
echo "6. GRID CLASS USAGE"
echo "-------------------"
row_count=$(grep -r -c 'class="row' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
col_count=$(grep -r -c 'class="col' "${VIEWS_DIR}" 2>/dev/null | grep -v ':0$' | wc -l)
echo "Files using .row: ${row_count}"
echo "Files using .col-*: ${col_count}"
echo ""

# Check 7: Custom classes that should be Bootstrap
echo "7. POTENTIAL BOOTSTRAP REPLACEMENTS"
echo "------------------------------------"
echo "Searching for custom CSS classes that could use Bootstrap..."
echo ""
echo "Custom button classes (not btn-*):"
grep -r 'class=".*btn-' "${VIEWS_DIR}" 2>/dev/null | grep -v 'btn-primary\|btn-secondary\|btn-success\|btn-danger\|btn-warning\|btn-info\|btn-light\|btn-dark\|btn-outline\|btn-sm\|btn-lg\|btn-link\|btn-close\|btn-block' | head -10 || echo "None found"
echo ""

# Summary
echo "=============================================="
echo "SUMMARY"
echo "=============================================="
echo "Total inline styles: ${inline_count} (Target: <3 per template average)"
echo ""

# Calculate average
total_templates=$(find "${VIEWS_DIR}" -name "*.hbs" | wc -l)
if [[ ${total_templates} -gt 0 ]]; then
  average=$(echo "scale=2; ${inline_count} / ${total_templates}" | bc)
  echo "Templates scanned: ${total_templates}"
  echo "Average inline styles per template: ${average}"
fi

echo ""
echo "Audit complete."
