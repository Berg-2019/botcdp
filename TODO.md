# botcdp Completion TODO

## Plan Breakdown
Approved plan: Complete project setup and activate in Docker dev mode.

## Steps (in order):

- [ ] Step 1: Create missing directories (.docker/mysql, .docker/redis) for volume persistence.
- [ ] Step 2: Create botcdp/.env from .env.example with dev values populated.
- [ ] Step 3: Verify/create frontend/.docker/nginx configs (if missing).
- [ ] Step 4: docker compose up -d --build (build and start services).
- [ ] Step 5: docker compose exec backend npx sequelize db:migrate.
- [ ] Step 6: docker compose exec backend npx sequelize db:seed:all (creates 6 sectors/agents).
- [ ] Step 7: Test access: Frontend http://localhost:3000 (admin@botcdp.com / admin).
- [ ] Step 8: In panel, create WhatsApp connection (whaileys), scan QR, assign queues.
- [ ] Step 9: Test flow: Send WhatsApp msg -> menu -> queue assignment.
- [ ] Step 10: attempt_completion with results/demo command.

Current progress: Starting Step 1.
