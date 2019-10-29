install:
	npm install
build:
	npx babel src --out-dir dist
start:
	npm run babel-node -- src/bin/pageloader.js
lint:
	npx eslint .
test:
	npm test
coverage:
	npx jest --coverage
publish:
	npm publish --dry-run