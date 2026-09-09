COMPOSE := docker compose -f docker-compose.dev.yml --env-file .env
API_SERVICE := rakkoons-api-dev
DB_SERVICE := rakkoons-database-dev

.PHONY: dev dev-down dev-logs dev-exec db-up db-down db-logs db-shell db-wait db-generate db-migrate db-deploy db-status db-studio db-reset verify

dev: db-generate
	@echo "Starting development stack"
	$(COMPOSE) up --build -d

dev-down:
	$(COMPOSE) down

dev-logs:
	$(COMPOSE) logs -f $(API_SERVICE)

dev-exec:
	$(COMPOSE) exec $(API_SERVICE) sh

db-up:
	@echo "Starting development database"
	$(COMPOSE) up -d $(DB_SERVICE)
	@$(MAKE) db-wait

db-down:
	$(COMPOSE) stop $(DB_SERVICE)

db-logs:
	$(COMPOSE) logs -f $(DB_SERVICE)

db-shell:
	$(COMPOSE) exec $(DB_SERVICE) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

db-wait:
	@echo "Waiting for the database to accept connections"
	@until docker exec $(DB_SERVICE) pg_isready -q; do sleep 1; done
	@echo "Database ready"

db-generate:
	pnpm run db:generate

db-migrate: db-up
	pnpm run db:migrate

db-deploy: db-up
	pnpm run db:deploy

db-status: db-up
	pnpm run db:status

db-studio: db-up
	pnpm run db:studio

db-reset: db-up
	pnpm prisma migrate reset --force

verify: db-generate
	pnpm run typecheck
	pnpm run lint
	pnpm run build
	pnpm run test
