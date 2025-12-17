# Discipline Dungeon iOS Companion (Screen Time uploader)

This folder contains the native iOS companion app + DeviceActivity report extension used to compute yesterday’s Screen Time minutes (for a chosen app/category selection) and upload them to the web backend.

Backend endpoints (implemented in this repo):
- `PATCH /api/verification/ios/connection`
- `POST /api/verification/ios/upload`

Open `ios-companion/DisciplineDungeonIOSCompanion.xcodeproj` in Xcode.

