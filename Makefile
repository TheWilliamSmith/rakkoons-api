dev:
	@echo "Starting development server"
	docker compose -f docker-compose.dev.yml --env-file .env up --build -d

dev-exec:
	docker compose -f docker-compose.dev.yml exec rakkoons-api-dev sh

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f rakkoons-api-dev -f

# Prisma — toujours via .env.migrate (localhost:5432 depuis le host)
db-migrate:
	dotenv -e .env.migrate -- pnpm prisma migrate dev

db-migrate-deploy:
	dotenv -e .env.migrate -- pnpm prisma migrate deploy

db-studio:
	dotenv -e .env.migrate -- pnpm prisma studio

db-generate:
	pnpm prisma generate