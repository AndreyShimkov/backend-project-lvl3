install:
	npm install
build:
	npx babel src --out-dir dist
start:
	npm run babel-node -- src/bin/pageloader.js
lint:
	npm run eslint ./
test:
	npm test
coverage:
	npx jest --coverage
publish:
	npm publish --dry-run