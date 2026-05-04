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
