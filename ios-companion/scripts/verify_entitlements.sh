#!/bin/bash
# verify_entitlements.sh
# Verifies that the iOS Companion app and extension have correct embedded entitlements

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "iOS Companion Entitlement Verification"
echo "========================================="
echo ""

# Function to find the most recent build
find_recent_build() {
  local search_path="$1"
  find "$search_path" -name "DisciplineDungeonIOSCompanion.app" -type d 2>/dev/null | head -1
}

# Try to locate built .app
APP_PATH=""
if [ $# -ge 1 ]; then
  APP_PATH="$1"
  echo "Using provided app path: $APP_PATH"
else
  echo "Searching for built .app in DerivedData..."

  # Common DerivedData locations
  DERIVED_PATHS=(
    "$HOME/Library/Developer/Xcode/DerivedData"
    "$PROJECT_ROOT/.deriveddata-"*
  )

  for derived in "${DERIVED_PATHS[@]}"; do
    if [ -d "$derived" ]; then
      APP_PATH=$(find_recent_build "$derived")
      if [ -n "$APP_PATH" ]; then
        break
      fi
    fi
  done
fi

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo -e "${RED}ERROR: Could not find DisciplineDungeonIOSCompanion.app${NC}"
  echo "Please build the project in Xcode first, or provide the path:"
  echo "  $0 /path/to/DisciplineDungeonIOSCompanion.app"
  exit 1
fi

echo -e "${GREEN}Found app:${NC} $APP_PATH"
echo ""

# Locate extension
EXTENSION_PATH="$APP_PATH/PlugIns/ScreenTimeReportExtension.appex"
if [ ! -d "$EXTENSION_PATH" ]; then
  echo -e "${RED}ERROR: Extension not found at $EXTENSION_PATH${NC}"
  exit 1
fi

echo -e "${GREEN}Found extension:${NC} $EXTENSION_PATH"
echo ""

# Expected values
EXPECTED_APP_GROUP="group.com.disciplinedungeon.shared"
EXPECTED_FAMILY_CONTROLS="com.apple.developer.family-controls"

# Track overall status
ALL_PASS=true

echo "========================================="
echo "HOST APP ENTITLEMENTS"
echo "========================================="

# Extract host app entitlements
HOST_ENTITLEMENTS=$(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | plutil -convert json -o - -)

if [ -z "$HOST_ENTITLEMENTS" ]; then
  echo -e "${RED}✗ FAIL: Could not extract host app entitlements${NC}"
  ALL_PASS=false
else
  echo -e "${GREEN}✓ Entitlements extracted successfully${NC}"

  # Check for App Groups
  if echo "$HOST_ENTITLEMENTS" | grep -q "$EXPECTED_APP_GROUP"; then
    echo -e "${GREEN}✓ App Group present: $EXPECTED_APP_GROUP${NC}"
  else
    echo -e "${RED}✗ FAIL: App Group missing: $EXPECTED_APP_GROUP${NC}"
    ALL_PASS=false
  fi

  # Check for Family Controls
  if echo "$HOST_ENTITLEMENTS" | grep -q "$EXPECTED_FAMILY_CONTROLS"; then
    echo -e "${GREEN}✓ Family Controls capability present${NC}"
  else
    echo -e "${RED}✗ FAIL: Family Controls capability missing${NC}"
    ALL_PASS=false
  fi
fi

echo ""
echo "========================================="
echo "EXTENSION ENTITLEMENTS"
echo "========================================="

# Extract extension entitlements
EXT_ENTITLEMENTS=$(codesign -d --entitlements :- "$EXTENSION_PATH" 2>/dev/null | plutil -convert json -o - -)

if [ -z "$EXT_ENTITLEMENTS" ]; then
  echo -e "${RED}✗ FAIL: Could not extract extension entitlements${NC}"
  ALL_PASS=false
else
  echo -e "${GREEN}✓ Entitlements extracted successfully${NC}"

  # Check for App Groups
  if echo "$EXT_ENTITLEMENTS" | grep -q "$EXPECTED_APP_GROUP"; then
    echo -e "${GREEN}✓ App Group present: $EXPECTED_APP_GROUP${NC}"
  else
    echo -e "${RED}✗ FAIL: App Group missing: $EXPECTED_APP_GROUP${NC}"
    ALL_PASS=false
  fi

  # Check for Family Controls
  if echo "$EXT_ENTITLEMENTS" | grep -q "$EXPECTED_FAMILY_CONTROLS"; then
    echo -e "${GREEN}✓ Family Controls capability present${NC}"
  else
    echo -e "${RED}✗ FAIL: Family Controls capability missing${NC}"
    ALL_PASS=false
  fi
fi

echo ""
echo "========================================="
echo "FINAL RESULT"
echo "========================================="

if [ "$ALL_PASS" = true ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
  echo ""
  echo "Entitlements are correctly embedded. If you're still experiencing issues:"
  echo "1. Run the in-app Diagnostics → App Group Self-Test"
  echo "2. Check Console.app for extension logs (filter: subsystem:com.disciplinedungeon.ios-companion)"
  echo "3. Ensure the device is signed in with an Apple ID that has Screen Time enabled"
  exit 0
else
  echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
  echo ""
  echo "RECOMMENDED NEXT STEPS:"
  echo "1. Open the project in Xcode"
  echo "2. Check both targets (app + extension) have the App Group capability"
  echo "3. Verify the App Group exists in Apple Developer Portal"
  echo "4. Regenerate provisioning profiles if needed"
  echo "5. Clean build folder (Cmd+Shift+K) and rebuild"
  echo "6. Reinstall the app from Xcode to device"
  exit 1
fi
