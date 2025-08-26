#!/bin/bash

# React Native Development Environment Setup Script
# This script helps set up the development environment for the DriverAppNew mobile app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}🚀 Mursal Driver App Development Setup${NC}"
    echo "========================================"
    echo ""
}

# Function to check requirements
check_requirements() {
    print_info "Checking development environment..."
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_status "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18 or later."
        echo "Download from: https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_status "npm installed: $NPM_VERSION"
    else
        print_error "npm not found. Please install npm."
        exit 1
    fi
    
    # Check Java for Android
    if command -v java >/dev/null 2>&1; then
        JAVA_VERSION=$(java -version 2>&1 | head -1)
        print_status "Java installed: $JAVA_VERSION"
    else
        print_warning "Java not found. Required for Android development."
        echo "Install Java 17: brew install openjdk@17"
    fi
    
    # Check Android environment
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME not set. Required for Android development."
        echo "Set up Android Studio and configure ANDROID_HOME environment variable."
    else
        print_status "ANDROID_HOME set: $ANDROID_HOME"
    fi
    
    # Check for iOS development (macOS only)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v xcodebuild >/dev/null 2>&1; then
            XCODE_VERSION=$(xcodebuild -version | head -1)
            print_status "Xcode installed: $XCODE_VERSION"
        else
            print_warning "Xcode not found. Required for iOS development."
            echo "Install from Mac App Store"
        fi
        
        if command -v pod >/dev/null 2>&1; then
            POD_VERSION=$(pod --version)
            print_status "CocoaPods installed: $POD_VERSION"
        else
            print_warning "CocoaPods not found. Required for iOS dependencies."
            echo "Install with: sudo gem install cocoapods"
        fi
    fi
}

# Function to install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm dependencies..."
        npm install
        print_status "npm dependencies installed"
    else
        print_status "npm dependencies already installed"
    fi
    
    # Install iOS dependencies if on macOS
    if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ] && command -v pod >/dev/null 2>&1; then
        print_info "Installing iOS dependencies..."
        cd ios
        pod install
        cd ..
        print_status "iOS dependencies installed"
    fi
}

# Function to setup environment configuration
setup_environment() {
    print_info "Setting up environment configuration..."
    
    # Check if environment setup script exists
    if [ -f "scripts/setup-env.js" ]; then
        print_info "Running environment setup..."
        npm run setup:env
        print_status "Environment configured"
    else
        print_warning "Environment setup script not found"
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    print_info "🎉 Setup complete! Next steps:"
    echo ""
    echo "📱 To run on Android:"
    echo "   1. Start an Android emulator or connect a device"
    echo "   2. Run: npm run android"
    echo ""
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🍎 To run on iOS:"
        echo "   1. Run: npm run ios"
        echo "   2. Or open ios/DriverAppNew.xcworkspace in Xcode"
        echo ""
    fi
    
    echo "🔧 Available commands:"
    echo "   npm start          - Start Metro bundler"
    echo "   npm run android    - Run on Android"
    echo "   npm run ios        - Run on iOS (macOS only)"
    echo "   npm run lint       - Run linter"
    echo "   npm run test       - Run tests"
    echo "   npm run clean      - Clean build artifacts"
    echo ""
    
    echo "🌐 Backend connection:"
    echo "   Make sure your backend is running on http://192.168.0.191:8000"
    echo "   Update environment config if using a different URL"
}

# Function to run development checks
run_checks() {
    print_info "Running development environment checks..."
    
    # Check if React Native CLI is available locally
    if [ -f "node_modules/.bin/react-native" ]; then
        print_status "React Native CLI available locally"
    else
        print_warning "React Native CLI not found locally"
    fi
    
    # Check package.json scripts
    if grep -q "\"android\"" package.json; then
        print_status "Android run script configured"
    fi
    
    if grep -q "\"ios\"" package.json; then
        print_status "iOS run script configured"
    fi
    
    # Check for required files
    required_files=("package.json" "index.js" "android/build.gradle" "babel.config.js")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_status "$file exists"
        else
            print_error "$file missing"
        fi
    done
}

# Main execution
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || ! grep -q "DriverAppNew" package.json; then
        print_error "This script must be run from the DriverAppNew directory"
        exit 1
    fi
    
    check_requirements
    echo ""
    
    install_dependencies
    echo ""
    
    setup_environment
    echo ""
    
    run_checks
    echo ""
    
    show_next_steps
}

# Handle command line arguments
case "$1" in
    "check")
        check_requirements
        ;;
    "install")
        install_dependencies
        ;;
    "setup")
        setup_environment
        ;;
    *)
        main
        ;;
esac