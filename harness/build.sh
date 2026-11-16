#!/bin/bash
# Збирає тестовий стенд: застосунок + імітація react-native на DOM -> dist/app.js
export NODE_PATH=/opt/npm-tools/node_modules
cd /home/claude/harness
/opt/npm-tools/node_modules/.bin/esbuild entry.tsx --bundle --format=iife --platform=browser --target=chrome120 \
  --jsx=automatic --tsconfig-raw='{"compilerOptions":{"jsx":"react-jsx"}}' --outfile=dist/app.js \
  --define:process.env.NODE_ENV='"development"' --define:__DEV__=true \
  --alias:react-native=./shim/rn.tsx --alias:react-native-svg=./shim/svg.tsx \
  --alias:react-native-safe-area-context=./shim/misc.tsx --alias:expo-linear-gradient=./shim/misc.tsx \
  --alias:expo-font=./shim/misc.tsx --alias:expo-splash-screen=./shim/misc.tsx --alias:expo-status-bar=./shim/misc.tsx \
  --alias:expo-system-ui=./shim/misc.tsx --alias:expo-haptics=./shim/misc.tsx --alias:expo-constants=./shim/misc.tsx \
  --alias:expo-clipboard=./shim/misc.tsx --loader:.otf=empty --log-level=warning
cp /home/claude/harness/index.html /home/claude/harness/dist/index.html
