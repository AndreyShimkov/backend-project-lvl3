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

  test('hexlet io', async () => {
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
    testFolderPath = await fs.mkdtemp(path.join(tmpDirectory, 'test-'));

    nock(host)
      .get('/notfound')
      .reply(404);

    return pageloader('/notfound', testFolderPath).catch((e) => expect(e).toBe(404));
  });
});
