APP_NAME=exo

PYTHON=venv/bin/python3

load:
	$(PYTHON) -m app.main

run:
	npm run dev

fix:
	npm run format
	npm run fix

lint:
	npm run lint

deploy:
	ssh -t ajmoon "\
		if [[ ! -d '/opt/$(APP_NAME)' ]]; then \
			mkdir -p /opt/$(APP_NAME); \
			cd /opt/$(APP_NAME); \
			git clone https://github.com/alex-moon/$(APP_NAME) .; \
		fi; \
		cd /opt/$(APP_NAME); \
		git reset --hard origin/main; \
		git pull origin main; \
		docker compose build; \
		docker stack deploy -c docker-compose.yml $(APP_NAME); \
		docker run --rm -i \
			-v /var/run/docker.sock:/var/run/docker.sock \
			-u root ubirak/docker-php:latest \
			stack:converge $(APP_NAME); \
		docker system prune -f \
	"
