# botcdp Frontend Migration TODO (Sales Connect Hub)

## Plan Breakdown
Replace old React frontend with new sales-connect-hub dashboard. Backend compatible via /api endpoints.

## Steps:
- [ ] Step 1: Move frontend-new contents to frontend/, clean up.
- [ ] Step 2: Update frontend/src/services/api.ts baseURL to backend.
- [ ] Step 3: Create frontend/Dockerfile for docker-compose.
- [ ] Step 4: Add CORS backend/src/app.ts for new frontend port.
- [ ] Step 5: docker compose down && docker compose up -d --build
- [ ] Step 6: Test http://localhost:3001 login/contacts/chat.
- [ ] Step 7: Complete.

Current: Starting Step 1.

