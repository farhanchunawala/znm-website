#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print header
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

# Function to print result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to run test with timing
run_test_phase() {
    local phase=$1
    local description=$2
    local test_file=$3
    
    print_header "Phase $phase: $description"
    
    echo "Running tests..."
    start_time=$(date +%s)
    
    npm test -- "$test_file" --verbose
    local result=$?
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    if [ $result -eq 0 ]; then
        print_result 0 "$description (${duration}s)"
    else
        print_result 1 "$description failed (${duration}s)"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}=== ZNM Website Test Suite ===${NC}\n"
    echo "Select test to run:"
    echo "1. Run ALL tests (recommended)"
    echo "2. Phase 1: Database & Models"
    echo "3. Phase 2: Authentication"
    echo "4. Phase 3.1: Products"
    echo "5. Phase 3.2: Inventory (CRITICAL)"
    echo "6. Phase 5: Orders (CRITICAL)"
    echo "7. Phase 6: Payments"
    echo "8. Phase 7: Order Items"
    echo "9. Run with coverage"
    echo "0. Exit"
    echo ""
}

# Script starts here
case "${1:-menu}" in
    all)
        print_header "Running ALL tests in strict order"
        
        run_test_phase "1" "Database & Models" "phase1-database.test.ts"
        run_test_phase "2.1" "User Authentication" "phase2-1-authentication.test.ts"
        run_test_phase "3.1" "Product Management" "phase3-1-products.test.ts"
        run_test_phase "3.2" "Inventory Management" "phase3-2-inventory.test.ts"
        run_test_phase "5" "Order Processing" "phase5-orders.test.ts"
        run_test_phase "6" "Payment Service" "paymentService.test.ts"
        run_test_phase "7" "Order Items" "orderItemService.test.ts"
        
        echo -e "\n${GREEN}════════════════════════════════════════${NC}"
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
        echo -e "${GREEN}════════════════════════════════════════${NC}\n"
        ;;
        
    1|phase1)
        run_test_phase "1" "Database & Models" "phase1-database.test.ts"
        ;;
        
    2|phase2)
        run_test_phase "2.1" "User Authentication" "phase2-1-authentication.test.ts"
        ;;
        
    3|phase3-1)
        run_test_phase "3.1" "Product Management" "phase3-1-products.test.ts"
        ;;
        
    4|phase3-2)
        run_test_phase "3.2" "Inventory Management (CRITICAL)" "phase3-2-inventory.test.ts"
        ;;
        
    5|phase5)
        run_test_phase "5" "Order Processing (CRITICAL)" "phase5-orders.test.ts"
        ;;
        
    6|phase6)
        run_test_phase "6" "Payment Service" "paymentService.test.ts"
        ;;
        
    7|phase7)
        run_test_phase "7" "Order Items" "orderItemService.test.ts"
        ;;
        
    coverage)
        print_header "Running tests with coverage"
        npm test -- --coverage
        ;;
        
    watch)
        print_header "Running tests in watch mode"
        npm test -- --watch
        ;;
        
    menu|"")
        show_menu
        read -p "Enter choice (0-9): " choice
        $0 $choice
        ;;
        
    *)
        echo "Invalid option. Usage:"
        echo "  $0 all          - Run all tests"
        echo "  $0 1            - Phase 1"
        echo "  $0 2            - Phase 2"
        echo "  $0 3            - Phase 3.1"
        echo "  $0 4            - Phase 3.2"
        echo "  $0 5            - Phase 5"
        echo "  $0 6            - Phase 6"
        echo "  $0 7            - Phase 7"
        echo "  $0 coverage     - With coverage report"
        echo "  $0 watch        - Watch mode"
        exit 1
        ;;
esac
