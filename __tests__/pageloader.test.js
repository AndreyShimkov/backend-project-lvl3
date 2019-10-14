import '@babel/polyfill';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import pageloader from '../src';

const host = 'http://localhost';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

const tmpDirectory = os.tmpdir();
const pathToTest = '__tests__/__fixtures__/';

describe('page loader test', () => {
  let testFolderPath;

  beforeEach(async () => {
    testFolderPath = await fs.mkdtemp(path.join(tmpDirectory, 'test-'));
  });

  test('hexlet.io download page', async () => {
    const testPage = 'ru-hexlet-io-courses.html';
    const address = '/ru.hexlet.io/courses';
    const data = await fs.readFile(path.join(pathToTest, testPage), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, data);

    await pageloader(address, testFolderPath);

    const content = await fs.readFile(path.join(testFolderPath, testPage), 'utf-8');

    expect(content).toEqual(data);
  });

  test('page not found', async () => {
    const address = '/notfound';
    nock(host)
      .get(address)
      .reply(404);

    return pageloader(address, testFolderPath).catch((e) => expect(e).toBe(404));
  });

  test('w3.org', async () => {
    // https://www.w3.org
    const address = '/www.w3.org';
    const fileName = 'www-w3-org.html';
    const dataBefore = await fs.readFile(path.join(pathToTest, 'www-w3-org-before.html'), 'utf-8');
    const dataAfter = await fs.readFile(path.join(pathToTest, 'www-w3-org-after.html'), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, dataBefore);

    await pageloader(address, testFolderPath);

    const content = await fs.readFile(path.join(testFolderPath, fileName), 'utf-8');

    expect(content).toEqual(dataAfter);
  });
});
