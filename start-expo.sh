#!/bin/bash
cd /home/user/woule-mobile
export EXPO_NO_DOTENV=1
export CI=1
npx expo start --tunnel --non-interactive 2>&1
